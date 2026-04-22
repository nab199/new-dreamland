import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import ContentAdmin from '../components/ContentAdmin';
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
  Shield,
  Check,
  FileText,
  Download,
  Brain,
  BarChart3,
  Database,
  UserCheck,
  Activity,
  GraduationCap,
  FileSpreadsheet,
  Save,
  Calculator,
  TrendingUp,
  AlertCircle,
  Calendar,
  Menu,
  X
} from 'lucide-react';
import Sidebar from '../../Sidebar';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EditStudentModal from '../components/EditStudentModal';
import AIFeatures from '../components/AIFeatures';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import BackupManagement from '../components/BackupManagement';
import AdminStatusDashboard from '../components/AdminStatusDashboard';
import FloatingAI from '../components/FloatingAI';
import GradeEntry from '../components/GradeEntry';
import CourseResources from '../components/CourseResources';
import ScheduleManagement from '../components/ScheduleManagement';
import RegistrationPeriodManager from '../components/RegistrationPeriodManager';
import CreditHourManager from '../components/CreditHourManager';
import StudentCourseRegistration from '../components/StudentCourseRegistration';
import UserManagement from '../components/UserManagement';
import IntegrationSettings from '../components/IntegrationSettings';
import SemesterRegistration from '../components/SemesterRegistration';
import RegistrationManagement from '../components/RegistrationManagement';
import NotificationsPanel, {
  DashboardNotification,
} from '../components/dashboard/NotificationsPanel';

