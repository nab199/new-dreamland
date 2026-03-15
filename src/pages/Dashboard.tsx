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
  Download,
  Brain,
  BarChart3,
  Database,
  UserCheck,
  Activity,
  GraduationCap
} from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EditStudentModal from '../components/EditStudentModal';
import AIFeatures from '../components/AIFeatures';
import ParentPortal from '../components/ParentPortal';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import BackupManagement from '../components/BackupManagement';
import AdminStatusDashboard from '../components/AdminStatusDashboard';
import FloatingAI from '../components/FloatingAI';

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
  const [regStatus, setRegStatus] = useState<{ isOpen: boolean, period: any } | null>(null);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data with named promises to avoid index mismatch
      const studentsRes = ['superadmin', 'branch_admin', 'faculty', 'accountant', 'registrar'].includes(user?.role || '')
        ? axios.get('/api/students', { headers })
        : Promise.resolve({ data: [] });

      const branchesRes = ['superadmin', 'branch_admin'].includes(user?.role || '')
        ? axios.get('/api/branches', { headers })
        : Promise.resolve({ data: [] });

      const calendarsRes = axios.get('/api/academic-calendars', { headers });

      const integrationsRes = user?.role === 'superadmin'
        ? axios.get('/api/settings/integrations', { headers })
        : Promise.resolve({ data: null });

      // Student-specific data
      let enrollmentsRes = Promise.resolve({ data: [] });
      let availableCoursesRes = Promise.resolve({ data: [] });
      let regStatusRes = Promise.resolve({ data: null });
      let scheduleRes = Promise.resolve({ data: [] });
      let attendanceRes = Promise.resolve({ data: [] });
      let invoicesRes = Promise.resolve({ data: [] });

      if (user?.role === 'student') {
        enrollmentsRes = axios.get('/api/enrollments', { headers });
        availableCoursesRes = axios.get('/api/courses/available', { headers });
        regStatusRes = axios.get('/api/registration-periods/current', { headers });
        scheduleRes = axios.get('/api/my-schedule', { headers });
        attendanceRes = axios.get('/api/my-attendance', { headers });
        invoicesRes = axios.get('/api/my-invoices', { headers });
      }

      // Faculty-specific data
      const facultyCoursesRes = user?.role === 'faculty'
        ? axios.get('/api/faculty/my-courses', { headers })
        : Promise.resolve({ data: [] });

      const [
        students,
        branches,
        calendars,
        integrations,
        enrollments,
        availableCourses,
        regStatus,
        schedule,
        attendance,
        invoices,
        facultyCourses
      ] = await Promise.all([
        studentsRes,
        branchesRes,
        calendarsRes,
        integrationsRes,
        enrollmentsRes,
        availableCoursesRes,
        regStatusRes,
        scheduleRes,
        attendanceRes,
        invoicesRes,
        facultyCoursesRes
      ]);

      setStudents(students.data);
      setBranches(branches.data);
      setCalendars(calendars.data);
      setIntegrations(integrations.data);
      setEnrollments(enrollments.data);
      setAvailableCourses(availableCourses.data);
      setRegStatus(regStatus.data);
      setSchedule(schedule.data);
      setAttendance(attendance.data);
      setInvoices(invoices.data);
      setFacultyCourses(facultyCourses.data);
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
    { id: 'system-status', icon: Activity, label: 'System Health', roles: ['superadmin'] },
    { id: 'ai-features', icon: Brain, label: 'AI Tools', roles: ['superadmin', 'branch_admin', 'faculty', 'student'] },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', roles: ['superadmin', 'branch_admin', 'accountant'] },
    { id: 'parent-portal', icon: UserCheck, label: 'Parent Portal', roles: ['parent'] },
    { id: 'backup', icon: Database, label: 'Backup & GDPR', roles: ['superadmin'] },
  ].filter(item => item.roles.includes(user?.role || ''));

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedOffering, setSelectedOffering] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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

        {activeTab === 'system-status' && <AdminStatusDashboard />}
        {activeTab === 'ai-features' && <AIFeatures students={students} />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'parent-portal' && <ParentPortal />}
        {activeTab === 'backup' && <BackupManagement />}

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
          </div>
        )}

        {isEditModalOpen && selectedStudent && (
          <EditStudentModal 
            student={selectedStudent} 
            onClose={() => setIsEditModalOpen(false)} 
            onUpdate={() => { fetchData(); setIsEditModalOpen(false); }} 
          />
        )}
        <FloatingAI />
      </main>
    </div>
  );
}
