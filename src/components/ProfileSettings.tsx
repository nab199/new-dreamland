import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Save, X, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

export default function ProfileSettings() {
  const { user, updateProfile, token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.new_password) {
      if (formData.new_password.length < 8) {
        newErrors.new_password = 'Password must be at least 8 characters';
      }
      if (!/[A-Z]/.test(formData.new_password)) {
        newErrors.new_password = 'Password must contain an uppercase letter';
      }
      if (!/[a-z]/.test(formData.new_password)) {
        newErrors.new_password = 'Password must contain a lowercase letter';
      }
      if (!/[0-9]/.test(formData.new_password)) {
        newErrors.new_password = 'Password must contain a number';
      }
      if (formData.new_password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const payload: any = {
        full_name: formData.full_name,
        email: formData.email,
      };

      if (formData.new_password) {
        payload.current_password = formData.current_password;
        payload.new_password = formData.new_password;
      }

      const response = await axios.put('/api/auth/profile', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      updateProfile(response.data.user);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }));
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setErrors({});
    setMessage(null);
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Profile Settings</h2>
            <p className="text-sm text-stone-500 mt-1">Manage your account information</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              Edit Profile
            </button>
          ) : null}
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              <User size={16} className="inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={!isEditing || isLoading}
              className={`w-full px-4 py-3 bg-stone-50 border rounded-xl text-sm transition-colors ${
                errors.full_name
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-stone-200 focus:border-emerald-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              placeholder="Enter your full name"
            />
            {errors.full_name && (
              <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              <Mail size={16} className="inline mr-2" />
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing || isLoading}
              className={`w-full px-4 py-3 bg-stone-50 border rounded-xl text-sm transition-colors ${
                errors.email
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-stone-200 focus:border-emerald-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              placeholder="your.email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Change Password Section */}
          {isEditing && (
            <>
              <div className="pt-6 border-t border-stone-200">
                <h3 className="text-sm font-bold text-stone-700 mb-4">
                  <Lock size={16} className="inline mr-2" />
                  Change Password
                </h3>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.current_password}
                    onChange={(e) =>
                      setFormData({ ...formData, current_password: e.target.value })
                    }
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-emerald-500 transition-colors"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.new_password}
                  onChange={(e) =>
                    setFormData({ ...formData, new_password: e.target.value })
                  }
                  disabled={isLoading}
                  className={`w-full px-4 py-3 bg-stone-50 border rounded-xl text-sm focus:border-emerald-500 transition-colors ${
                    errors.new_password ? 'border-red-300' : 'border-stone-200'
                  }`}
                  placeholder="Enter new password"
                />
                {errors.new_password && (
                  <p className="mt-1 text-xs text-red-600">{errors.new_password}</p>
                )}
                {formData.new_password && (
                  <div className="mt-2 text-xs text-stone-500">
                    <p className={formData.new_password.length >= 8 ? 'text-emerald-600' : ''}>
                      • At least 8 characters
                    </p>
                    <p className={/[A-Z]/.test(formData.new_password) ? 'text-emerald-600' : ''}>
                      • One uppercase letter
                    </p>
                    <p className={/[a-z]/.test(formData.new_password) ? 'text-emerald-600' : ''}>
                      • One lowercase letter
                    </p>
                    <p className={/[0-9]/.test(formData.new_password) ? 'text-emerald-600' : ''}>
                      • One number
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) =>
                    setFormData({ ...formData, confirm_password: e.target.value })
                  }
                  disabled={isLoading}
                  className={`w-full px-4 py-3 bg-stone-50 border rounded-xl text-sm focus:border-emerald-500 transition-colors ${
                    errors.confirm_password ? 'border-red-300' : 'border-stone-200'
                  }`}
                  placeholder="Confirm new password"
                />
                {errors.confirm_password && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirm_password}</p>
                )}
              </div>
            </>
          )}

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          )}
        </form>

        {/* Account Info */}
        <div className="mt-8 pt-6 border-t border-stone-200">
          <h3 className="text-sm font-bold text-stone-700 mb-4">Account Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-xl">
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-1">
                Username
              </p>
              <p className="text-sm font-semibold text-stone-900">{user?.username}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl">
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-1">
                Role
              </p>
              <p className="text-sm font-semibold text-stone-900 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
