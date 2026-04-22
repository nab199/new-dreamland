import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { 
  Users, Plus, Edit2, Trash2, UserCheck, UserPlus, 
  Shield, Building2, Calculator, BookOpen, X, Check,
  ChevronDown, Search
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: string;
  full_name: string;
  email: string;
  branch_id: number | null;
}

interface Branch {
  id: number;
  name: string;
}

export default function UserManagement() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'faculty',
    branch_id: ''
  });

  const [promoteData, setPromoteData] = useState({
    role: '',
    branch_id: ''
  });

  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, branchesRes] = await Promise.all([
        axios.get('/api/users', { headers }),
        axios.get('/api/branches', { headers })
      ]);
      setUsers(usersRes.data);
      setBranches(branchesRes.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', {
        ...newUser,
        branch_id: newUser.branch_id ? parseInt(newUser.branch_id) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('User created successfully', 'success');
      setIsModalOpen(false);
      setNewUser({ username: '', password: '', full_name: '', email: '', role: 'faculty', branch_id: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create user', 'error');
    }
  };

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await axios.put(`/api/users/${selectedUser.id}/role`, {
        role: promoteData.role,
        branch_id: promoteData.branch_id ? parseInt(promoteData.branch_id) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('User promoted successfully', 'success');
      setIsPromoteModalOpen(false);
      setSelectedUser(null);
      setPromoteData({ role: '', branch_id: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to promote user', 'error');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await axios.delete(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('User deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const openPromoteModal = (user: User) => {
    setSelectedUser(user);
    setPromoteData({ role: user.role, branch_id: user.branch_id?.toString() || '' });
    setIsPromoteModalOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin': return <Shield className="text-purple-600" size={18} />;
      case 'branch_admin': return <Building2 className="text-blue-600" size={18} />;
      case 'faculty': return <BookOpen className="text-orange-600" size={18} />;
      default: return <Users className="text-gray-600" size={18} />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      superadmin: 'bg-purple-100 text-purple-700',
      branch_admin: 'bg-blue-100 text-blue-700',
      faculty: 'bg-orange-100 text-orange-700',
      student: 'bg-gray-100 text-gray-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canPromote = user?.role === 'superadmin';
  const canCreateBranchAdmin = user?.role === 'superadmin';
  const canCreateStaff = user?.role === 'superadmin' || user?.role === 'branch_admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">User Management</h2>
          <p className="text-stone-500 text-sm">Manage staff and faculty accounts</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-stone-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50/50 text-stone-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map((user) => {
                  const branch = branches.find(b => b.id === user.branch_id);
                  return (
                    <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 font-bold">
                            {user.full_name?.[0]}
                          </div>
                          <span className="font-semibold text-stone-900">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600 font-mono">{user.username}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadge(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {branch?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-500">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canPromote && user.role !== 'superadmin' && (
                            <button
                              onClick={() => openPromoteModal(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Promote/Change Role"
                            >
                              <Shield size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">Add New User</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Default: password123"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {canCreateBranchAdmin && <option value="branch_admin">Branch Admin</option>}
                  {canCreateStaff && <option value="accountant">Accountant</option>}
                  {canCreateStaff && <option value="faculty">Faculty</option>}
                </select>
              </div>
              {user?.role === 'superadmin' && (
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Branch</label>
                  <select
                    value={newUser.branch_id}
                    onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
              >
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Promote User Modal */}
      {isPromoteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">Promote User</h3>
              <button onClick={() => setIsPromoteModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handlePromoteUser} className="p-6 space-y-4">
              <div className="bg-stone-50 p-4 rounded-xl">
                <p className="text-sm text-stone-500">Promoting</p>
                <p className="font-bold text-stone-900">{selectedUser.full_name}</p>
                <p className="text-sm text-stone-500">Current: {selectedUser.role.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">New Role</label>
                <select
                  value={promoteData.role}
                  onChange={(e) => setPromoteData({ ...promoteData, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="branch_admin">Branch Admin</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>
              {promoteData.role === 'branch_admin' && (
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Assign Branch</label>
                  <select
                    value={promoteData.branch_id}
                    onChange={(e) => setPromoteData({ ...promoteData, branch_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Confirm Promotion
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
