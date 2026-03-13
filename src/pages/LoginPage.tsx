import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { GraduationCap, Lock, User, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
          <div className="p-8 bg-emerald-600 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <GraduationCap size={32} />
            </div>
            <h1 className="text-2xl font-bold">Dreamland College</h1>
            <p className="text-emerald-100 text-sm mt-1">Management Information System</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">{t('username')}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">{t('password')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-100 disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : t('login')}
              </button>
            </form>
            
            <div className="mt-8 pt-8 border-t border-stone-100 text-center">
              <p className="text-sm text-stone-500 mb-2">
                Forgot password? Contact your branch registrar.
              </p>
              <p className="text-sm text-stone-600">
                Don't have an account? <button onClick={() => navigate('/public-registration')} className="text-emerald-600 font-bold hover:underline">Register here</button>
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-stone-500 hover:text-emerald-600 text-sm font-medium transition-colors"
          >
            ← Back to Public Website
          </button>
        </div>
      </motion.div>
    </div>
  );
}
