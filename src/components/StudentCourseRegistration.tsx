import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { CreditCard, DollarSign, BookOpen, Calculator, Check, X, Upload, AlertCircle, FileText, Key, Loader2, RefreshCw } from 'lucide-react';

interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
  program?: string;
  price_per_credit?: number;
  prerequisites?: string;
  is_auditable?: number;
  degree_level?: string;
}

interface RegisteredCourse extends Course {
  selected: boolean;
  price_per_credit?: number;
}

interface CreditSettings {
  price_per_credit: number;
  min_credits: number;
  max_credits: number;
  late_fee: number;
}

const defaultSettings: CreditSettings = {
  price_per_credit: 500,
  min_credits: 12,
  max_credits: 24,
  late_fee: 1000
};

export default function StudentCourseRegistration() {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<RegisteredCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings] = useState<CreditSettings>(defaultSettings);
  const [processing, setProcessing] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [allowedCourseIds, setAllowedCourseIds] = useState<number[] | null>(null);

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const fetchCourses = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [coursesRes, periodRes] = await Promise.all([
        axios.get('/api/courses/available', { headers }),
        axios.get('/api/registration-periods/current', { headers }).catch(() => ({ data: { period: null } }))
      ]);
      
      let fetchedCourses = coursesRes.data.map((c: any) => ({
        ...c,
        selected: false,
        price_per_credit: c.price_per_credit || 500,
        title: c.title || c.name,
      }));
      
      if (periodRes.data.period?.course_ids) {
        const ids = JSON.parse(periodRes.data.period.course_ids);
        setAllowedCourseIds(ids);
        fetchedCourses = fetchedCourses.filter((c: any) => ids.includes(c.course_id));
      } else {
        setAllowedCourseIds(null);
      }
      
      setCourses(fetchedCourses);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCourse = (id: number) => {
    setCourses(courses.map(c => {
      if (c.id === id) {
        const newSelected = !c.selected;
        if (newSelected) {
          setSelectedCourses([...selectedCourses, c]);
        } else {
          setSelectedCourses(selectedCourses.filter(sc => sc.id !== id));
        }
        return { ...c, selected: newSelected };
      }
      return c;
    }));
  };

  const totalCredits = selectedCourses.reduce((sum, c) => sum + (c as any).credits, 0);
  const canRegister = totalCredits >= settings.min_credits && totalCredits <= settings.max_credits;

  const handleCompleteRegistration = async () => {
    if (!canRegister) return;
    setProcessing(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      for (const course of selectedCourses) {
        await axios.post('/api/enrollments', { 
          course_offering_id: course.id,
          is_audit: false 
        }, { headers });
      }

      showToast('Registration complete! You are now enrolled in ' + selectedCourses.length + ' courses.', 'success');
      setSelectedCourses([]);
      setCourses(courses.map(c => ({ ...c, selected: false })));
      fetchCourses();
    } catch (err: any) {
      console.error('Enrollment failed:', err);
      showToast('Enrollment failed: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">Course Registration</h3>
            <p className="text-sm text-stone-500 mt-1">Select your courses for the current semester</p>
          </div>
          <div className="flex items-center gap-4">
            {courses.length > 0 && courses[0].degree_level && (
              <div className="text-right">
                <p className="text-xs text-stone-500">Showing</p>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                  {courses[0].degree_level} Courses Only
                </span>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-stone-500">Credit Range</p>
              <p className="text-sm font-bold text-stone-700">{settings.min_credits} - {settings.max_credits} credits</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Selected Courses</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{selectedCourses.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Calculator size={16} className="text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">Total Credits</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{totalCredits}</p>
          </div>
        </div>

        {!canRegister && totalCredits > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              <span className="text-red-700 font-medium">
                {totalCredits < settings.min_credits 
                  ? `You need at least ${settings.min_credits} credits. Current: ${totalCredits} credits.`
                  : `Maximum credits exceeded. Current: ${totalCredits}, Max: ${settings.max_credits} credits.`}
              </span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase">
                <th className="px-4 py-3 text-center w-12">Select</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Course Name</th>
                <th className="px-4 py-3 text-center">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {courses.map((course) => (
                <tr key={course.id} className={`hover:bg-stone-50 ${course.selected ? 'bg-emerald-50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleCourse(course.id)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        course.selected 
                          ? 'bg-emerald-600 border-emerald-600' 
                          : 'border-stone-300 hover:border-emerald-500'
                      }`}
                    >
                      {course.selected && <Check size={14} className="text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-stone-700">{course.code}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{course.title || 'N/A'}</td>
                  <td className="px-4 py-3 text-center">
                    {course.degree_level && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium mr-2">
                        {course.degree_level}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                      {course.credits} CH
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleCompleteRegistration}
            disabled={!canRegister || selectedCourses.length === 0 || processing}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-100"
          >
            {processing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Check size={18} />
                Complete Registration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}