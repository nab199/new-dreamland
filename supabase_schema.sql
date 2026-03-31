-- Dreamland College Management System - Supabase (PostgreSQL) Schema
-- Date: March 15, 2026

-- ========================================
-- 1. Extensions & Clean up
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. Tables Definitions
-- ========================================

-- Branches
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    contact TEXT
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- superadmin, branch_admin, faculty, accountant, student, parent
    branch_id INTEGER REFERENCES branches(id),
    full_name TEXT,
    email TEXT UNIQUE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE
);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    duration_years INTEGER,
    total_credits INTEGER
);

-- Students
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    student_id_code TEXT UNIQUE,
    branch_id INTEGER REFERENCES branches(id),
    program_id INTEGER REFERENCES programs(id),
    program_degree TEXT, -- Masters, Certificate, Diploma
    student_type TEXT, -- Regular, Extension, Weekend, Distance
    birth_year INTEGER,
    birth_place_region TEXT,
    birth_place_zone TEXT,
    birth_place_woreda TEXT,
    birth_place_kebele TEXT,
    birth_location TEXT, -- Added from server.ts migration
    contact_phone TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    academic_status TEXT DEFAULT 'good_standing',
    current_semester_id INTEGER,
    documents_json JSONB, -- Postgres uses JSONB for better performance
    financial_clearance INTEGER DEFAULT 0
);

-- Parents
CREATE TABLE IF NOT EXISTS parent_students (
    id SERIAL PRIMARY KEY,
    parent_user_id INTEGER REFERENCES users(id),
    student_id INTEGER REFERENCES students(id),
    relationship TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_user_id, student_id)
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credits INTEGER NOT NULL,
    prerequisites TEXT,
    is_auditable INTEGER DEFAULT 0
);

-- Semesters
CREATE TABLE IF NOT EXISTS semesters (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id),
    academic_year TEXT,
    semester_name TEXT,
    start_date DATE,
    end_date DATE,
    is_active INTEGER DEFAULT 0
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    semester_id INTEGER REFERENCES semesters(id),
    grade TEXT,
    points DECIMAL(5,2),
    status TEXT DEFAULT 'enrolled',
    assignment_grade DECIMAL(5,2),
    midterm_grade DECIMAL(5,2),
    final_grade DECIMAL(5,2),
    is_audit INTEGER DEFAULT 0,
    resolution_deadline TIMESTAMP WITH TIME ZONE
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    amount DECIMAL(12,2),
    type TEXT,
    status TEXT DEFAULT 'pending',
    transaction_ref TEXT,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id),
    title TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Academic Calendars
CREATE TABLE IF NOT EXISTS academic_calendars (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id),
    semester_name TEXT,
    start_date DATE,
    end_date DATE,
    reg_start_date DATE,
    reg_end_date DATE,
    exam_start_date DATE,
    exam_end_date DATE
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token TEXT UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Registration OTPs
CREATE TABLE IF NOT EXISTS registration_otps (
    id SERIAL PRIMARY KEY,
    identifier TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    verified INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fee Structures
CREATE TABLE IF NOT EXISTS fee_structures (
    id SERIAL PRIMARY KEY,
    program_id INTEGER REFERENCES programs(id),
    semester_id INTEGER REFERENCES semesters(id),
    fee_type TEXT,
    amount DECIMAL(12,2)
);

-- Registration Periods
CREATE TABLE IF NOT EXISTS registration_periods (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id),
    semester_id INTEGER REFERENCES semesters(id),
    start_date DATE,
    end_date DATE,
    is_open INTEGER DEFAULT 1,
    description TEXT,
    course_ids TEXT
);

-- Course Offerings
CREATE TABLE IF NOT EXISTS course_offerings (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    semester_id INTEGER REFERENCES semesters(id),
    capacity INTEGER DEFAULT 30
);

-- Course Waitlist
CREATE TABLE IF NOT EXISTS course_waitlist (
    id SERIAL PRIMARY KEY,
    course_offering_id INTEGER REFERENCES course_offerings(id),
    student_id INTEGER REFERENCES students(id),
    position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id),
    name TEXT NOT NULL,
    capacity INTEGER,
    type TEXT
);

-- Course Offerings Faculty
CREATE TABLE IF NOT EXISTS course_offerings_faculty (
    id SERIAL PRIMARY KEY,
    course_offering_id INTEGER REFERENCES course_offerings(id),
    user_id INTEGER REFERENCES users(id),
    role TEXT DEFAULT 'Lecturer'
);

-- Class Schedule
CREATE TABLE IF NOT EXISTS class_schedule (
    id SERIAL PRIMARY KEY,
    course_offering_id INTEGER REFERENCES course_offerings(id),
    room_id INTEGER REFERENCES rooms(id),
    day_of_week INTEGER,
    start_time TEXT,
    end_time TEXT
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES enrollments(id),
    date DATE,
    status TEXT,
    notes TEXT
);