export default function Dashboard() {
  const { user, logout, token } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [facultyCourses, setFacultyCourses] = useState<any[]>([]);
  const [myCoursesWithInstructors, setMyCoursesWithInstructors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any>(null);
  const [regStatus, setRegStatus] = useState<{ isOpen: boolean, period: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    if (!token) {
      console.error('No token available');
      setIsLoading(false);
      return;
    }
    
    console.log('Fetching data with role:', user?.role, 'token:', token ? 'present' : 'missing');
    
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data with named promises to avoid index mismatch
      const studentsRes = ['superadmin', 'branch_admin', 'faculty'].includes(user?.role || '')
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
      let myCoursesRes = Promise.resolve({ data: [] });

      if (user?.role === 'student') {
        enrollmentsRes = axios.get('/api/enrollments', { headers });
        availableCoursesRes = axios.get('/api/courses/available', { headers });
        regStatusRes = axios.get('/api/registration-periods/current', { headers });
        scheduleRes = axios.get('/api/my-schedule', { headers });
        attendanceRes = axios.get('/api/my-attendance', { headers });
        invoicesRes = axios.get('/api/my-invoices', { headers });
        myCoursesRes = axios.get('/api/my-courses', { headers });
      }

      // Faculty-specific data
      const facultyCoursesRes = user?.role === 'faculty'
        ? axios.get('/api/faculty/my-courses', { headers })
        : Promise.resolve({ data: [] });

      const [
        studentsData,
        branchesData,
        calendarsData,
        integrationsData,
        enrollmentsData,
        availableCoursesData,
        regStatusData,
        scheduleData,
        attendanceData,
        invoicesData,
        facultyCoursesData,
        myCoursesWithInstructorsData
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
        facultyCoursesRes,
        myCoursesRes
      ]);

      setStudents(studentsData.data);
      setBranches(branchesData.data);
      setCalendars(calendarsData.data);
      setIntegrations(integrationsData.data);
      setEnrollments(enrollmentsData.data);
      setAvailableCourses(availableCoursesData.data);
      setRegStatus(regStatusData.data);
      setSchedule(scheduleData.data);
      setAttendance(attendanceData.data);
      setInvoices(invoicesData.data);
      setFacultyCourses(facultyCoursesData.data);
      setMyCoursesWithInstructors(myCoursesWithInstructorsData.data);
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
    { id: 'overview', icon: LayoutDashboard, label: 'Overview', roles: ['superadmin', 'branch_admin', 'faculty', 'student'] },
    { id: 'students', icon: Users, label: t('students'), roles: ['superadmin', 'branch_admin', 'faculty'] },
    { id: 'content-admin', icon: Users, label: 'Student Management', roles: ['superadmin', 'branch_admin'] },
    { id: 'branches', icon: Building2, label: t('branches'), roles: ['superadmin', 'branch_admin'] },
    { id: 'academics', icon: BookOpen, label: t('academics'), roles: ['superadmin', 'branch_admin', 'faculty', 'student'] },
    { id: 'registration-periods', icon: Calendar, label: 'Registration Periods', roles: ['superadmin', 'branch_admin'] },
    { id: 'credit-hours', icon: CreditCard, label: 'Credit Hours', roles: ['superadmin', 'branch_admin'] },
    { id: 'registration', icon: Plus, label: 'Course Registration', roles: ['student'] },
    { id: 'my-courses', icon: BookOpen, label: 'My Courses & Instructors', roles: ['student'] },
    { id: 'my-classes', icon: Users, label: 'My Classes', roles: ['faculty'] },
    { id: 'grades', icon: FileSpreadsheet, label: 'Grade Entry', roles: ['faculty'] },
    { id: 'resources', icon: BookOpen, label: 'Resources', roles: ['student', 'faculty'] },
    { id: 'schedule', icon: Bell, label: 'Schedule', roles: ['superadmin', 'branch_admin', 'student', 'faculty'] },
    { id: 'attendance', icon: ShieldCheck, label: 'Attendance', roles: ['student', 'faculty'] },
    { id: 'semester-registrations', icon: Calendar, label: 'Semester Regs', roles: ['superadmin', 'branch_admin'] },
    { id: 'user-management', icon: Shield, label: 'User Management', roles: ['superadmin', 'branch_admin'] },
    { id: 'integrations', icon: Settings, label: 'Integrations', roles: ['superadmin'] },
    { id: 'system-status', icon: Activity, label: 'System Health', roles: ['superadmin'] },
    { id: 'ai-features', icon: Brain, label: 'AI Tools', roles: ['superadmin', 'branch_admin', 'faculty'] },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', roles: ['superadmin', 'branch_admin'] },
    { id: 'backup', icon: Database, label: 'Backup & GDPR', roles: ['superadmin'] },
  ].filter(item => item.roles.includes(user?.role || ''));

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedOffering, setSelectedOffering] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<any[]>([]);
  const [facultyStudents, setFacultyStudents] = useState<any[]>([]);
  const [financeTab, setFinanceTab] = useState<'fee' | 'invoice'>('fee');
  const [integrationTab, setIntegrationTab] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterOptions, setFilterOptions] = useState({
    branch: '',
    program: '',
    status: '',
    studentType: ''
  });

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get('/api/notifications', { headers });
        setUnreadCount(res.data.unreadCount || 0);
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    };

    if (token) {
      fetchUnreadCount();
      // Polling for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

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

  const handleViewAllStudents = () => {
    setActiveTab('students');
  };

  const handleViewCourseStudents = async (offeringId: number) => {
    setSelectedOffering(offeringId);
    await fetchOfferingData(offeringId);
    await fetchFacultyStudents(offeringId);
  };

  const handleTakeAttendance = async (course: any) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`/api/attendance/take`, { course_offering_id: course.id }, { headers });
      showToast('Attendance recorded successfully!', 'success');
    } catch (err) {
      console.error('Failed to record attendance', err);
      showToast('Failed to record attendance. Please try again.', 'error');
    }
  };

  const handleUploadMaterials = (course: any) => {
    setSelectedOffering(course.id);
    setActiveTab('resources');
  };

  const handleAddAssignment = (course: any) => {
    const assignmentTitle = prompt('Enter assignment title:');
    if (!assignmentTitle) return;
    const dueDate = prompt('Enter due date (YYYY-MM-DD):');
    if (!dueDate) return;
    
    axios.post(`/api/courses/${course.id}/assignments`, {
      title: assignmentTitle,
      due_date: dueDate
    }, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => showToast('Assignment added successfully!', 'success'))
      .catch(() => showToast('Failed to add assignment', 'error'));
  };

  const handleManageBranch = (branch: any) => {
    setActiveTab('students');
  };

  const handleViewAcademics = (type: string) => {
    setActiveTab('academics');
  };

  const handleManageFeeStructure = () => {
    setActiveTab('credit-hours');
  };

  const handleGenerateInvoice = () => {
    setActiveTab('payments');
  };

  const handleConfigureIntegration = (integration: string) => {
    setIntegrationTab(integration);
    showToast(`${integration} configuration coming soon`, 'info');
  };

  const handleSearch = (query: string) => {
    // Filter students based on search query
    if (query.trim() === '') {
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = students.filter(s => 
      s.full_name?.toLowerCase().includes(lowerQuery) ||
      s.student_id_code?.toLowerCase().includes(lowerQuery) ||
      s.email?.toLowerCase().includes(lowerQuery)
    );
    console.log('Search results:', filtered);
    // Could set a filtered state or navigate to students tab with filter
  };

  const handleOpenNotifications = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/notifications', { headers });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
      setShowNotifications(true);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      // Show mock notifications for demo
      setNotifications([
        { id: 1, title: 'Welcome', message: 'Welcome to Dreamland College!', is_read: 0, created_at: new Date().toISOString() },
        { id: 2, title: 'System Update', message: 'New features available', is_read: 0, created_at: new Date().toISOString() }
      ]);
      setShowNotifications(true);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('/api/notifications/read', { notification_id: id }, { headers });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleOpenFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleApplyFilters = () => {
    // Filter students based on selected options
    let filtered = [...students];
    
    if (filterOptions.branch) {
      filtered = filtered.filter(s => s.branch_id?.toString() === filterOptions.branch);
    }
    if (filterOptions.program) {
      filtered = filtered.filter(s => s.program_id?.toString() === filterOptions.program);
    }
    if (filterOptions.status) {
      filtered = filtered.filter(s => s.status === filterOptions.status);
    }
    if (filterOptions.studentType) {
      filtered = filtered.filter(s => s.student_type === filterOptions.studentType);
    }
    
    console.log('Filtered students:', filtered);
    showToast(`Showing ${filtered.length} students`, 'info');
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilterOptions({ branch: '', program: '', status: '', studentType: '' });
    showToast('Filters cleared', 'info');
  };

  const handleViewStudentDetails = (student: any) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const SidebarItem = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
        activeTab === id
          ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 scale-[1.02]'
          : 'text-stone-500 hover:bg-stone-50 hover:translate-x-1'
      }`}
    >
      <Icon size={18} className={activeTab === id ? 'animate-pulse' : ''} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-6"
          />
          <p className="text-stone-400 font-black tracking-widest text-xs uppercase">Initializing Experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden">
      {/* Responsive Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        activeId={activeTab}
        language={i18n.language as any}
        onNavigate={(id) => {
          setActiveTab(id);
          setIsSidebarOpen(false);
        }}
        onLogout={() => logout('user_initiated')}
        isOpen={isSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden h-20 bg-white border-b border-stone-100 flex items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-lg">D</div>
            <span className="font-black text-lg tracking-tighter">DREAMLAND</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 text-stone-600 hover:bg-stone-50 rounded-xl">
              <Search size={20} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-stone-50 text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6 md:p-12 relative custom-scrollbar">
          <header className="hidden lg:flex justify-between items-start mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-black text-stone-900 tracking-tight">
              {activeTab === 'overview' 
                ? <><span className="text-stone-400 font-medium">Welcome back,</span> {user?.full_name.split(' ')[0]}</>
                : t(activeTab)}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-stone-500">
              <span className="text-sm font-medium">Dashboard Overview</span>
              <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
              <span className="text-sm font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Command Search..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="pl-14 pr-6 py-4 bg-white border border-stone-100 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20 outline-none w-80 shadow-sm transition-all"
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-stone-50 text-stone-400 text-[10px] font-black rounded-md border border-stone-100 pointer-events-none uppercase tracking-tighter">⌘K</kbd>
            </div>
            
            <button 
              onClick={handleOpenNotifications}
              className="p-4 bg-white border border-stone-100 rounded-[1.5rem] text-stone-600 hover:bg-stone-50 hover:scale-105 transition-all relative shadow-sm"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-3.5 right-3.5 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-[3px] border-white font-black animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* KPI Section - Dynamic Glass Cards */}
            {(user?.role === 'superadmin' || user?.role === 'branch_admin') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { label: 'Total Students', value: students.length, icon: Users, color: 'emerald', trend: '+12%' },
                  { label: 'Active Branches', value: branches.length, icon: Building2, color: 'blue', trend: 'Stable' },
                  { label: 'Academic Programs', value: '12', icon: BookOpen, color: 'purple', trend: '+2 New' },
                  { label: 'Annual Revenue', value: '1.2M', icon: CreditCard, color: 'stone', trend: '+8.4%' }
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className="glass rounded-[2rem] p-8 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="relative z-10">
                      <div className={`w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl transition-transform group-hover:rotate-6`}>
                        <stat.icon size={26} />
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs font-black text-stone-400 uppercase tracking-widest">{stat.label}</p>
                          <h3 className="text-3xl font-black text-stone-900 mt-2 tracking-tight">{stat.value}</h3>
                        </div>
                        <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.trend.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-50 text-stone-400'}`}>
                          {stat.trend}
                        </div>
                      </div>
                    </div>
                    {/* Abstract Background Shapes */}
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-stone-50 rounded-full opacity-50 transition-transform group-hover:scale-150 duration-700" />
                  </motion.div>
                ))}
              </div>
            )}

            <div className="glass rounded-[2.5rem] overflow-hidden">
                  <div className="p-8 border-b border-stone-50 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black text-stone-900">Recent Registrations</h3>
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Latest student activity across all branches</p>
                    </div>
                    <button 
                      onClick={handleViewAllStudents} 
                      className="px-6 py-3 bg-stone-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-stone-100"
                    >
                      View Directory
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-50/30 text-stone-400 text-[10px] font-black uppercase tracking-[0.2em]">
                          <th className="px-8 py-5">Profile</th>
                          <th className="px-8 py-5">Credential</th>
                          <th className="px-8 py-5">Location</th>
                          <th className="px-8 py-5">Curriculum</th>
                          <th className="px-8 py-5 text-center">Security Status</th>
                          <th className="px-8 py-5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {students.slice(0, 5).map((student, i) => (
                          <tr key={i} className="hover:bg-stone-50/50 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-900 text-sm font-black transition-transform group-hover:scale-110 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                                  {student.full_name?.[0]}
                                </div>
                                <div>
                                  <span className="text-sm font-black text-stone-900 block">{student.full_name}</span>
                                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Registered today</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-xs font-bold text-stone-600 font-mono bg-stone-100 px-2 py-1 rounded-md">{student.student_id_code || 'AUTH_PENDING'}</span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                <Building2 size={14} className="text-stone-300" />
                                <span className="text-sm font-bold text-stone-600">{student.branch_name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-sm font-bold text-stone-900">{student.program_name}</span>
                              {student.program_degree && (
                                <span className="ml-2 text-[9px] px-2 py-0.5 bg-emerald-50 text-emerald-600 font-black rounded uppercase">
                                  {student.program_degree}
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                student.academic_status === 'good_standing' 
                                  ? 'bg-emerald-50 text-emerald-600' 
                                  : 'bg-red-50 text-red-600'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${student.academic_status === 'good_standing' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                {student.academic_status?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button onClick={() => handleViewStudentDetails(student)} className="p-2 text-stone-300 hover:text-stone-900 transition-colors">
                                <ChevronRight size={20} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
            </div>

            {/* Student Overview */}
            {user?.role === 'student' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <BookOpen size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">Enrolled Courses</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">{enrollments.length}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <CreditCard size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">Pending Payments</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">{invoices.filter(i => i.status === 'pending').length}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <ShieldCheck size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">Attendance Rate</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">95%</h3>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
                  <h3 className="font-bold text-stone-900 mb-4">My Enrolled Courses</h3>
                  {enrollments.length > 0 ? (
                    <div className="space-y-3">
                      {enrollments.map((enrollment: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                          <div>
                            <p className="font-semibold text-stone-900">{enrollment.course_name}</p>
                            <p className="text-sm text-stone-500">{enrollment.program_name}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            enrollment.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
                          }`}>
                            {enrollment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-stone-500 text-center py-4">No enrolled courses yet.</p>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
                  <h3 className="font-bold text-stone-900 mb-4">My Upcoming Schedule</h3>
                  {schedule.length > 0 ? (
                    <div className="space-y-3">
                      {schedule.slice(0, 5).map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                            {new Date(s.start_time).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-stone-900">{s.course_name}</p>
                            <p className="text-sm text-stone-500">{s.room_name} • {new Date(s.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-stone-500 text-center py-4">No upcoming classes.</p>
                  )}
                </div>
              </>
            )}

            {/* Faculty Overview */}
            {user?.role === 'faculty' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <BookOpen size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">My Courses</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">{facultyCourses.length}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <Users size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">Total Students</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">{facultyCourses.reduce((acc: number, c: any) => acc + (c.enrolled_count || 0), 0)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <Bell size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">Pending Assignments</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">3</h3>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
                  <h3 className="font-bold text-stone-900 mb-4">My Courses</h3>
                  {facultyCourses.length > 0 ? (
                    <div className="space-y-3">
                      {facultyCourses.map((course: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                          <div>
                            <p className="font-semibold text-stone-900">{course.course_name}</p>
                            <p className="text-sm text-stone-500">{course.program_name} - {course.year} {course.semester}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-500">{course.enrolled_count || 0} students</span>
                            <button 
                              onClick={() => { setActiveTab('my-classes'); }}
                              className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-stone-500 text-center py-4">No courses assigned yet.</p>
                  )}
                </div>
              </>
            )}

            {/* Accountant Overview */}
            {user?.role === 'accountant' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <CreditCard size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">Total Payments</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">45</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <CreditCard size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">Verified</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">38</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white mb-4">
                      <CreditCard size={24} />
                    </div>
                    <p className="text-sm font-medium text-stone-500">Pending</p>
                    <h3 className="text-2xl font-bold text-stone-900 mt-1">7</h3>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
                  <h3 className="font-bold text-stone-900 mb-4">Recent Payments</h3>
                  <div className="space-y-3">
                    {invoices.length > 0 ? invoices.slice(0, 5).map((invoice: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                        <div>
                          <p className="font-semibold text-stone-900">{invoice.student_name || 'Student'}</p>
                          <p className="text-sm text-stone-500">{invoice.description || 'Payment'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-stone-900">{invoice.amount} ETB</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            invoice.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 
                            invoice.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-stone-500 text-center py-4">No payments found.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'system-status' && <AdminStatusDashboard />}
        {activeTab === 'ai-features' && <AIFeatures students={students} />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
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
                <button onClick={() => handleManageBranch(branch)} className="w-full mt-8 py-3 bg-stone-50 text-stone-600 rounded-2xl text-sm font-bold hover:bg-emerald-600 hover:text-white transition-all">
                  Manage Branch
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'my-classes' && user?.role === 'faculty' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-stone-900 mb-6">My Teaching Schedule</h3>
              {facultyCourses.length > 0 ? (
                <div className="space-y-4">
                  {facultyCourses.map((course: any, i: number) => (
                    <div key={i} className="border border-stone-200 rounded-2xl p-6 hover:border-emerald-200 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-stone-900">{course.course_name}</h4>
                          <p className="text-sm text-stone-500">{course.program_name} - Year {course.year}, Semester {course.semester}</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">
                          {course.enrolled_count || 0} Students
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleViewCourseStudents(course.id)}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
                        >
                          View Students
                        </button>
                        <button 
                          onClick={() => handleUploadMaterials(course)}
                          className="px-4 py-2 bg-stone-100 text-stone-600 text-sm font-bold rounded-xl hover:bg-stone-200"
                        >
                          Upload Materials
                        </button>
                        <button 
                          onClick={() => handleAddAssignment(course)}
                          className="px-4 py-2 bg-stone-100 text-stone-600 text-sm font-bold rounded-xl hover:bg-stone-200"
                        >
                          Add Assignment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500 text-center py-8">No courses assigned yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <CourseResources facultyCourses={facultyCourses} enrollments={enrollments} />
        )}

        {activeTab === 'grades' && user?.role === 'faculty' && (
          <GradeEntry facultyCourses={facultyCourses} />
        )}

        {activeTab === 'schedule' && (
          <ScheduleManagement facultyCourses={facultyCourses} schedule={schedule} branches={branches} />
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-stone-900 mb-6">
                {user?.role === 'faculty' ? 'Attendance Management' : 'My Attendance Record'}
              </h3>
              
              {user?.role === 'student' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-emerald-50 p-6 rounded-2xl text-center">
                      <p className="text-3xl font-bold text-emerald-600">95%</p>
                      <p className="text-sm text-emerald-700 font-medium mt-1">Overall Attendance</p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-2xl text-center">
                      <p className="text-3xl font-bold text-blue-600">{attendance.filter(a => a.status === 'present').length}</p>
                      <p className="text-sm text-blue-700 font-medium mt-1">Present</p>
                    </div>
                    <div className="bg-red-50 p-6 rounded-2xl text-center">
                      <p className="text-3xl font-bold text-red-600">{attendance.filter(a => a.status === 'absent').length}</p>
                      <p className="text-sm text-red-700 font-medium mt-1">Absent</p>
                    </div>
                  </div>
                  
                  {attendance.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-stone-50 text-stone-500 text-xs uppercase">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Course</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {attendance.map((a: any, i: number) => (
                            <tr key={i} className="hover:bg-stone-50">
                              <td className="px-4 py-3 text-sm">{new Date(a.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-sm">{a.course_name}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  a.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                }`}>
                                  {a.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-stone-500 text-center py-4">No attendance records.</p>
                  )}
                </>
              )}

              {user?.role === 'faculty' && (
                <div className="space-y-4">
                  <p className="text-stone-600 mb-4">Select a course to take attendance:</p>
                  {facultyCourses.map((course: any, i: number) => (
                    <div key={i} className="border border-stone-200 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-stone-900">{course.course_name}</h4>
                        <p className="text-sm text-stone-500">{course.enrolled_count || 0} students enrolled</p>
                      </div>
                      <button onClick={() => handleTakeAttendance(course)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700">
                        Take Attendance
                      </button>
                    </div>
                  ))}
                  {facultyCourses.length === 0 && (
                    <p className="text-stone-500 text-center py-4">No courses assigned.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'academics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Academic Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => handleViewAcademics('Courses')} className="border border-stone-200 rounded-2xl p-6 text-center hover:border-emerald-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="font-bold text-stone-900">Courses</h4>
                  <p className="text-sm text-stone-500">Manage courses</p>
                </div>
                <div onClick={() => handleViewAcademics('Programs')} className="border border-stone-200 rounded-2xl p-6 text-center hover:border-emerald-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
                    <Users size={24} />
                  </div>
                  <h4 className="font-bold text-stone-900">Programs</h4>
                  <p className="text-sm text-stone-500">Academic programs</p>
                </div>
                <div onClick={() => handleViewAcademics('Calendar')} className="border border-stone-200 rounded-2xl p-6 text-center hover:border-emerald-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mx-auto mb-4">
                    <Bell size={24} />
                  </div>
                  <h4 className="font-bold text-stone-900">Calendar</h4>
                  <p className="text-sm text-stone-500">Academic calendar</p>
                </div>
                <div onClick={() => handleViewAcademics('Semesters')} className="border border-stone-200 rounded-2xl p-6 text-center hover:border-emerald-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mx-auto mb-4">
                    <CreditCard size={24} />
                  </div>
                  <h4 className="font-bold text-stone-900">Semesters</h4>
                  <p className="text-sm text-stone-500">Semester management</p>
                </div>
              </div>

              {calendars.length > 0 && (
                <div className="mt-8">
                  <h4 className="font-bold text-stone-900 mb-4">Upcoming Academic Events</h4>
                  <div className="space-y-3">
                    {calendars.slice(0, 5).map((event: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-sm">
                          {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div>
                          <h5 className="font-bold text-stone-900">{event.title}</h5>
                          <p className="text-sm text-stone-500">{event.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'content-admin' && (user?.role === 'superadmin' || user?.role === 'branch_admin') && (
          <ContentAdmin />
        )}

        {activeTab === 'registration' && user?.role === 'student' && (
          <SemesterRegistration onRegistered={() => {
            // After semester registration, show course registration
            setTimeout(() => setActiveTab('registration'), 2000);
          }} />
        )}

        {activeTab === 'my-courses' && user?.role === 'student' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-stone-900 mb-2">My Courses & Instructors</h3>
              <p className="text-stone-500 text-sm mb-6">View your enrolled courses and their instructors</p>
              
              {myCoursesWithInstructors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myCoursesWithInstructors.map((course: any, i: number) => (
                    <div key={i} className="border border-stone-200 rounded-2xl p-6 hover:border-emerald-200 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-stone-900">{course.course_title}</h4>
                          <p className="text-sm text-stone-500 font-mono">{course.course_code}</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">
                          {course.credits} Credits
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {course.instructor_name ? course.instructor_name[0] : '?'}
                          </div>
                          <div>
                            <p className="text-xs text-stone-500 font-bold uppercase">Instructor</p>
                            <p className="text-sm font-semibold text-stone-900">
                              {course.instructor_name || 'Not assigned'}
                            </p>
                          </div>
                        </div>
                        
                        {course.instructor_email && (
                          <p className="text-xs text-stone-500">{course.instructor_email}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-stone-500">{course.semester_name} - {course.academic_year}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            course.enrollment_status === 'enrolled' 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : 'bg-stone-100 text-stone-500'
                          }`}>
                            {course.enrollment_status}
                          </span>
                        </div>
                        
                        {course.grade && (
                          <div className="mt-3 pt-3 border-t border-stone-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-stone-500">Grade</span>
                              <span className="text-lg font-bold text-emerald-600">{course.grade}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <BookOpen size={48} className="text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-500">No enrolled courses yet.</p>
                  <button 
                    onClick={() => setActiveTab('registration')}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
                  >
                    Register for Courses
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="bg-stone-100 rounded-3xl border border-stone-200 p-6 opacity-70">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-stone-200 rounded-xl flex items-center justify-center text-stone-400">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-400">Finance Management</h3>
                  <p className="text-sm text-stone-500">Payment system is disabled</p>
                </div>
              </div>
              <p className="text-stone-500">The payment system has been disabled. All students are automatically verified for registration without payment.</p>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && user?.role === 'superadmin' && (
          <IntegrationSettings />
        )}

        {activeTab === 'registration-periods' && (user?.role === 'superadmin' || user?.role === 'branch_admin') && (
          <RegistrationPeriodManager />
        )}

        {activeTab === 'credit-hours' && (user?.role === 'superadmin' || user?.role === 'branch_admin') && (
          <CreditHourManager />
        )}

        {activeTab === 'user-management' && (user?.role === 'superadmin' || user?.role === 'branch_admin') && (
          <UserManagement />
        )}

        {isEditModalOpen && selectedStudent && (
          <EditStudentModal 
            student={selectedStudent} 
            onClose={() => setIsEditModalOpen(false)} 
            onUpdate={() => { fetchData(); setIsEditModalOpen(false); }} 
          />
        )}
        {showNotifications && (
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onClose={() => setShowNotifications(false)}
            onMarkAllRead={async () => {
              await axios.post('/api/notifications/read', {}, { headers: { Authorization: `Bearer ${token}` } });
              setNotifications(notifications.map((notification) => ({ ...notification, is_read: 1 })));
              setUnreadCount(0);
            }}
            onMarkRead={handleMarkNotificationRead}
          />
        )}
        <FloatingAI />
      </main>
    </div>
  </div>
  );
}
