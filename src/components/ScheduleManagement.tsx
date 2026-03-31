import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import {
  Calendar, Clock, BookOpen, Users, Building, Plus, Trash2,
  Edit3, Save, X, ChevronDown, Bell, Video, MapPin
} from 'lucide-react';

interface ScheduleProps {
  facultyCourses: any[];
  schedule: any[];
  branches: any[];
}

interface ScheduleEntry {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  course_name: string;
  program_name: string;
  faculty_name: string;
  room_name: string;
  branch_name: string;
  semester: string;
  course_id?: number;
  faculty_id?: number;
  room_id?: number;
}

interface Room {
  id: number;
  name: string;
  capacity: number;
  building: string;
}

interface Faculty {
  id: number;
  name: string;
  department: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
  program: string;
  year: number;
  credits: number;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlots = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

export default function ScheduleManagement({ facultyCourses, schedule, branches }: ScheduleProps) {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [isLoading, setIsLoading] = useState(true);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '10:00',
    course_id: '',
    faculty_id: '',
    room_id: '',
    semester: 'Year 1, Sem 1'
  });

  const isAdmin = user?.role === 'superadmin' || user?.role === 'branch_admin';
  const isFaculty = user?.role === 'faculty';

  // Fetch schedule data from API
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (!token) return;
      
      setIsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch schedule based on role
        if (isAdmin) {
          const [scheduleRes, roomsRes, facultiesRes, coursesRes] = await Promise.all([
            axios.get('/api/schedule', { headers }).catch(() => ({ data: [] })),
            axios.get('/api/rooms', { headers }).catch(() => ({ data: [] })),
            axios.get('/api/users/faculty', { headers }).catch(() => ({ data: [] })),
            axios.get('/api/courses', { headers }).catch(() => ({ data: [] }))
          ]);
          
          setSchedules(scheduleRes.data || []);
          setRooms(roomsRes.data || []);
          setFaculties(facultiesRes.data.map((u: any) => ({ id: u.id, name: u.full_name, department: u.role })));
          setCourses(coursesRes.data || []);
        } else if (isFaculty) {
          const scheduleRes = await axios.get('/api/faculty/schedule', { headers }).catch(() => ({ data: [] }));
          setSchedules(scheduleRes.data || []);
        } else {
          // Student - use schedule from props
          setSchedules(schedule || []);
        }
      } catch (err) {
        console.error('Failed to fetch schedule data', err);
        showToast('Failed to load schedule', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduleData();
  }, [token, isAdmin, isFaculty, schedule, showToast]);

  const handleAddSchedule = async () => {
    if (!newSchedule.course_id || !newSchedule.faculty_id || !newSchedule.room_id) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Create schedule on server
      const response = await axios.post('/api/schedule', {
        day_of_week: newSchedule.day_of_week,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        course_id: parseInt(newSchedule.course_id),
        faculty_id: parseInt(newSchedule.faculty_id),
        room_id: parseInt(newSchedule.room_id),
        semester: newSchedule.semester
      }, { headers });

      const addedSchedule = response.data;
      
      // Find related data for display
      const course = courses.find(c => c.id === parseInt(newSchedule.course_id));
      const faculty = faculties.find(f => f.id === parseInt(newSchedule.faculty_id));
      const room = rooms.find(r => r.id === parseInt(newSchedule.room_id));
      const branch = branches[0];

      const newEntry: ScheduleEntry = {
        id: addedSchedule.id,
        day_of_week: newSchedule.day_of_week,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        course_name: course?.name || 'Unknown',
        program_name: course?.program || 'Unknown',
        faculty_name: faculty?.name || 'Unknown',
        room_name: room?.name || 'Unknown',
        branch_name: branch?.name || 'Main Campus',
        semester: newSchedule.semester
      };

      setSchedules([...schedules, newEntry]);
      setShowAddModal(false);
      setNewSchedule({
        day_of_week: 'Monday',
        start_time: '08:00',
        end_time: '10:00',
        course_id: '',
        faculty_id: '',
        room_id: '',
        semester: 'Year 1, Sem 1'
      });
      showToast('Schedule added successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to add schedule', err);
      showToast('Failed to add schedule: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this schedule entry?')) return;
    
    try {
      await axios.delete(`/api/schedule/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(schedules.filter(s => s.id !== id));
      showToast('Schedule entry deleted', 'success');
    } catch (err: any) {
      console.error('Delete failed', err);
      showToast('Failed to delete schedule: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    }
  };

  const filteredSchedules = isFaculty
    ? schedules.filter(s => s.faculty_name?.includes(user?.full_name || ''))
    : schedules;

  const groupedByDay = daysOfWeek.reduce((acc, day) => {
    acc[day] = filteredSchedules.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {} as { [key: string]: ScheduleEntry[] });

  const facultySchedules = isFaculty
    ? schedules.filter(s => s.faculty_name === user?.full_name)
    : [];

  const studentSchedule = schedule.length > 0 ? schedule : [];

  const studentGroupedByDay = daysOfWeek.reduce((acc, day) => {
    acc[day] = studentSchedule.filter((s: any) => s.day_of_week === day).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {} as { [key: string]: any[] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">
              {isAdmin ? 'Schedule Management' : isFaculty ? 'My Teaching Schedule' : 'My Class Schedule'}
            </h3>
            <p className="text-sm text-stone-500 mt-1">
              {isAdmin ? 'Create and manage class schedules for all courses' : isFaculty ? 'View your assigned classes' : 'View your weekly class schedule'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add Schedule
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="border-b pb-4">
                <h4 className="font-semibold text-stone-700 mb-3">Quick Filters</h4>
                <div className="space-y-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`w-full p-2 text-left text-sm rounded-lg transition-all ${
                        selectedDay === day
                          ? 'bg-emerald-100 text-emerald-700 font-semibold'
                          : 'hover:bg-stone-100 text-stone-600'
                      }`}
                    >
                      {day}
                      <span className="float-right text-xs text-stone-400">
                        {schedules.filter(s => s.day_of_week === day).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-stone-700 mb-3">Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total Sessions</span>
                    <span className="font-bold text-stone-700">{schedules.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Faculty</span>
                    <span className="font-bold text-stone-700">{faculties.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Rooms Used</span>
                    <span className="font-bold text-stone-700">{new Set(schedules.map(s => s.room_name)).size}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="space-y-4">
                {daysOfWeek.map(day => {
                  const daySchedules = groupedByDay[day];
                  if (daySchedules.length === 0 && selectedDay !== 'Monday') return null;

                  return (
                    <div key={day} className={`border border-stone-200 rounded-2xl overflow-hidden ${selectedDay !== 'Monday' && day !== selectedDay ? 'hidden' : ''}`}>
                      <div className={`p-4 ${day === 'Monday' ? 'bg-emerald-600' : day === 'Tuesday' ? 'bg-blue-600' : day === 'Wednesday' ? 'bg-purple-600' : day === 'Thursday' ? 'bg-orange-600' : 'bg-stone-600'} text-white`}>
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold">{day}</h4>
                          <span className="text-sm opacity-80">{daySchedules.length} sessions</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
                            <tr>
                              <th className="px-4 py-3 text-left">Time</th>
                              <th className="px-4 py-3 text-left">Course</th>
                              <th className="px-4 py-3 text-left">Program</th>
                              <th className="px-4 py-3 text-left">Faculty</th>
                              <th className="px-4 py-3 text-left">Room</th>
                              <th className="px-4 py-3 text-left">Semester</th>
                              <th className="px-4 py-3 text-center w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {daySchedules.map((s) => (
                              <tr key={s.id} className="hover:bg-stone-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-stone-400" />
                                    <span className="font-semibold">{s.start_time} - {s.end_time}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-stone-900">{s.course_name}</td>
                                <td className="px-4 py-3 text-stone-600">{s.program_name}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                                    {s.faculty_name}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1 text-stone-600">
                                    <MapPin size={14} />
                                    {s.room_name}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-stone-500 text-xs">{s.semester}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleDelete(s.id)}
                                    className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {daySchedules.length === 0 && (
                              <tr>
                                <td colSpan={7} className="px-4 py-6 text-center text-stone-400">
                                  No classes scheduled
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isFaculty && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {daysOfWeek.map(day => {
              const daySchedules = facultySchedules.filter(s => s.day_of_week === day);
              return (
                <div key={day} className="border border-stone-200 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-emerald-50 border-b border-emerald-100">
                    <h4 className="font-bold text-emerald-800">{day}</h4>
                    <p className="text-xs text-emerald-600">{daySchedules.length} classes</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {daySchedules.length > 0 ? (
                      daySchedules.map((s, i) => (
                        <div key={i} className="p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-emerald-600" />
                            <span className="text-sm font-bold text-stone-700">{s.start_time} - {s.end_time}</span>
                          </div>
                          <p className="font-semibold text-stone-900">{s.course_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                            <MapPin size={12} /> {s.room_name}
                            <span className="mx-1">•</span>
                            {s.program_name}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-stone-400 text-sm text-center py-4">No classes</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {user?.role === 'student' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {daysOfWeek.map(day => {
              const daySchedules = studentGroupedByDay[day];
              return (
                <div key={day} className="border border-stone-200 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-blue-50 border-b border-blue-100">
                    <h4 className="font-bold text-blue-800">{day}</h4>
                    <p className="text-xs text-blue-600">{daySchedules.length} classes</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {daySchedules.length > 0 ? (
                      daySchedules.map((s: any, i: number) => (
                        <div key={i} className="p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-blue-600" />
                            <span className="text-sm font-bold text-stone-700">{s.start_time} - {s.end_time}</span>
                          </div>
                          <p className="font-semibold text-stone-900">{s.course_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                            <MapPin size={12} /> {s.room_name}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-stone-400 text-sm text-center py-4">No classes</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-900">Add Schedule Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Day of Week</label>
                <select
                  value={newSchedule.day_of_week}
                  onChange={(e) => setNewSchedule({...newSchedule, day_of_week: e.target.value})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  {daysOfWeek.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Start Time</label>
                  <select
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule({...newSchedule, start_time: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">End Time</label>
                  <select
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule({...newSchedule, end_time: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Course</label>
                <select
                  value={newSchedule.course_id}
                  onChange={(e) => setNewSchedule({...newSchedule, course_id: e.target.value})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name} ({course.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Faculty</label>
                <select
                  value={newSchedule.faculty_id}
                  onChange={(e) => setNewSchedule({...newSchedule, faculty_id: e.target.value})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select faculty...</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Room</label>
                <select
                  value={newSchedule.room_id}
                  onChange={(e) => setNewSchedule({...newSchedule, room_id: e.target.value})}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select room...</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name} ({room.building})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSchedule}
                  disabled={!newSchedule.course_id || !newSchedule.faculty_id || !newSchedule.room_id || isLoading}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={16} />
                      Add Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
