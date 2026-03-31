import axios from 'axios';

// Get API base URL from environment variable or default to /api for same-origin
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Set base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable credentials for cross-origin requests
  withCredentials: API_BASE_URL !== '/api',
  // Timeout for requests
  timeout: 30000, // 30 seconds
});

// Add request interceptor for auth token and error handling
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dreamland_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache-busting for GET requests when offline
    if (config.method === 'get' && !navigator.onLine) {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout. Please check your connection.');
    }
    
    if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
      console.error('Network error. You may be offline.');
      error.isOffline = true;
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('dreamland_token');
      localStorage.removeItem('dreamland_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export const aiService = {
  /**
   * Predict student grade
   */
  predictGrade: async (studentId: number, courseId: number) => {
    const response = await api.post('/ai/predict-grade', { student_id: studentId, course_id: courseId });
    return response.data;
  },

  /**
   * Get at-risk students report
   */
  getAtRiskStudents: async () => {
    const response = await api.get('/ai/at-risk-students');
    return response.data;
  },

  /**
   * Generate report comment for student
   */
  generateComment: async (data: {
    student_name: string;
    subject: string;
    grade: string;
    strengths: string[];
    weaknesses: string[];
    attendance_rate: number;
    participation: 'high' | 'medium' | 'low';
  }) => {
    const response = await api.post('/ai/generate-comment', data);
    return response.data;
  },

  /**
   * Chat with AI assistant
   */
  chat: async (query: string) => {
    const response = await api.post('/ai/chat', { query });
    return response.data;
  },

  /**
   * Get personalized study tips
   */
  getStudyTips: async (data: {
    learning_style?: 'visual' | 'auditory' | 'kinesthetic';
    weak_subjects?: string[];
    available_hours?: number;
  }) => {
    const response = await api.post('/ai/study-tips', data);
    return response.data;
  },
};

export const parentService = {
  /**
   * Get parent's children
   */
  getMyChildren: async () => {
    const response = await api.get('/parent/my-children');
    return response.data;
  },

  /**
   * Get child's grades
   */
  getChildGrades: async (childId: number) => {
    const response = await api.get(`/parent/child/${childId}/grades`);
    return response.data;
  },

  /**
   * Get child's attendance
   */
  getChildAttendance: async (childId: number) => {
    const response = await api.get(`/parent/child/${childId}/attendance`);
    return response.data;
  },

  /**
   * Get child's financial status
   */
  getChildFinance: async (childId: number) => {
    const response = await api.get(`/parent/child/${childId}/finance`);
    return response.data;
  },

  /**
   * Get child's full report
   */
  getChildReport: async (childId: number) => {
    const response = await api.get(`/parent/child/${childId}/report`);
    return response.data;
  },

  /**
   * Link parent to student (admin only)
   */
  linkStudent: async (data: { parent_user_id: number; student_id: number; relationship: string }) => {
    const response = await api.post('/parent/link-student', data);
    return response.data;
  },

  /**
   * Unlink parent from student (admin only)
   */
  unlinkStudent: async (data: { parent_user_id: number; student_id: number }) => {
    const response = await api.delete('/parent/unlink-student', { data });
    return response.data;
  },
};

export const analyticsService = {
  /**
   * Get enrollment trends
   */
  getEnrollmentTrends: async () => {
    const response = await api.get('/analytics/enrollment-trends');
    return response.data;
  },

  /**
   * Get revenue trends
   */
  getRevenueTrends: async () => {
    const response = await api.get('/analytics/revenue-trends');
    return response.data;
  },

  /**
   * Get program distribution
   */
  getProgramDistribution: async () => {
    const response = await api.get('/analytics/program-distribution');
    return response.data;
  },

  /**
   * Get branch comparison
   */
  getBranchComparison: async () => {
    const response = await api.get('/analytics/branch-comparison');
    return response.data;
  },

  /**
   * Get course performance heatmap
   */
  getCoursePerformance: async () => {
    const response = await api.get('/analytics/course-performance');
    return response.data;
  },

  /**
   * Get dashboard stats
   */
  getDashboardStats: async () => {
    const response = await api.get('/analytics/dashboard-stats');
    return response.data;
  },
};

export const backupService = {
  /**
   * Create backup
   */
  createBackup: async (reason: string = 'manual') => {
    const response = await api.post('/admin/backup', { reason });
    return response.data;
  },

  /**
   * List all backups
   */
  listBackups: async () => {
    const response = await api.get('/admin/backups');
    return response.data;
  },

  /**
   * Restore from backup
   */
  restoreBackup: async (backupFilename: string) => {
    const response = await api.post('/admin/restore', { backup_filename: backupFilename });
    return response.data;
  },

  /**
   * Delete backup
   */
  deleteBackup: async (filename: string) => {
    const response = await api.delete(`/admin/backups/${filename}`);
    return response.data;
  },

  /**
   * Export student data (GDPR)
   */
  exportStudentData: async (studentId: number) => {
    const response = await api.get(`/students/${studentId}/export`);
    return response.data;
  },

  /**
   * Export all data
   */
  exportAllData: async () => {
    window.open('/api/admin/export-all', '_blank');
  },
};

export const studentService = {
  /**
   * Get student financial ledger
   */
  getLedger: async (studentId: number) => {
    const response = await api.get(`/students/${studentId}/ledger`);
    return response.data;
  },

  /**
   * Get digital transcript
   */
  getDigitalTranscript: async (studentId: number) => {
    window.open(`/api/students/${studentId}/transcript-digital`, '_blank');
  },

  /**
   * Delete student data (GDPR - superadmin only)
   */
  deleteStudentData: async (studentId: number) => {
    const response = await api.delete(`/students/${studentId}/data`);
    return response.data;
  },

  /**
   * Auto-enroll students
   */
  autoEnroll: async (data: { semester_id: number; branch_id: number }) => {
    const response = await api.post('/enrollments/auto-enroll', data);
    return response.data;
  },
};

export const notificationService = {
  /**
   * Get user notifications
   */
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  /**
   * Mark all as read
   */
  markAsRead: async () => {
    const response = await api.post('/notifications/read');
    return response.data;
  },

  /**
   * Send notification (admin only)
   */
  sendNotification: async (data: { user_id?: number; role?: string; title: string; message: string }) => {
    const response = await api.post('/notifications/send', data);
    return response.data;
  },
};

export const smsService = {
  /**
   * Send SMS (admin only)
   */
  sendSMS: async (data: { to: string; message: string }) => {
    const response = await api.post('/sms/send', data);
    return response.data;
  },
};

export default api;
