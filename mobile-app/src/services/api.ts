import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens, User, ApiResponse } from '../types';

// Configure your backend URL
// For local development, use your machine's IP address
// For production, use your deployed backend URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:3000/api';

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async initialize() {
    this.accessToken = await SecureStore.getItemAsync('access_token');
    this.refreshToken = await SecureStore.getItemAsync('refresh_token');
  }

  setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    SecureStore.setItemAsync('access_token', tokens.access_token);
    SecureStore.setItemAsync('refresh_token', tokens.refresh_token);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = await this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && this.refreshToken) {
          // Token expired, try to refresh
          const refreshed = await this.refreshAuth();
          if (refreshed) {
            // Retry the request with new token
            return this.request<T>(endpoint, options);
          }
        }
        throw new Error(data.error || data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  private async refreshAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          this.setTokens(data.data);
          return true;
        }
      }
      
      await this.clearTokens();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearTokens();
      return false;
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.request<AuthTokens & { user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.data) {
      this.setTokens(response.data);
      await SecureStore.setItemAsync('user', JSON.stringify(response.data.user));
    }
    
    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    await this.clearTokens();
    await SecureStore.deleteItemAsync('user');
  }

  async getCurrentUser(): Promise<User | null> {
    const userStr = await SecureStore.getItemAsync('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    
    const response = await this.request<User>('/auth/me');
    if (response.data) {
      await SecureStore.setItemAsync('user', JSON.stringify(response.data));
    }
    return response.data || null;
  }

  // Students endpoints
  async getStudents(params?: { branch_id?: number; search?: string }) {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request<any[]>(`/students${queryString}`);
  }

  async getStudentTranscript(studentId: number) {
    return this.request<any>(`/students/${studentId}/transcript`);
  }

  // Courses endpoints
  async getMyCourses() {
    return this.request<any[]>('/my-courses');
  }

  async getAvailableCourses() {
    return this.request<any[]>('/courses/available');
  }

  // Enrollments
  async getEnrollments() {
    return this.request<any[]>('/enrollments');
  }

  async enrollInCourse(courseId: number) {
    return this.request('/enrollments', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    });
  }

  // Exam Schedule
  async getExamSchedule() {
    return this.request<any[]>('/exam-schedule');
  }

  // Assignments
  async getAssignments(courseId?: number) {
    const endpoint = courseId ? `/courses/${courseId}/assignments` : '/assignments';
    return this.request<any[]>(endpoint);
  }

  async submitAssignment(assignmentId: number, fileUri: string, fileType: string) {
    const formData = new FormData();
    formData.append('assignment_id', assignmentId.toString());
    
    const file: any = {
      uri: fileUri,
      type: fileType,
      name: `submission_${Date.now()}.${fileType.split('/')[1]}`,
    };
    formData.append('file', file);

    return this.request('/assignments/submit', {
      method: 'POST',
      body: formData,
    });
  }

  // Payments
  async verifyPayment(reference: string) {
    return this.request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
  }

  async getPaymentHistory() {
    return this.request<any[]>('/payments/history');
  }

  // Announcements
  async getAnnouncements() {
    return this.request<Announcement[]>('/announcements');
  }

  // Profile
  async updateProfile(data: Partial<User>) {
    return this.request<User>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }
}

export const apiService = new ApiService();
export { API_BASE_URL };
