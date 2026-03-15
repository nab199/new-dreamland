import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 📱 MOBILE-TO-BACKEND CONNECTION
 * Update this to your computer's local IP address (e.g., 192.168.x.x)
 * Run 'ipconfig' in your terminal to find your IPv4 Address.
 */
export const SERVER_IP = '192.168.100.125'; 
export const API_BASE_URL = `http://${SERVER_IP}:3000/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('dreamland_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email: string, token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { email, token, newPassword });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },
};

// Students API
export const studentsAPI = {
  getAll: async () => {
    const response = await api.get('/students');
    return response.data;
  },

  getPaginated: async (page: number = 1, limit: number = 25, search: string = '') => {
    const response = await api.get('/students/paginated', { params: { page, limit, search } });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/students', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  getTranscript: async (id: number) => {
    const response = await api.get(`/students/${id}/transcript`);
    return response.data;
  },

  getLedger: async (id: number) => {
    const response = await api.get(`/students/${id}/ledger`);
    return response.data;
  },

  exportData: async (id: number) => {
    const response = await api.get(`/students/${id}/export`);
    return response.data;
  },
};

// AI API
export const aiAPI = {
  predictGrade: async (studentId: number, courseId: number) => {
    const response = await api.post('/ai/predict-grade', { student_id: studentId, course_id: courseId });
    return response.data;
  },

  getAtRiskStudents: async () => {
    const response = await api.get('/ai/at-risk-students');
    return response.data;
  },

  generateComment: async (data: any) => {
    const response = await api.post('/ai/generate-comment', data);
    return response.data;
  },

  chat: async (query: string) => {
    const response = await api.post('/ai/chat', { query });
    return response.data;
  },

  getStudyTips: async (data: any) => {
    const response = await api.post('/ai/study-tips', data);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: async () => {
    const response = await api.get('/analytics/dashboard-stats');
    return response.data;
  },

  getEnrollmentTrends: async () => {
    const response = await api.get('/analytics/enrollment-trends');
    return response.data;
  },

  getRevenueTrends: async () => {
    const response = await api.get('/analytics/revenue-trends');
    return response.data;
  },

  getProgramDistribution: async () => {
    const response = await api.get('/analytics/program-distribution');
    return response.data;
  },

  getBranchComparison: async () => {
    const response = await api.get('/analytics/branch-comparison');
    return response.data;
  },

  getCoursePerformance: async () => {
    const response = await api.get('/analytics/course-performance');
    return response.data;
  },
};

// Parent Portal API
export const parentAPI = {
  getMyChildren: async () => {
    const response = await api.get('/parent/my-children');
    return response.data;
  },

  getChildGrades: async (childId: number) => {
    const response = await api.get(`/parent/child/${childId}/grades`);
    return response.data;
  },

  getChildAttendance: async (childId: number) => {
    const response = await api.get(`/parent/child/${childId}/attendance`);
    return response.data;
  },

  getChildFinance: async (childId: number) => {
    const response = await api.get(`/parent/child/${childId}/finance`);
    return response.data;
  },

  getChildReport: async (childId: number) => {
    const response = await api.get(`/parent/child/${childId}/report`);
    return response.data;
  },
};

// Backup API
export const backupAPI = {
  createBackup: async (reason: string = 'manual') => {
    const response = await api.post('/admin/backup', { reason });
    return response.data;
  },

  listBackups: async () => {
    const response = await api.get('/admin/backups');
    return response.data;
  },

  restoreBackup: async (filename: string) => {
    const response = await api.post('/admin/restore', { backup_filename: filename });
    return response.data;
  },

  deleteBackup: async (filename: string) => {
    const response = await api.delete(`/admin/backups/${filename}`);
    return response.data;
  },

  exportAllData: async () => {
    // For mobile, this would need a different approach
    console.log('Export all data requested');
  },
};

// SMS API
export const smsAPI = {
  sendSMS: async (to: string, message: string) => {
    const response = await api.post('/sms/send', { to, message });
    return response.data;
  },
};

// Payments API
export const paymentsAPI = {
  initialize: async (data: any) => {
    const response = await api.post('/payments/initialize', data);
    return response.data;
  },

  verify: async (data: any) => {
    const response = await api.post('/payments/verify', data);
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/payments');
    return response.data;
  },
};

export default api;
