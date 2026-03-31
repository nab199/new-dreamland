export interface User {
  id: number;
  username: string;
  role: 'superadmin' | 'branch_admin' | 'faculty' | 'student' | 'accountant' | 'registrar';
  full_name: string;
  email?: string;
  branch_id?: number;
}

export interface Student {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  birth_location?: string;
  address: string;
  branch_id: number;
  program_degree?: string;
  enrollment_year: number;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
}

export interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
  program?: string;
  semester_id?: number;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  semester_id: number;
  grade?: string;
  status: 'enrolled' | 'completed' | 'withdrawn' | 'failed';
  course?: Course;
}

export interface ExamSchedule {
  id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  exam_date: string;
  exam_time: string;
  room: string;
  seat_number: string;
}

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string;
  due_date: string;
  submitted?: boolean;
  submission_date?: string;
  grade?: string;
}

export interface Payment {
  id: number;
  student_id: number;
  amount: number;
  payment_type: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_date: string;
  reference?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
  branch_id?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}
