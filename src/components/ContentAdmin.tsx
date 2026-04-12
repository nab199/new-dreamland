import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { 
  Users, Search, Eye, Edit2, Trash2, ChevronLeft, ChevronRight,
  GraduationCap, Phone, MapPin, BookOpen, Award, Calendar, CheckCircle,
  XCircle, AlertCircle, Download, Filter, X, Loader2
} from 'lucide-react';

export default function ContentAdmin() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    program_degree: '',
    student_type: '',
    academic_status: '',
    branch_id: ''
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    if (token) {
      fetchStudents();
      fetchBranches();
    }
  }, [token]);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, filters, students]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/students', { headers });
      setStudents(response.data);
      setFilteredStudents(response.data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      showToast('Failed to load students', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/branches', { headers });
      setBranches(response.data);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const filterStudents = () => {
    let result = [...students];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        (s.student_id_code?.toLowerCase().includes(term)) ||
        (s.full_name?.toLowerCase().includes(term)) ||
        (s.contact_phone?.includes(term)) ||
        (s.email?.toLowerCase().includes(term))
      );
    }

    if (filters.program_degree) {
      result = result.filter(s => s.program_degree === filters.program_degree);
    }
    if (filters.student_type) {
      result = result.filter(s => s.student_type === filters.student_type);
    }
    if (filters.academic_status) {
      result = result.filter(s => s.academic_status === filters.academic_status);
    }
    if (filters.branch_id) {
      result = result.filter(s => s.branch_id === parseInt(filters.branch_id));
    }

    setFilteredStudents(result);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Phone', 'Program', 'Degree', 'Type', 'Status', 'Branch'];
    const rows = filteredStudents.map(s => [
      s.student_id_code || '',
      s.full_name || '',
      s.contact_phone || '',
      s.program_name || '',
      s.program_degree || '',
      s.student_type || '',
      s.academic_status || '',
      s.branch_name || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Students exported successfully!', 'success');
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setIsSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/students/${editingStudent.id}`, editingStudent, { headers });
      showToast('Student updated successfully!', 'success');
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      showToast('Failed to update student: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const clearFilters = () => {
    setFilters({ program_degree: '', student_type: '', academic_status: '', branch_id: '' });
    setSearchTerm('');
  };

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'good_standing': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'academic_probation': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'suspended': 'bg-red-50 text-red-700 border-red-200',
      'expelled': 'bg-red-100 text-red-800 border-red-300',
      'graduated': 'bg-blue-50 text-blue-700 border-blue-200'
    };
    return styles[status] || 'bg-stone-50 text-stone-700 border-stone-200';
  };

  const hasActiveFilters = filters.program_degree || filters.student_type || filters.academic_status || filters.branch_id;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">Student Management</h3>
            <p className="text-sm text-stone-500 mt-1">View and manage all registered students</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm ${
                showFilters || hasActiveFilters 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              <Filter size={16} />
              Filters {hasActiveFilters && <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>}
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-stone-700">Filter Students</h4>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-emerald-600 hover:underline">
                  Clear all filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Program Degree</label>
                <select
                  value={filters.program_degree}
                  onChange={(e) => setFilters({ ...filters, program_degree: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                >
                  <option value="">All Degrees</option>
                  <option value="Degree">Degree</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Short Term">Short Term</option>
                  <option value="Masters">Masters</option>
                  <option value="Certificate">Certificate</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Student Type</label>
                <select
                  value={filters.student_type}
                  onChange={(e) => setFilters({ ...filters, student_type: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                >
                  <option value="">All Types</option>
                  <option value="Regular">Regular</option>
                  <option value="Extension">Extension</option>
                  <option value="Weekend">Weekend</option>
                  <option value="Distance">Distance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Academic Status</label>
                <select
                  value={filters.academic_status}
                  onChange={(e) => setFilters({ ...filters, academic_status: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                >
                  <option value="">All Status</option>
                  <option value="good_standing">Good Standing</option>
                  <option value="academic_probation">Academic Probation</option>
                  <option value="suspended">Suspended</option>
                  <option value="expelled">Expelled</option>
                  <option value="graduated">Graduated</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Branch</label>
                <select
                  value={filters.branch_id}
                  onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search by ID, name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase">
                <th className="px-4 py-3 text-left font-bold">ID</th>
                <th className="px-4 py-3 text-left font-bold">Name</th>
                <th className="px-4 py-3 text-left font-bold">Contact</th>
                <th className="px-4 py-3 text-left font-bold">Program</th>
                <th className="px-4 py-3 text-left font-bold">Type</th>
                <th className="px-4 py-3 text-left font-bold">Status</th>
                <th className="px-4 py-3 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-emerald-600" size={32} />
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-stone-500">
                    No students found
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono text-sm font-bold text-emerald-700">
                      {student.student_id_code || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900">
                      {student.full_name || student.user?.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      <div className="flex items-center gap-1">
                        <Phone size={14} className="text-stone-400" />
                        {student.contact_phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                        {student.program_degree || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {student.student_type || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(student.academic_status)}`}>
                        {student.academic_status?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredStudents.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-100">
            <p className="text-sm text-stone-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-stone-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-100 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-stone-900">Student Details</h3>
                <p className="text-sm text-stone-500">{selectedStudent.student_id_code}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-stone-100 rounded-lg">
                <X size={20} className="text-stone-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <GraduationCap size={32} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-stone-900">
                    {selectedStudent.full_name || selectedStudent.user?.full_name || 'N/A'}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(selectedStudent.academic_status)}`}>
                    {selectedStudent.academic_status?.replace('_', ' ') || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 uppercase">Phone</p>
                  <p className="font-semibold text-stone-900 flex items-center gap-2">
                    <Phone size={14} className="text-stone-400" />
                    {selectedStudent.contact_phone || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 uppercase">Program Degree</p>
                  <p className="font-semibold text-stone-900 flex items-center gap-2">
                    <BookOpen size={14} className="text-stone-400" />
                    {selectedStudent.program_degree || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 uppercase">Student Type</p>
                  <p className="font-semibold text-stone-900">{selectedStudent.student_type || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 uppercase">Branch</p>
                  <p className="font-semibold text-stone-900">{selectedStudent.branch_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 uppercase">Birth Date</p>
                  <p className="font-semibold text-stone-900 flex items-center gap-2">
                    <Calendar size={14} className="text-stone-400" />
                    {selectedStudent.birth_date || selectedStudent.birth_year || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 uppercase">Previous Grade</p>
                  <p className="font-semibold text-stone-900 flex items-center gap-2">
                    <Award size={14} className="text-stone-400" />
                    {selectedStudent.previous_grade || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-stone-500 uppercase">Address</p>
                <p className="text-stone-700 flex items-center gap-2">
                  <MapPin size={14} className="text-stone-400 shrink-0" />
                  {[
                    selectedStudent.birth_place_kebele,
                    selectedStudent.birth_place_woreda,
                    selectedStudent.birth_place_zone,
                    selectedStudent.birth_place_region
                  ].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>

              {selectedStudent.emergency_contact_name && (
                <div className="space-y-2">
                  <p className="text-xs text-stone-500 uppercase">Emergency Contact</p>
                  <p className="text-stone-700">
                    {selectedStudent.emergency_contact_name} - {selectedStudent.emergency_contact_phone || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-100 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">Edit Student</h3>
              <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-stone-100 rounded-lg">
                <X size={20} className="text-stone-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingStudent.full_name || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingStudent.contact_phone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Program Degree</label>
                  <select
                    value={editingStudent.program_degree || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, program_degree: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  >
                    <option value="">Select</option>
                    <option value="Degree">Degree</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Short Term">Short Term</option>
                    <option value="Masters">Masters</option>
                    <option value="Certificate">Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Student Type</label>
                  <select
                    value={editingStudent.student_type || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, student_type: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  >
                    <option value="">Select</option>
                    <option value="Regular">Regular</option>
                    <option value="Extension">Extension</option>
                    <option value="Weekend">Weekend</option>
                    <option value="Distance">Distance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Academic Status</label>
                  <select
                    value={editingStudent.academic_status || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, academic_status: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  >
                    <option value="good_standing">Good Standing</option>
                    <option value="academic_probation">Academic Probation</option>
                    <option value="suspended">Suspended</option>
                    <option value="expelled">Expelled</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Previous Grade</label>
                  <input
                    type="text"
                    value={editingStudent.previous_grade || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, previous_grade: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 rounded-xl font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