-- Scholarships
CREATE TABLE IF NOT EXISTS scholarships (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    value DECIMAL(12,2)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    semester_id INTEGER REFERENCES semesters(id),
    total_amount DECIMAL(12,2),
    scholarship_id INTEGER REFERENCES scholarships(id),
    balance_due DECIMAL(12,2),
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Course Materials
CREATE TABLE IF NOT EXISTS course_materials (
    id SERIAL PRIMARY KEY,
    course_offering_id INTEGER REFERENCES course_offerings(id),
    title TEXT,
    file_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_offering_id INTEGER REFERENCES course_offerings(id),
    title TEXT,
    description TEXT,
    file_url TEXT,
    deadline TIMESTAMP WITH TIME ZONE
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id),
    student_id INTEGER REFERENCES students(id),
    file_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    grade DECIMAL(5,2),
    feedback TEXT
);

-- System Settings (for storing API keys, integrations, etc.)
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    category TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Semester Registrations (tracks student registration per semester)
CREATE TABLE IF NOT EXISTS semester_registrations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    semester_id INTEGER NOT NULL REFERENCES semesters(id),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'registered',
    approved_by INTEGER REFERENCES users(id),
    notes TEXT,
    UNIQUE(student_id, semester_id)
);

-- ========================================
-- 3. Initial Seed Data
-- ========================================

-- Insert Branches
INSERT INTO branches (name, location, contact) VALUES 
('Addis Ababa Main', 'Addis Ababa, 4 Kilo', '+251111223344'),
('Adama Branch', 'Adama, City Center', '+251221112233');

-- Insert Admin User (Password is 'admin123' hashed with bcrypt)
INSERT INTO users (username, password, role, full_name, email) VALUES 
('admin', '$2a$10$8K1p/j/S.A0Vv8B8lBvS.O9j3z7p4q3m1g5.5u5v5w5x5y5z5', 'superadmin', 'System Administrator', 'admin@dreamland.edu');

-- Additional Demo Users (Passwords: user+123, e.g., registrar123)
-- These use a placeholder hash for 'registrar123', 'accountant123', 'faculty123'
INSERT INTO users (username, password, role, full_name, email) VALUES 
('registrar', '$2a$10$8K1p/j/S.A0Vv8B8lBvS.O9j3z7p4q3m1g5.5u5v5w5x5y5z5', 'registrar', 'Branch Registrar', 'registrar@dreamland.edu'),
('accountant', '$2a$10$8K1p/j/S.A0Vv8B8lBvS.O9j3z7p4q3m1g5.5u5v5w5x5y5z5', 'accountant', 'Senior Accountant', 'accountant@dreamland.edu'),
('faculty', '$2a$10$8K1p/j/S.A0Vv8B8lBvS.O9j3z7p4q3m1g5.5u5v5w5x5y5z5', 'faculty', 'Dr. Jane Smith', 'faculty@dreamland.edu');

-- Insert Programs
INSERT INTO programs (name, code, duration_years, total_credits) VALUES 
('Computer Science', 'CS', 4, 147),
('Accounting & Finance', 'ACC', 3, 110);

-- Insert Courses
INSERT INTO courses (code, title, credits) VALUES 
('CS101', 'Introduction to Programming', 3),
('CS102', 'Data Structures', 4);

-- Insert Semester
INSERT INTO semesters (branch_id, academic_year, semester_name, is_active) VALUES 
(1, '2016 E.C.', 'Semester I', 1);

-- Insert Registration Period
INSERT INTO registration_periods (branch_id, semester_id, start_date, end_date, is_open) VALUES 
(1, 1, '2024-01-01', '2026-12-31', 1);

-- Insert Course Offerings
INSERT INTO course_offerings (course_id, semester_id, capacity) VALUES 
(1, 1, 50),
(2, 1, 40);

-- Insert Rooms
INSERT INTO rooms (branch_id, name, capacity, type) VALUES 
(1, 'Hall A1', 60, 'Lecture Hall'),
(1, 'Lab B2', 30, 'Computer Lab');

-- Insert Faculty Assignments
INSERT INTO course_offerings_faculty (course_offering_id, user_id, role) VALUES 
(1, 1, 'Lecturer');

-- Insert Schedules
INSERT INTO class_schedule (course_offering_id, room_id, day_of_week, start_time, end_time) VALUES 
(1, 1, 1, '08:30', '10:30'),
(2, 2, 2, '14:00', '16:00');

-- Insert Scholarships
INSERT INTO scholarships (name, type, value) VALUES 
('Merit Scholarship', 'Percentage', 50.0),
('Financial Aid', 'Fixed', 2000.0);

-- ========================================
-- 4. Security Indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_registration_otps_identifier ON registration_otps(identifier);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
