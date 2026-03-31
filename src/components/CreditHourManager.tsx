import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { CreditCard, DollarSign, BookOpen, Calculator, Plus, X, Edit3, Save, Trash2, Eye, Settings } from 'lucide-react';

interface Course {
  id: number;
  code: string;
  name: string;
  title?: string;
  credits: number;
  program: string;
  price_per_credit: number;
}

interface CreditSettings {
  price_per_credit: number;
  min_credits: number;
  max_credits: number;
  late_fee: number;
}

export default function CreditHourManager() {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CreditSettings>({
    price_per_credit: 500,
    min_credits: 12,
    max_credits: 24,
    late_fee: 1000
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Map 'title' from API to 'name' for frontend consistency
      const mappedCourses = res.data.map((c: any) => ({
        ...c,
        name: c.title || c.name,
        program: c.program || '',
        price_per_credit: c.price_per_credit || settings.price_per_credit
      }));
      setCourses(mappedCourses);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to load courses.', 'error');
      setLoading(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    try {
      if (editingCourse.id === 0) {
        // Add new course
        await axios.post('/api/courses', {
          code: editingCourse.code,
          title: editingCourse.name,
          name: editingCourse.name,
          credits: editingCourse.credits,
          program: editingCourse.program,
          price_per_credit: editingCourse.price_per_credit
        }, { headers: { Authorization: `Bearer ${token}` } });
        showToast('Course added successfully!', 'success');
      } else {
        // Update existing course
        await axios.put(`/api/courses/${editingCourse.id}`, {
          code: editingCourse.code,
          title: editingCourse.name,
          name: editingCourse.name,
          credits: editingCourse.credits,
          program: editingCourse.program,
          price_per_credit: editingCourse.price_per_credit
        }, { 
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Course updated successfully!', 'success');
      }
      await fetchCourses();
      setShowEditModal(false);
      setEditingCourse(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to update course.', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await axios.post('/api/settings/credit-hours', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Settings saved successfully!', 'success');
      setShowSettingsModal(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings.', 'error');
    }
  };

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const totalRevenue = courses.reduce((sum, c) => sum + (c.credits * c.price_per_credit), 0);
  const avgPricePerCredit = totalRevenue / totalCredits;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">Credit Hour Management</h3>
            <p className="text-sm text-stone-500 mt-1">Set credit hours and prices per course</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700"
            >
              <Settings size={16} />
              Settings
            </button>
            <button 
              onClick={() => setEditingCourse({ id: 0, code: '', name: '', credits: 3, program: '', price_per_credit: settings.price_per_credit })}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add Course
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-emerald-50 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="text-emerald-600" size={20} />
              <span className="text-sm text-emerald-600 font-medium">Total Courses</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900">{courses.length}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="text-blue-600" size={20} />
              <span className="text-sm text-blue-600 font-medium">Price per Credit</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{settings.price_per_credit} ETB</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="text-purple-600" size={20} />
              <span className="text-sm text-purple-600 font-medium">Total Credits</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{totalCredits}</p>
          </div>
          <div className="bg-orange-50 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-orange-600" size={20} />
              <span className="text-sm text-orange-600 font-medium">Max Revenue</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">{totalRevenue.toLocaleString()} ETB</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-stone-500">
              <p>Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <p>No courses found. Click "Add Course" to create one.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Course Name</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-center">Credit Hours</th>
                  <th className="px-4 py-3 text-center">Price/Credit</th>
                  <th className="px-4 py-3 text-center">Total Price</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono font-bold text-stone-700">{course.code}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{course.name}</td>
                    <td className="px-4 py-3 text-stone-600">{course.program}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        {course.credits} CH
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{course.price_per_credit} ETB</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">
                      {(course.credits * course.price_per_credit).toLocaleString()} ETB
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setEditingCourse(course); setShowEditModal(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"
                      >
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Credit Hour Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-stone-400">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Base Price per Credit (ETB)</label>
                <input
                  type="number"
                  value={settings.price_per_credit}
                  onChange={(e) => setSettings({...settings, price_per_credit: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Min Credits/Semester</label>
                  <input
                    type="number"
                    value={settings.min_credits}
                    onChange={(e) => setSettings({...settings, min_credits: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Max Credits/Semester</label>
                  <input
                    type="number"
                    value={settings.max_credits}
                    onChange={(e) => setSettings({...settings, max_credits: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Late Registration Fee (ETB)</label>
                <input
                  type="number"
                  value={settings.late_fee}
                  onChange={(e) => setSettings({...settings, late_fee: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                />
              </div>
              <button 
                onClick={handleSaveSettings}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">
                {editingCourse.id === 0 ? 'Add New Course' : 'Edit Course'}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-stone-400">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Course Code</label>
                  <input
                    type="text"
                    value={editingCourse.code}
                    onChange={(e) => setEditingCourse({...editingCourse, code: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Credit Hours</label>
                  <input
                    type="number"
                    value={editingCourse.credits}
                    onChange={(e) => setEditingCourse({...editingCourse, credits: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Course Name</label>
                <input
                  type="text"
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse({...editingCourse, name: e.target.value})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Program</label>
                <select
                  value={editingCourse.program}
                  onChange={(e) => setEditingCourse({...editingCourse, program: e.target.value})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                >
                  <option value="">Select program...</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Business">Business</option>
                  <option value="General">General</option>
                  <option value="Medicine">Medicine</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Price per Credit (ETB)</label>
                <input
                  type="number"
                  value={editingCourse.price_per_credit}
                  onChange={(e) => setEditingCourse({...editingCourse, price_per_credit: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl"
                />
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <p className="text-sm text-emerald-600">Total Course Price</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {(editingCourse.credits * editingCourse.price_per_credit).toLocaleString()} ETB
                </p>
              </div>
              <button 
                onClick={handleUpdateCourse}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
              >
                {editingCourse.id === 0 ? 'Add Course' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}