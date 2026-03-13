import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Building2, 
  BookOpen, 
  CreditCard, 
  Bell, 
  LogOut, 
  LayoutDashboard,
  User,
  Search,
  Plus,
  Filter,
  MoreVertical,
  ChevronRight,
  Phone,
  MapPin,
  Settings,
  ShieldCheck,
  Check,
  FileText,
  Download
} from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EditStudentModal from '../components/EditStudentModal';

export default function Dashboard() {
  const { user, logout, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [facultyCourses, setFacultyCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any>(null);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const requests = [];

      // Only fetch students if authorized
      if (['superadmin', 'branch_admin', 'faculty', 'accountant', 'registrar'].includes(user?.role || '')) {
        requests.push(axios.get('/api/students', { headers }));
      } else {
        requests.push(Promise.resolve({ data: [] }));
      }

      // Only fetch branches if authorized
      if (['superadmin', 'branch_admin'].includes(user?.role || '')) {
        requests.push(axios.get('/api/branches', { headers }));
      } else {
        requests.push(Promise.resolve({ data: [] }));
      }

      // Fetch calendars
      requests.push(axios.get('/api/academic-calendars', { headers }));

      if (user?.role === 'superadmin') {
        requests.push(axios.get('/api/settings/integrations', { headers }));
      } else {
        requests.push(Promise.resolve({ data: null }));
      }

      if (user?.role === 'student') {
        requests.push(axios.get('/api/enrollments', { headers }));
        requests.push(axios.get('/api/courses/available', { headers }));
        requests.push(axios.get('/api/registration-periods/current', { headers }));
        requests.push(axios.get('/api/my-schedule', { headers }));
        requests.push(axios.get('/api/my-attendance', { headers }));
        requests.push(axios.get('/api/my-invoices', { headers }));
      } else {
        requests.push(Promise.resolve({ data: [] }));
        requests.push(Promise.resolve({ data: [] }));
        requests.push(Promise.resolve({ data: null }));
        requests.push(Promise.resolve({ data: [] }));
        requests.push(Promise.resolve({ data: [] }));
        requests.push(Promise.resolve({ data: [] }));
      }

      if (user?.role === 'faculty') {
        requests.push(axios.get('/api/faculty/my-courses', { headers }));
      } else {
        requests.push(Promise.resolve({ data: [] }));
      }

      const responses = await Promise.all(requests);
      setStudents(responses[0].data);
      setBranches(responses[1].data);
      setCalendars(responses[2].data);
      if (responses[3]) setIntegrations(responses[3].data);
      if (user?.role === 'student') {
        setEnrollments(responses[4].data);
        setAvailableCourses(responses[5].data);
        setRegStatus(responses[6].data);
        setSchedule(responses[7].data);
        setAttendance(responses[8].data);
        setInvoices(responses[9].data);
      }
      if (user?.role === 'faculty') {
        setFacultyCourses(responses[10].data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, user?.role]);

  const navigation = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview', roles: ['superadmin', 'branch_admin', 'faculty', 'accountant', 'student'] },
    { id: 'students', icon: Users, label: t('students'), roles: ['superadmin', 'branch_admin', 'faculty', 'accountant', 'registrar'] },
    { id: 'branches', icon: Building2, label: t('branches'), roles: ['superadmin', 'branch_admin'] },
    { id: 'academics', icon: BookOpen, label: t('academics'), roles: ['superadmin', 'branch_admin', 'faculty', 'student', 'registrar'] },
    { id: 'registration', icon: Plus, label: 'Course Registration', roles: ['student'] },
    { id: 'my-classes', icon: Users, label: 'My Classes', roles: ['faculty'] },
    { id: 'resources', icon: BookOpen, label: 'Resources', roles: ['student', 'faculty'] },
    { id: 'schedule', icon: Bell, label: 'My Schedule', roles: ['student', 'faculty'] },
    { id: 'attendance', icon: ShieldCheck, label: 'Attendance', roles: ['student', 'faculty'] },
    { id: 'finance', icon: CreditCard, label: t('finance'), roles: ['superadmin', 'branch_admin', 'accountant', 'student', 'registrar'] },
    { id: 'registrar', icon: User, label: 'Registrar', roles: ['superadmin', 'registrar'] },
    { id: 'integrations', icon: Settings, label: 'Integrations', roles: ['superadmin'] },
  ].filter(item => item.roles.includes(user?.role || ''));

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedOffering, setSelectedOffering] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [regStatus, setRegStatus] = useState<{ isOpen: boolean, period: any } | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<any[]>([]);
  const [facultyStudents, setFacultyStudents] = useState<any[]>([]);

  const fetchOfferingData = async (offeringId: number) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [mRes, aRes] = await Promise.all([
        axios.get(`/api/courses/${offeringId}/materials`, { headers }),
        axios.get(`/api/courses/${offeringId}/assignments`, { headers })
      ]);
      setMaterials(mRes.data);
      setStudentAssignments(aRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFacultyStudents = async (offeringId: number) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`/api/faculty/course/${offeringId}/students`, { headers });
      setFacultyStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const SidebarItem = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
        activeTab === id 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
          : 'text-stone-500 hover:bg-stone-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
            <GraduationCap size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-stone-900 leading-none">DREAMLAND</span>
            <span className="text-[8px] font-black tracking-[0.2em] text-emerald-600 uppercase mt-0.5">College</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navigation.map(item => (
            <SidebarItem key={item.id} id={item.id} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-stone-100">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 font-bold">
              {user?.full_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-stone-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-stone-500 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-semibold text-sm"
          >
            <LogOut size={20} />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">
              {activeTab === 'overview' ? 'Welcome back, ' + user?.full_name : t(activeTab)}
            </h1>
            <p className="text-stone-500 mt-1">Here's what's happening at Dreamland College today.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-12 pr-4 py-2.5 bg-white border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-64 transition-all"
              />
            </div>
            <button className="p-2.5 bg-white border border-stone-200 rounded-2xl text-stone-600 hover:bg-stone-50 transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Students', value: students.length, icon: Users, color: 'bg-blue-500' },
                { label: 'Active Branches', value: branches.length, icon: Building2, color: 'bg-emerald-500' },
                { label: 'Programs', value: '12', icon: BookOpen, color: 'bg-purple-500' },
                { label: 'Revenue (ETB)', value: '1.2M', icon: CreditCard, color: 'bg-orange-500' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm"
                >
                  <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-stone-100`}>
                    <stat.icon size={24} />
                  </div>
                  <p className="text-sm font-medium text-stone-500">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-stone-900 mt-1">{stat.value}</h3>
                </motion.div>
              ))}
            </div>

            {/* Recent Students Table */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h3 className="font-bold text-stone-900">Recent Students</h3>
                <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50/50 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Student Name</th>
                      <th className="px-6 py-4 font-semibold">ID Code</th>
                      <th className="px-6 py-4 font-semibold">Branch</th>
                      <th className="px-6 py-4 font-semibold">Program</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {students.slice(0, 5).map((student, i) => (
                      <tr key={i} className="hover:bg-stone-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 text-xs font-bold">
                              {student.full_name?.[0]}
                            </div>
                            <span className="text-sm font-semibold text-stone-900">{student.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600 font-mono">{student.student_id_code || 'PENDING'}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{student.branch_name}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {student.program_name} 
                          {student.program_degree && <span className="text-[10px] ml-1 px-1.5 py-0.5 bg-stone-100 rounded text-stone-500 font-bold uppercase">{student.program_degree}</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            student.academic_status === 'good_standing' 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : 'bg-red-50 text-red-600'
                          }`}>
                            {student.academic_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors">
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-stone-500 text-sm">
                          No students found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registration' && (
          <div className="space-y-8">
            {/* Registration Status Banner */}
            <div className={`p-6 rounded-3xl border ${regStatus?.isOpen ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} flex items-center justify-between`}>
              <div>
                <h3 className={`font-bold ${regStatus?.isOpen ? 'text-emerald-900' : 'text-red-900'}`}>
                  {regStatus?.isOpen ? 'Registration is Open' : 'Registration is Currently Closed'}
                </h3>
                {regStatus?.period && (
                  <p className={`text-sm ${regStatus?.isOpen ? 'text-emerald-700' : 'text-red-700'}`}>
                    Period: {regStatus.period.start_date} to {regStatus.period.end_date}
                  </p>
                )}
              </div>
              <div className={`px-4 py-2 rounded-2xl font-bold text-sm ${regStatus?.isOpen ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {regStatus?.isOpen ? 'Active' : 'Closed'}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
              <h2 className="font-bold text-stone-900 mb-6">My Current Enrollments</h2>
              <div className="divide-y divide-stone-100">
                {enrollments.length > 0 ? enrollments.map((e: any) => (
                  <div key={e.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-stone-900">{e.course_name}</p>
                      <p className="text-xs text-stone-500">{e.course_code}</p>
                    </div>
                    {regStatus?.isOpen && (
                      <button 
                        onClick={async () => {
                          if (confirm('Are you sure you want to withdraw from this course?')) {
                            await axios.post('/api/enrollments/withdraw', { enrollment_id: e.id }, { headers: { Authorization: `Bearer ${token}` } });
                            fetchData();
                          }
                        }}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                )) : (
                  <p className="p-4 text-stone-500 text-sm">You are not enrolled in any courses yet.</p>
                )}
              </div>
            </div>

            {regStatus?.isOpen && (
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
                <h2 className="font-bold text-stone-900 mb-6">Available Courses for Registration</h2>
                <div className="divide-y divide-stone-100">
                  {availableCourses.length > 0 ? availableCourses.map((c: any) => (
                    <div key={c.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-stone-900">{c.title}</p>
                        <p className="text-xs text-stone-500">{c.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              await axios.post('/api/enrollments', { course_offering_id: c.id, is_audit: false }, { headers: { Authorization: `Bearer ${token}` } });
                              fetchData();
                              alert('Enrolled successfully!');
                            } catch (err: any) {
                              alert(err.response?.data?.error || 'Failed to enroll');
                            }
                          }}
                          className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-100"
                        >
                          Enroll
                        </button>
                        {c.is_auditable === 1 && (
                          <button 
                            onClick={async () => {
                              try {
                                await axios.post('/api/enrollments', { course_offering_id: c.id, is_audit: true }, { headers: { Authorization: `Bearer ${token}` } });
                                fetchData();
                                alert('Added for audit successfully!');
                              } catch (err: any) {
                                alert(err.response?.data?.error || 'Failed to audit');
                              }
                            }}
                            className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-semibold hover:bg-stone-200"
                          >
                            Audit
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <p className="p-4 text-stone-500 text-sm">No courses available for registration at this time.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Class Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => (
                  <div key={day} className="space-y-4">
                    <h4 className="font-bold text-stone-400 text-xs uppercase tracking-widest">{day}</h4>
                    {schedule.filter(s => s.day_of_week === (idx + 1)).length > 0 ? (
                      schedule.filter(s => s.day_of_week === (idx + 1)).map((s, i) => (
                        <div key={i} className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                          <p className="text-xs font-bold text-emerald-700">{s.start_time} - {s.end_time}</p>
                          <p className="text-sm font-bold text-stone-900 mt-1">{s.course_name}</p>
                          <p className="text-[10px] text-stone-500 font-medium">{s.room_name}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 border border-dashed border-stone-100 rounded-2xl text-[10px] text-stone-300 text-center">No Classes</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-6">My Attendance Record</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50/50 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Course</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {attendance.map((a, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 text-sm font-semibold text-stone-900">{a.course_name}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{a.date}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            a.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-stone-400 text-sm italic">
                          No attendance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my-classes' && user?.role === 'faculty' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {facultyCourses.map((course, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-stone-900">{course.title}</h4>
                      <p className="text-xs text-stone-500">{course.code} • {course.role}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">Active</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSelectedOffering(course); fetchFacultyStudents(course.id); setActiveTab('class-details'); }}
                      className="flex-1 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all"
                    >
                      Manage Class
                    </button>
                    <button 
                      onClick={() => { setSelectedOffering(course); fetchOfferingData(course.id); setActiveTab('resources'); }}
                      className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200 transition-all"
                    >
                      Resources
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'class-details' && selectedOffering && (
          <div className="space-y-6">
             <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setActiveTab('my-classes')} className="p-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50">
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <h3 className="text-xl font-bold text-stone-900">{selectedOffering.title} - Student List</h3>
             </div>
             <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50/50 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Student</th>
                      <th className="px-6 py-4 font-semibold">Attendance</th>
                      <th className="px-6 py-4 font-semibold">Grades (M / F)</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {facultyStudents.map((s, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-stone-900">{s.full_name}</p>
                          <p className="text-[10px] text-stone-500 font-mono">{s.student_id_code}</p>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex gap-1">
                              {['Present', 'Absent'].map(status => (
                                <button 
                                  key={status}
                                  onClick={async () => {
                                    await axios.post('/api/attendance/bulk', { 
                                      course_offering_id: selectedOffering.id, 
                                      date: new Date().toISOString().split('T')[0],
                                      records: [{ student_id: s.id, status }]
                                    }, { headers: { Authorization: `Bearer ${token}` } });
                                    alert('Attendance marked');
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
                                >
                                  {status}
                                </button>
                              ))}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                placeholder="Mid" 
                                className="w-12 px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs"
                                defaultValue={s.midterm_grade}
                                onBlur={async (e) => {
                                  await axios.post('/api/enrollments/grades', { 
                                    enrollment_id: s.enrollment_id, 
                                    midterm_grade: parseFloat(e.target.value),
                                    assignment_grade: s.assignment_grade || 0,
                                    final_grade: s.final_grade || 0
                                  }, { headers: { Authorization: `Bearer ${token}` } });
                                }}
                              />
                              <input 
                                type="number" 
                                placeholder="Fin" 
                                className="w-12 px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs"
                                defaultValue={s.final_grade}
                                onBlur={async (e) => {
                                  await axios.post('/api/enrollments/grades', { 
                                    enrollment_id: s.enrollment_id, 
                                    final_grade: parseFloat(e.target.value),
                                    assignment_grade: s.assignment_grade || 0,
                                    midterm_grade: s.midterm_grade || 0
                                  }, { headers: { Authorization: `Bearer ${token}` } });
                                }}
                              />
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <span className="font-bold text-emerald-600">{s.final_letter_grade || '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <button 
                onClick={async () => {
                  if(confirm('Finalize and send SMS reports to cleared students?')) {
                    await axios.post('/api/enrollments/bulk-finalize', { 
                      course_id: selectedOffering.course_id, 
                      semester_id: selectedOffering.semester_id 
                    }, { headers: { Authorization: `Bearer ${token}` } });
                    alert('Reports distributed');
                  }
                }}
                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg"
             >
                Finalize & Distribute Grade Reports (SMS)
             </button>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
               <div className="md:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                    <h3 className="text-xl font-bold text-stone-900 mb-6">Course Materials</h3>
                    <div className="space-y-3">
                      {materials.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl group hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-stone-400 group-hover:text-emerald-600 shadow-sm">
                              <FileText size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-900">{m.title}</p>
                              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest">{m.uploaded_at.split('T')[0]}</p>
                            </div>
                          </div>
                          <a href={m.file_url} target="_blank" className="p-2 text-stone-400 hover:text-emerald-600">
                            <Download size={20} />
                          </a>
                        </div>
                      ))}
                      {materials.length === 0 && <p className="text-center py-8 text-stone-400 text-sm italic">No materials uploaded yet.</p>}
                    </div>
                  </div>
               </div>

               {user?.role === 'faculty' && (
                 <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                    <h3 className="text-lg font-bold text-stone-900 mb-6">Upload Material</h3>
                    <form onSubmit={async (e: any) => {
                      e.preventDefault();
                      const formData = new FormData();
                      formData.append('title', e.target.title.value);
                      formData.append('file', e.target.file.files[0]);
                      await axios.post(`/api/courses/${selectedOffering?.id}/materials`, formData, { 
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } 
                      });
                      alert('Uploaded');
                      fetchOfferingData(selectedOffering.id);
                    }} className="space-y-4">
                       <input name="title" placeholder="Title" className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm" required />
                       <input type="file" name="file" className="text-xs" required />
                       <button type="submit" className="w-full py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Upload</button>
                    </form>
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'finance' && user?.role === 'student' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-stone-900 mb-6">Financial Summary</h3>
                <div className="space-y-4">
                  {invoices.map((inv, i) => (
                    <div key={i} className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">{inv.semester_name} - {inv.academic_year}</p>
                            <h4 className="text-lg font-bold text-stone-900">Tuition & Fees</h4>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {inv.status}
                          </span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200/50">
                          <div>
                            <p className="text-[10px] text-stone-400 font-bold uppercase">Total Bill</p>
                            <p className="text-lg font-bold text-stone-900">{inv.total_amount} ETB</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-stone-400 font-bold uppercase">Balance Due</p>
                            <p className="text-lg font-bold text-red-600">{inv.balance_due} ETB</p>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                 <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl shadow-emerald-100">
                    <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2">Clearance Status</p>
                    {invoices.some(inv => inv.balance_due > 0) ? (
                      <div>
                        <h4 className="text-2xl font-bold mb-4 italic">Action Required</h4>
                        <p className="text-sm text-emerald-100 leading-relaxed mb-6">Please settle your outstanding balance to unlock your final academic reports and transcripts.</p>
                        <button className="w-full py-3 bg-white text-emerald-900 rounded-2xl font-bold hover:bg-emerald-50 transition-all">Pay Now via Chapa</button>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-2xl font-bold mb-4">Fully Cleared</h4>
                        <p className="text-sm text-emerald-100 leading-relaxed">You have no outstanding payments. All academic services are fully accessible.</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search students..." 
                      className="pl-12 pr-4 py-2.5 bg-white border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-80 transition-all"
                    />
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-2xl text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-all">
                    <Filter size={18} />
                    Filters
                  </button>
                </div>
                <button 
                  onClick={() => navigate('/register-student')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  <Plus size={18} />
                  Add Student
                </button>
             </div>

             <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50/50 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Student</th>
                      <th className="px-6 py-4 font-semibold">ID</th>
                      <th className="px-6 py-4 font-semibold">Type</th>
                      <th className="px-6 py-4 font-semibold">Program</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {students.map((student, i) => (
                      <tr key={i} className="hover:bg-stone-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                              {student.full_name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-900">{student.full_name}</p>
                              <p className="text-xs text-stone-500">{student.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-stone-600">{student.student_id_code || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{student.student_type}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          <div>{student.program_name}</div>
                          {student.program_degree && <div className="text-[10px] text-stone-400 font-bold uppercase">{student.program_degree}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            student.academic_status === 'good_standing' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {student.academic_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => { setSelectedStudent(student); setIsEditModalOpen(true); }}
                            className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {activeTab === 'branches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:border-emerald-200 transition-all group">
                <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 mb-6 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                  <Building2 size={28} />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">{branch.name}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <MapPin size={16} />
                    {branch.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <Phone size={16} />
                    {branch.contact}
                  </div>
                </div>
                <button className="w-full mt-8 py-3 bg-stone-50 text-stone-600 rounded-2xl text-sm font-bold hover:bg-emerald-600 hover:text-white transition-all">
                  Manage Branch
                </button>
              </div>
            ))}
            <button className="border-2 border-dashed border-stone-200 rounded-3xl p-8 flex flex-col items-center justify-center text-stone-400 hover:border-emerald-300 hover:text-emerald-500 transition-all group">
              <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mb-4 group-hover:bg-emerald-50 transition-all">
                <Plus size={24} />
              </div>
              <span className="font-bold">Add New Branch</span>
            </button>
          </div>
        )}

        {activeTab === 'integrations' && user?.role === 'superadmin' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-900">System Integrations</h3>
                  <p className="text-sm text-stone-500">Configure global API settings and mock mode toggles.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                  <h4 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <Bell size={18} className="text-emerald-600" />
                    AfroMessage (SMS)
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-stone-600">Mock Mode</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${integrations?.afromessage_mock === 'true' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {integrations?.afromessage_mock === 'true' ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 italic">API Key is managed via environment variables.</p>
                  </div>
                </div>

                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                  <h4 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-emerald-600" />
                    Chapa (Payments)
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-stone-600">Mock Mode</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${integrations?.chapa_mock === 'true' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {integrations?.chapa_mock === 'true' ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 italic">Public/Secret keys are managed via environment variables.</p>
                  </div>
                </div>

                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 col-span-2">
                  <h4 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <Settings size={18} className="text-emerald-600" />
                    CBE Verifier Microservice
                  </h4>
                  <div className="flex items-center gap-4">
                    <input 
                      type="text" 
                      readOnly 
                      value={integrations?.cbe_verifier_url}
                      className="flex-1 px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-mono text-stone-500"
                    />
                    <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">
                      Update URL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Academic Calendars</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50/50 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Semester</th>
                      <th className="px-6 py-4 font-semibold">Branch</th>
                      <th className="px-6 py-4 font-semibold">Start Date</th>
                      <th className="px-6 py-4 font-semibold">End Date</th>
                      <th className="px-6 py-4 font-semibold">Reg Period</th>
                      <th className="px-6 py-4 font-semibold">Exam Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {calendars.map((cal, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 text-sm font-semibold text-stone-900">{cal.semester_name}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{cal.branch_name}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{cal.start_date}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{cal.end_date}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{cal.reg_start_date} - {cal.reg_end_date}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{cal.exam_start_date} - {cal.exam_end_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registrar' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Student Management (Registrar)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50/50 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Student ID</th>
                      <th className="px-6 py-4 font-semibold">Branch</th>
                      <th className="px-6 py-4 font-semibold">Program</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {students.map((student, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 text-sm font-semibold text-stone-900">{student.full_name}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{student.student_id_code}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{student.branch_name}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{student.program_name}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.academic_status === 'good_standing' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {student.academic_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button className="text-emerald-600 hover:underline font-semibold">View Profile</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academics' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Academic Progress</h3>
              {user?.role === 'student' ? (
                <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-sm text-emerald-600 font-semibold">Current GPA</p>
                        <p className="text-3xl font-bold text-emerald-900">3.8</p>
                      </div>
                      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-sm text-blue-600 font-semibold">Completed Credits</p>
                        <p className="text-3xl font-bold text-blue-900">45 / 147</p>
                      </div>
                   </div>
                   <div className="mt-8">
                     <h4 className="font-bold text-stone-900 mb-4">Current Semester Courses</h4>
                     <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl overflow-hidden">
                       {enrollments.map((e: any) => (
                         <div key={e.id} className="p-4 bg-white flex justify-between items-center hover:bg-stone-50 transition-colors">
                           <div>
                             <p className="font-bold text-stone-900">{e.course_name}</p>
                             <p className="text-xs text-stone-500">{e.course_code} • {e.credits || 3} Credits</p>
                           </div>
                           <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">
                             {e.status}
                           </span>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <BookOpen size={48} className="mx-auto text-stone-300 mb-4" />
                  <p className="text-stone-500">Academic reporting for staff is coming soon.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Financial Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-sm text-stone-500 font-medium">Total Balance Due</p>
                  <p className="text-2xl font-bold text-stone-900">0.00 ETB</p>
                </div>
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-sm text-stone-500 font-medium">Last Payment</p>
                  <p className="text-2xl font-bold text-stone-900">5,000.00 ETB</p>
                </div>
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-sm text-stone-500 font-medium">Payment Status</p>
                  <p className="text-2xl font-bold text-emerald-600">Up to Date</p>
                </div>
              </div>

              <h4 className="font-bold text-stone-900 mb-4">Recent Transactions</h4>
              <div className="overflow-x-auto border border-stone-100 rounded-2xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 text-xs uppercase font-bold">
                      <th className="px-6 py-4">Reference</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr className="text-sm">
                      <td className="px-6 py-4 font-mono">FT12345678</td>
                      <td className="px-6 py-4">Tuition Fee</td>
                      <td className="px-6 py-4 font-bold">5,000.00 ETB</td>
                      <td className="px-6 py-4 capitalize">cbe_receipt</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">Verified</span>
                      </td>
                    </tr>
                    <tr className="text-sm">
                      <td className="px-6 py-4 font-mono">FT87654321</td>
                      <td className="px-6 py-4">Registration</td>
                      <td className="px-6 py-4 font-bold">1,500.00 ETB</td>
                      <td className="px-6 py-4 capitalize">cbe_receipt</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">Verified</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isEditModalOpen && selectedStudent && (
          <EditStudentModal 
            student={selectedStudent} 
            onClose={() => setIsEditModalOpen(false)} 
            onUpdate={() => { fetchData(); setIsEditModalOpen(false); }} 
          />
        )}
      </main>
    </div>
  );
}
