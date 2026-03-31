import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { 
  Users, Search, Filter, CheckCircle, XCircle, Clock, 
  AlertTriangle, MoreVertical, Ban, Award, Download
} from 'lucide-react';

interface RegistrationRecord {
  id: number;
  student_id: number;
  semester_id: number;
  registration_date: string;
  status: string;
  approved_by: number;
  notes: string;
  full_name: string;
  student_id_code: string;
  contact_phone: string;
  branch_id: number;
  semester_name: string;
  academic_year: string;
  approved_by_name: string | null;
}

export default function RegistrationManagement() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'registered' | 'pending_approval' | 'banned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReg, setSelectedReg] = useState<RegistrationRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<number | ''>('');

  useEffect(() => {
    fetchRegistrations();
    fetchSemesters();
  }, [token, filter, selectedSemester]);

  const fetchSemesters = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/semesters', { headers });
      setSemesters(res.data);
      if (res.data.length > 0 && !selectedSemester) {
        const activeSem = res.data.find((s: any) => s.is_active);
        if (activeSem) setSelectedSemester(activeSem.id);
      }
    } catch (err) {
      console.error('Failed to fetch semesters:', err);
    }
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (selectedSemester) params.semester_id = selectedSemester;
      
      const res = await axios.get('/api/semester-registrations', { headers, params });
      setRegistrations(res.data);
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading('approve');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/semester-registrations/${id}/approve`, {}, { headers });
      showToast('Registration approved successfully', 'success');
      fetchRegistrations();
      setSelectedReg(null);
    } catch (err) {
      showToast('Failed to approve registration', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async (id: number) => {
    const reason = prompt('Enter reason for banning this student:');
    if (!reason) return;
    
    setActionLoading('ban');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/semester-registrations/${id}/ban`, { reason }, { headers });
      showToast('Student banned from registration', 'success');
      fetchRegistrations();
      setSelectedReg(null);
    } catch (err) {
      showToast('Failed to ban student', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAllow = async (id: number) => {
    setActionLoading('allow');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/semester-registrations/${id}/allow`, {}, { headers });
      showToast('Student allowed to register', 'success');
      fetchRegistrations();
      setSelectedReg(null);
    } catch (err) {
      showToast('Failed to allow student', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRegs = registrations.filter(r => 
    r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student_id_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.contact_phone?.includes(searchTerm)
  );

  const stats = {
    total: registrations.length,
    registered: registrations.filter(r => r.status === 'registered').length,
    pending: registrations.filter(r => r.status === 'pending_approval').length,
    banned: registrations.filter(r => r.status === 'banned').length
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">Registered</span>;
      case 'pending_approval':
        return <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-full">Pending</span>;
      case 'banned':
        return <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">Banned</span>;
      default:
        return <span className="px-2 py-1 bg-stone-100 text-stone-600 text-xs font-bold rounded-full">{status}</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <CheckCircle className="text-emerald-500" size={18} />;
      case 'pending_approval':
        return <Clock className="text-orange-500" size={18} />;
      case 'banned':
        return <XCircle className="text-red-500" size={18} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm text-stone-500">Total</p>
          <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm text-stone-500">Registered</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.registered}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm text-stone-500">Pending Approval</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm text-stone-500">Banned</p>
          <p className="text-2xl font-bold text-red-600">{stats.banned}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                placeholder="Search student name, ID, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-64"
              />
            </div>

            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value ? Number(e.target.value) : '')}
              className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">All Semesters</option>
              {semesters.map((s: any) => (
                <option key={s.id} value={s.id}>{s.semester_name} ({s.academic_year})</option>
              ))}
            </select>

            <div className="flex gap-2">
              {(['all', 'registered', 'pending_approval', 'banned'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    filter === f 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'registered' ? 'Registered' : f === 'pending_approval' ? 'Pending' : 'Banned'}
                </button>
              ))}
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-sm font-semibold hover:bg-stone-200">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Registration Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredRegs.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <Users size={48} className="mx-auto mb-4 text-stone-300" />
            <p>No registrations found</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Student</th>
                <th className="px-6 py-4 font-semibold">Student ID</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Semester</th>
                <th className="px-6 py-4 font-semibold">Registered Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRegs.map((reg, i) => (
                <tr key={i} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                        {reg.full_name[0]}
                      </div>
                      <span className="font-semibold text-stone-900">{reg.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-stone-600">{reg.student_id_code || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-stone-600">{reg.contact_phone || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-stone-600">{reg.semester_name}</td>
                  <td className="px-6 py-4 text-sm text-stone-500">
                    {reg.registration_date ? new Date(reg.registration_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(reg.status)}
                      {getStatusBadge(reg.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {reg.status === 'pending_approval' && (
                        <button
                          onClick={() => handleApprove(reg.id)}
                          disabled={actionLoading === 'approve'}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Approve"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {reg.status === 'registered' && (
                        <button
                          onClick={() => handleBan(reg.id)}
                          disabled={actionLoading === 'ban'}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Ban"
                        >
                          <Ban size={18} />
                        </button>
                      )}
                      {reg.status === 'banned' && (
                        <button
                          onClick={() => handleAllow(reg.id)}
                          disabled={actionLoading === 'allow'}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Allow"
                        >
                          <Award size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="text-blue-600 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-blue-900">Registration Management</h4>
          <p className="text-sm text-blue-700 mt-1">
            Students who don't register during the open period will be blocked from the system. 
            They must visit the registrar's office to resolve the issue. Use this page to approve or ban students.
          </p>
        </div>
      </div>
    </div>
  );
}