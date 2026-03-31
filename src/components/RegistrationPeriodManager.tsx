import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { notificationService } from '../services/apiServices';
import { Calendar, Clock, Plus, X, Check, AlertCircle, ToggleLeft, ToggleRight, BookOpen, Search } from 'lucide-react';

interface RegistrationPeriod {
  id: number;
  semester_id: number;
  semester_name: string;
  start_date: string;
  end_date: string;
  is_open: number;
  description: string;
  branch_name: string;
  course_ids?: string;
}

interface Semester {
  id: number;
  semester_name: string;
  academic_year: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
}

export default function RegistrationPeriodManager() {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [searchCourse, setSearchCourse] = useState('');
  
  const [newPeriod, setNewPeriod] = useState({
    semester_id: '',
    branch_id: '',
    start_date: '',
    end_date: '',
    description: '',
    course_ids: [] as number[]
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [periodsRes, semestersRes, branchesRes, coursesRes] = await Promise.all([
        axios.get('/api/registration-periods', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/semesters', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/branches', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/courses', { headers }).catch(() => ({ data: [] }))
      ]);
      
      setPeriods(periodsRes.data);
      setSemesters(semestersRes.data);
      setBranches(branchesRes.data);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPeriod.semester_id || !newPeriod.start_date || !newPeriod.end_date) return;
    
    try {
      await axios.post('/api/registration-periods', {
        semester_id: parseInt(newPeriod.semester_id),
        branch_id: newPeriod.branch_id ? parseInt(newPeriod.branch_id) : null,
        start_date: newPeriod.start_date,
        end_date: newPeriod.end_date,
        description: newPeriod.description,
        course_ids: newPeriod.course_ids
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast('Registration period created successfully!', 'success');
      setShowModal(false);
      setNewPeriod({
        semester_id: '',
        branch_id: '',
        start_date: '',
        end_date: '',
        description: '',
        course_ids: []
      });
      fetchData();
      
      // Notify Students
      try {
        await notificationService.sendNotification({
          role: 'student',
          title: 'New Registration Period',
          message: `A new registration period has been scheduled starting from ${newPeriod.start_date}.`
        });
      } catch (notifyErr) {
        console.error('Failed to send notifications', notifyErr);
      }
    } catch (err) {
      console.error('Failed to create period:', err);
      showToast('Failed to create registration period', 'error');
    }
  };

  const toggleRegistration = async (id: number) => {
    try {
      await axios.put(`/api/registration-periods/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Registration status updated!', 'success');
      fetchData();
      
      const toggledPeriod = periods.find(p => p.id === id);
      if (toggledPeriod && toggledPeriod.is_open === 0) { // If it was closed and now it will be open (after fetch it might be different, let's just check the intent)
        // Send notification to everyone
        try {
          await notificationService.sendNotification({
            role: 'all',
            title: 'Registration OPEN',
            message: `Registration for ${toggledPeriod.semester_name} is now open! Apply before ${toggledPeriod.end_date}.`
          });
        } catch (notifyErr) {
          console.error('Failed to send notifications', notifyErr);
        }
      }
    } catch (err) {
      console.error('Failed to toggle period:', err);
      showToast('Failed to update registration status', 'error');
    }
  };

  const toggleCourseSelection = (courseId: number) => {
    setNewPeriod(prev => ({
      ...prev,
      course_ids: prev.course_ids.includes(courseId)
        ? prev.course_ids.filter(id => id !== courseId)
        : [...prev.course_ids, courseId]
    }));
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchCourse.toLowerCase()) ||
    c.code.toLowerCase().includes(searchCourse.toLowerCase())
  );

  const selectedCoursesList = courses.filter(c => newPeriod.course_ids.includes(c.id));

  const isOpen = periods.some(p => p.is_open === 1);
  const currentOpen = periods.find(p => p.is_open === 1);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">Registration Periods</h3>
            <p className="text-sm text-stone-500 mt-1">Manage course registration open/close dates and available courses</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
          >
            <Plus size={16} />
            New Period
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-2xl border-2 ${isOpen ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              {isOpen ? (
                <ToggleRight className="text-emerald-600" size={24} />
              ) : (
                <ToggleLeft className="text-red-600" size={24} />
              )}
              <span className={`font-bold ${isOpen ? 'text-emerald-700' : 'text-red-700'}`}>
                {isOpen ? 'Registration Open' : 'Registration Closed'}
              </span>
            </div>
            <p className="text-sm text-stone-600">
              {isOpen 
                ? `Currently: ${currentOpen?.semester_name}` 
                : 'No active registration period'}
            </p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100">
            <p className="text-sm text-blue-600 font-medium">Active Periods</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{periods.filter(p => p.is_open).length}</p>
          </div>
          
          <div className="bg-stone-50 p-6 rounded-2xl border-2 border-stone-100">
            <p className="text-sm text-stone-500 font-medium">Total Periods</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{periods.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-stone-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Semester</th>
                  <th className="px-4 py-3 text-left">Branch</th>
                  <th className="px-4 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-left">End Date</th>
                  <th className="px-4 py-3 text-center">Courses</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {periods.map((period) => {
                  const courseIds = period.course_ids ? JSON.parse(period.course_ids) : [];
                  return (
                    <tr key={period.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-semibold text-stone-900">{period.semester_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-stone-600">{period.branch_name || 'All Branches'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-stone-400" />
                          {period.start_date}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-stone-400" />
                          {period.end_date}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          courseIds.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {courseIds.length > 0 ? `${courseIds.length} courses` : 'All courses'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleRegistration(period.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            period.is_open 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {period.is_open ? 'OPEN' : 'CLOSED'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => toggleRegistration(period.id)}
                          className={`p-2 rounded-xl ${
                            period.is_open 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={period.is_open ? 'Close Registration' : 'Open Registration'}
                        >
                          {period.is_open ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {periods.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                      No registration periods defined
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <AlertCircle size={24} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900">Important Notes</h4>
            <ul className="text-sm text-amber-800 mt-2 space-y-1 opacity-80">
              <li>• Only ONE registration period can be open at a time</li>
              <li>• Opening a new period will automatically close any currently open period</li>
              <li>• Students can only register during open periods</li>
              <li>• You can specify which courses are available for this registration period</li>
            </ul>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Create Registration Period</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Semester</label>
                <select
                  value={newPeriod.semester_id}
                  onChange={(e) => setNewPeriod({...newPeriod, semester_id: e.target.value})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select semester...</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>{s.semester_name} - {s.academic_year}</option>
                  ))}
                </select>
              </div>
              
              {(user?.role === 'superadmin' || user?.role === 'registrar') && (
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Branch (Optional)</label>
                  <select
                    value={newPeriod.branch_id}
                    onChange={(e) => setNewPeriod({...newPeriod, branch_id: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({...newPeriod, start_date: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({...newPeriod, end_date: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={newPeriod.description}
                  onChange={(e) => setNewPeriod({...newPeriod, description: e.target.value})}
                  placeholder="e.g., Spring Semester Registration"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Available Courses (Optional)
                </label>
                <p className="text-xs text-stone-500 mb-2">
                  Leave empty to allow all courses, or select specific courses for this period
                </p>
                <button
                  type="button"
                  onClick={() => setShowCourseSelector(true)}
                  className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-600 hover:border-emerald-500 hover:text-emerald-600 flex items-center justify-center gap-2"
                >
                  <BookOpen size={18} />
                  {newPeriod.course_ids.length > 0 
                    ? `${newPeriod.course_ids.length} courses selected` 
                    : 'Select courses (optional)'}
                </button>
                
                {newPeriod.course_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCoursesList.map(c => (
                      <span key={c.id} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1">
                        {c.code}
                        <button 
                          onClick={() => toggleCourseSelection(c.id)}
                          className="hover:text-blue-900"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={!newPeriod.semester_id || !newPeriod.start_date || !newPeriod.end_date}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  Create Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCourseSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Select Courses</h3>
              <button onClick={() => setShowCourseSelector(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchCourse}
                onChange={(e) => setSearchCourse(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {filteredCourses.map(course => (
                <div 
                  key={course.id}
                  onClick={() => toggleCourseSelection(course.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    newPeriod.course_ids.includes(course.id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        newPeriod.course_ids.includes(course.id)
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-stone-300'
                      }`}>
                        {newPeriod.course_ids.includes(course.id) && <Check size={14} className="text-white" />}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{course.title}</p>
                        <p className="text-sm text-stone-500">{course.code} • {course.credits} credits</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCourses.length === 0 && (
                <p className="text-center py-8 text-stone-400">No courses found</p>
              )}
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-stone-100">
              <button 
                onClick={() => setNewPeriod(prev => ({ ...prev, course_ids: [] }))}
                className="py-2 px-4 border border-stone-200 text-stone-600 rounded-xl font-medium hover:bg-stone-50"
              >
                Clear All
              </button>
              <div className="flex-1"></div>
              <button 
                onClick={() => setShowCourseSelector(false)}
                className="py-2 px-6 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
              >
                Done ({newPeriod.course_ids.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}