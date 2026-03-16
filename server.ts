import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import { CBEVerificationService } from './src/services/payment/cbeVerificationService';
import { authConfig } from './src/config/AuthConfig';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { parse } from 'csv-parse/sync';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
dotenv.config({ path: '.env.local' });

const cbeVerifier = new CBEVerificationService();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: "uploads/" });

const db = new Database("college.db");

// Audit logging helper
function logAction(userId: number | null, action: string, details: any) {
  try {
    db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)").run(
      userId, action, JSON.stringify(details)
    );
  } catch (e) {
    console.error("Audit logging failed:", e);
  }
}

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many login attempts, please try again later." }
});

const publicRegLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 registrations per hour
  message: { error: "Too many registration attempts, please try again later." }
});

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    contact TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- superadmin, branch_admin, faculty, accountant, student, parent
    branch_id INTEGER,
    full_name TEXT,
    email TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    student_id_code TEXT UNIQUE, -- e.g., AA-2024-0001
    branch_id INTEGER,
    program_id INTEGER,
    program_degree TEXT, -- Masters, Certificate, Diploma
    student_type TEXT, -- Regular, Extension, Weekend, Distance
    birth_year INTEGER,
    birth_place_region TEXT,
    birth_place_zone TEXT,
    birth_place_woreda TEXT,
    birth_place_kebele TEXT,
    contact_phone TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    academic_status TEXT DEFAULT 'good_standing', -- good_standing, probation, suspended
    current_semester_id INTEGER,
    documents_json TEXT, -- JSON string of document URLs
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS parent_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_user_id INTEGER,
    student_id INTEGER,
    relationship TEXT, -- father, mother, guardian
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_user_id) REFERENCES users(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE(parent_user_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    duration_years INTEGER,
    total_credits INTEGER
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credits INTEGER NOT NULL,
    prerequisites TEXT, -- Comma separated codes
    is_auditable INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    academic_year TEXT, -- e.g., 2016 E.C.
    semester_name TEXT, -- e.g., Semester I
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    course_id INTEGER,
    semester_id INTEGER,
    grade TEXT, -- A, B, C, D, F, NG
    points REAL,
    status TEXT DEFAULT 'enrolled', -- enrolled, dropped, withdrawn
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    amount REAL,
    type TEXT, -- tuition, registration, etc.
    status TEXT DEFAULT 'pending', -- pending, paid, verified
    transaction_ref TEXT,
    payment_method TEXT, -- chapa, cbe_receipt
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS academic_calendars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    semester_name TEXT,
    start_date TEXT,
    end_date TEXT,
    reg_start_date TEXT,
    reg_end_date TEXT,
    exam_start_date TEXT,
    exam_end_date TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    token TEXT UNIQUE,
    expires_at DATETIME,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS registration_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS fee_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER,
    semester_id INTEGER,
    fee_type TEXT, -- tuition, registration, library, lab
    amount REAL,
    FOREIGN KEY (program_id) REFERENCES programs(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
  );
`);

// Add new columns to students if they don't exist
try {
  db.prepare("ALTER TABLE students ADD COLUMN birth_location TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE students ADD COLUMN program_degree TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE students ADD COLUMN financial_clearance INTEGER DEFAULT 0").run();
} catch (e) {}

// Migrations for users table security enhancements
try {
  db.prepare("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN locked_until TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
} catch (e) {}

// Add grade columns to enrollments if they don't exist
try {
  db.prepare("ALTER TABLE enrollments ADD COLUMN assignment_grade REAL").run();
  db.prepare("ALTER TABLE enrollments ADD COLUMN midterm_grade REAL").run();
  db.prepare("ALTER TABLE enrollments ADD COLUMN final_grade REAL").run();
  db.prepare("ALTER TABLE enrollments ADD COLUMN is_audit INTEGER DEFAULT 0").run();
  db.prepare("ALTER TABLE enrollments ADD COLUMN resolution_deadline TEXT").run();
} catch (e) {
  // Columns likely already exist
}

// Create new tables
db.exec(`
  CREATE TABLE IF NOT EXISTS registration_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    semester_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    is_open INTEGER DEFAULT 1,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
  );

  CREATE TABLE IF NOT EXISTS course_offerings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    semester_id INTEGER,
    capacity INTEGER DEFAULT 30,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (semester_id) REFERENCES semesters(id)
  );

  CREATE TABLE IF NOT EXISTS course_waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_offering_id INTEGER,
    student_id INTEGER,
    position INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    name TEXT NOT NULL,
    capacity INTEGER,
    type TEXT, -- Lecture Hall, Lab, Seminar Room
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS course_offerings_faculty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_offering_id INTEGER,
    user_id INTEGER, -- faculty user_id
    role TEXT DEFAULT 'Lecturer',
    FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS class_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_offering_id INTEGER,
    room_id INTEGER,
    day_of_week INTEGER, -- 0 (Sun) to 6 (Sat)
    start_time TEXT, -- HH:MM
    end_time TEXT, -- HH:MM
    FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER,
    date TEXT, -- YYYY-MM-DD
    status TEXT, -- Present, Absent, Late, Excused
    notes TEXT,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
  );

  -- Finance & Scholarships
  CREATE TABLE IF NOT EXISTS scholarships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT, -- Percentage, Fixed
    value REAL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    semester_id INTEGER,
    total_amount REAL,
    scholarship_id INTEGER,
    balance_due REAL,
    status TEXT DEFAULT 'Pending', -- Pending, Paid, Partial
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (scholarship_id) REFERENCES scholarships(id)
  );

  -- LMS: Course Materials & Assignments
  CREATE TABLE IF NOT EXISTS course_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_offering_id INTEGER,
    title TEXT,
    file_url TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_offering_id INTEGER,
    title TEXT,
    description TEXT,
    file_url TEXT,
    deadline DATETIME,
    FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER,
    student_id INTEGER,
    file_url TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    grade REAL,
    feedback TEXT,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
  );
`);

// Seed initial data if empty
const branchCount = db.prepare("SELECT COUNT(*) as count FROM branches").get() as { count: number };
if (branchCount.count === 0) {
  db.prepare("INSERT INTO branches (name, location, contact) VALUES (?, ?, ?)").run("Addis Ababa Main", "Addis Ababa, 4 Kilo", "+251111223344");
  db.prepare("INSERT INTO branches (name, location, contact) VALUES (?, ?, ?)").run("Adama Branch", "Adama, City Center", "+251221112233");
  
  const adminPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)").run("admin", adminPassword, "superadmin", "System Administrator", "admin@dreamland.edu");
  
  db.prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)").run("registrar", bcrypt.hashSync("registrar123", 10), "registrar", "Branch Registrar", "registrar@dreamland.edu");
  db.prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)").run("accountant", bcrypt.hashSync("accountant123", 10), "accountant", "Senior Accountant", "accountant@dreamland.edu");
  db.prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)").run("faculty", bcrypt.hashSync("faculty123", 10), "faculty", "Dr. Jane Smith", "faculty@dreamland.edu");
  
  db.prepare("INSERT INTO programs (name, code, duration_years, total_credits) VALUES (?, ?, ?, ?)").run("Computer Science", "CS", 4, 147);
  db.prepare("INSERT INTO programs (name, code, duration_years, total_credits) VALUES (?, ?, ?, ?)").run("Accounting & Finance", "ACC", 3, 110);

  db.prepare("INSERT INTO courses (code, title, credits) VALUES (?, ?, ?)").run("CS101", "Introduction to Programming", 3);
  db.prepare("INSERT INTO courses (code, title, credits) VALUES (?, ?, ?)").run("CS102", "Data Structures", 4);

  // Seed Semester & Registration Period
  const semResult = db.prepare("INSERT INTO semesters (branch_id, academic_year, semester_name, is_active) VALUES (?, ?, ?, ?)").run(1, "2016 E.C.", "Semester I", 1);
  db.prepare("INSERT INTO registration_periods (branch_id, semester_id, start_date, end_date, is_open) VALUES (?, ?, ?, ?, ?)").run(1, semResult.lastInsertRowid, "2024-01-01", "2026-12-31", 1);
  
  // Seed Course Offerings
  db.prepare("INSERT INTO course_offerings (course_id, semester_id, capacity) VALUES (?, ?, ?)").run(1, semResult.lastInsertRowid, 50);
  db.prepare("INSERT INTO course_offerings (course_id, semester_id, capacity) VALUES (?, ?, ?)").run(2, semResult.lastInsertRowid, 40);

  // Seed Rooms
  db.prepare("INSERT INTO rooms (branch_id, name, capacity, type) VALUES (?, ?, ?, ?)").run(1, "Hall A1", 60, "Lecture Hall");
  db.prepare("INSERT INTO rooms (branch_id, name, capacity, type) VALUES (?, ?, ?, ?)").run(1, "Lab B2", 30, "Computer Lab");

  // Seed Faculty Assignments (Assigning the admin as faculty for demo purposes if no other user exists)
  db.prepare("INSERT INTO course_offerings_faculty (course_offering_id, user_id, role) VALUES (?, ?, ?)").run(1, 1, "Lecturer");

  // Seed Schedules
  db.prepare("INSERT INTO class_schedule (course_offering_id, room_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)").run(1, 1, 1, "08:30", "10:30"); // Mon 8:30-10:30
  db.prepare("INSERT INTO class_schedule (course_offering_id, room_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)").run(2, 2, 2, "14:00", "16:00"); // Tue 14:00-16:00

  // Seed Scholarships
  db.prepare("INSERT INTO scholarships (name, type, value) VALUES (?, ?, ?)").run("Merit Scholarship", "Percentage", 50.0);
  db.prepare("INSERT INTO scholarships (name, type, value) VALUES (?, ?, ?)").run("Financial Aid", "Fixed", 2000.0);
}

import cron from 'node-cron';
import { AfroMessageService } from './src/services/messaging/afroMessageService';
import { EmailService } from './src/services/messaging/emailService';
import { AIService } from './src/services/ai/aiService';
import { BackupService } from './src/services/backup/backupService';
import { ChapaService } from './src/services/payment/chapaService';

// Initialize services
const afroMessage = new AfroMessageService({
  apiKey: process.env.AFROMESSAGE_API_KEY,
  senderId: process.env.AFROMESSAGE_SENDER_ID || 'Dreamland'
});

// Initialize Email Service (Using Resend - Modern Email API)
const emailService = new EmailService({
  enabled: process.env.EMAIL_ENABLED === 'true',
  provider: (process.env.EMAIL_PROVIDER as 'resend' | 'smtp') || 'resend',
  resendApiKey: process.env.RESEND_API_KEY,
  fromName: process.env.EMAIL_FROM_NAME || 'Dreamland College',
  fromAddress: process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'
});

const aiService = new AIService();
const backupService = new BackupService();

// Initialize Chapa Payment Service
const chapa = new ChapaService({
  secretKey: process.env.CHAPA_SECRET_KEY,
  publicKey: process.env.CHAPA_PUBLIC_KEY,
  webhookSecret: process.env.CHAPA_WEBHOOK_SECRET
});

// Daily Cron Job at 08:00
cron.schedule('0 8 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];

  // 1. Registration Day Reminders
  const regPeriods = db.prepare("SELECT * FROM registration_periods WHERE end_date = ? AND is_open = 1").all(today) as any[];
  for (const period of regPeriods) {
    const students = db.prepare("SELECT s.phone, s.full_name FROM students s JOIN enrollments e ON s.id = e.student_id WHERE e.semester_id = ?").all(period.semester_id) as any[];
    for (const student of students) {
      await afroMessage.sendSMS(student.phone, `Dear ${student.full_name}, today is the last day for registration. Please complete your payment.`);
    }
  }

  // 2. End of Course Reminders
  const coursesEnding = db.prepare("SELECT c.title, e.student_id FROM enrollments e JOIN courses c ON e.course_id = c.id JOIN academic_calendars ac ON e.semester_id = ac.id WHERE ac.end_date = ?").all(today) as any[];
  for (const record of coursesEnding) {
    const student = db.prepare("SELECT phone, full_name FROM students WHERE id = ?").get(record.student_id) as any;
    if (student) {
      await afroMessage.sendSMS(student.phone, `Dear ${student.full_name}, your course ${record.title} is ending today. Please ensure all payments are settled.`);
    }
  }
});

// Daily Backup at 02:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled database backup...');
  const result = await backupService.createBackup('scheduled_daily');
  if (result.success) {
    console.log('Daily backup completed successfully');
  } else {
    console.error('Daily backup failed:', result.error);
  }
});

// Weekly At-Risk Student Report (Monday 09:00)
cron.schedule('0 9 * * 1', async () => {
  console.log('Generating weekly at-risk student report...');
  const students = db.prepare(`
    SELECT s.*, u.full_name, u.email, 
           (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.id AND e.grade = 'F') as failed_courses
    FROM students s
    JOIN users u ON s.user_id = u.id
  `).all() as any[];

  const atRiskStudents = await aiService.identifyAtRiskStudents(students);
  
  if (atRiskStudents.length > 0) {
    // Notify admins
    const admins = db.prepare("SELECT email FROM users WHERE role = 'superadmin'").all() as any[];
    for (const admin of admins) {
      console.log(`At-risk report sent to: ${admin.email}`);
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  // Security middleware
  app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for dev (Vite injects scripts)
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));

  // Environment validation
  const JWT_SECRET = authConfig.jwtSecret;

  // Public API Routes
  app.get("/api/public/branches", (req, res) => {
    const branches = db.prepare("SELECT * FROM branches").all();
    res.json(branches);
  });

  app.get("/api/public/programs", (req, res) => {
    const programs = db.prepare("SELECT * FROM programs").all();
    res.json(programs);
  });

  // OTP Verification for Registration
  app.post("/api/public/send-otp", async (req, res) => {
    const { identifier, type, full_name } = req.body; // identifier: phone or email, type: 'phone' or 'email'
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    try {
      // Store OTP
      db.prepare("INSERT INTO registration_otps (identifier, code, expires_at) VALUES (?, ?, ?)").run(identifier, code, expiresAt);
      
      if (type === 'phone') {
        const message = `🎓 Dreamland College Registration\n\nYour verification code is: ${code}\n\nDo not share this code with anyone.`;
        await afroMessage.sendSMS(identifier, message);
      } else {
        await emailService.sendNotification(
          identifier, 
          '🎓 Dreamland College Verification', 
          `Hello ${full_name || 'Student'},\n\nYour verification code for registration is: ${code}\n\nThis code will expire in 10 minutes.`
        );
      }
      
      res.json({ success: true, message: `OTP sent to ${identifier}` });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    }
  });

  app.post("/api/public/verify-otp", (req, res) => {
    const { identifier, code } = req.body;
    const now = new Date().toISOString();
    
    const record = db.prepare(`
      SELECT * FROM registration_otps 
      WHERE identifier = ? AND code = ? AND verified = 0 AND expires_at > ?
      ORDER BY created_at DESC LIMIT 1
    `).get(identifier, code, now) as any;

    if (record) {
      db.prepare("UPDATE registration_otps SET verified = 1 WHERE id = ?").run(record.id);
      res.json({ success: true, message: 'Verified successfully' });
    } else {
      res.status(400).json({ error: 'Invalid or expired verification code' });
    }
  });

  app.post("/api/public/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.post("/api/public/register-student", publicRegLimiter, async (req, res) => {
    const { 
      full_name, birth_year, region, zone, woreda, kebele, 
      phone, email, emergency_name, emergency_phone,
      program_id, program_degree, student_type, branch_id, 
      diploma_url, transcript_url, id_card_url, portrait_url, password
    } = req.body;

    const hashedPassword = await bcrypt.hash(password || "password123", 10);

    // Generate Student ID: BRANCH-YEAR-SEQUENCE
    const branch = db.prepare("SELECT name FROM branches WHERE id = ?").get(branch_id) as any;
    const branchCode = branch ? branch.name.substring(0, 2).toUpperCase() : 'XX';
    const year = new Date().getFullYear();
    const count = db.prepare("SELECT COUNT(*) as count FROM students").get() as { count: number };
    const student_id_code = `${branchCode}-${year}-${String(count.count + 1).padStart(4, '0')}`;

    try {
      // Create user first
      const userResult = db.prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)").run(
        email, hashedPassword, "student", full_name, email
      );

      // Create student
      const studentResult = db.prepare(`
        INSERT INTO students (
          user_id, student_id_code, branch_id, program_id, program_degree, student_type, 
          birth_year, birth_place_region, birth_place_zone, birth_place_woreda, birth_place_kebele,
          contact_phone, emergency_contact_name, emergency_contact_phone, documents_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userResult.lastInsertRowid, student_id_code, branch_id, program_id, program_degree, student_type,
        birth_year, region, zone, woreda, kebele,
        phone, emergency_name, emergency_phone, JSON.stringify({ diploma_url, transcript_url, id_card_url, portrait_url })
      );

      logAction(null, "STUDENT_PUBLIC_REG", { email, student_id_code });
      res.json({ id: studentResult.lastInsertRowid, student_id_code });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Academic Status Update Logic
  const updateAcademicStatus = (student_id: number) => {
    const enrollments = db.prepare("SELECT * FROM enrollments WHERE student_id = ? AND grade IS NOT NULL AND is_audit = 0").all(student_id) as any[];
    if (enrollments.length === 0) return;

    const failedCourses = enrollments.filter(e => e.grade === 'F').length;
    const totalPoints = enrollments.reduce((sum, e) => sum + (e.points || 0), 0);
    const gpa = totalPoints / enrollments.length;

    let status = 'good_standing';
    if (failedCourses > 2 || gpa < 1.5) {
      status = 'probation';
    }
    // Add logic for suspension if needed

    db.prepare("UPDATE students SET academic_status = ? WHERE id = ?").run(status, student_id);
    logAction(null, "ACADEMIC_STATUS_UPDATE", { student_id, status });
  };

  // Check for expired Incomplete grades
  const checkExpiredIncompleteGrades = () => {
    const now = new Date().toISOString();
    const expired = db.prepare("SELECT * FROM enrollments WHERE grade = 'I' AND resolution_deadline < ?").all(now) as any[];
    for (const e of expired) {
      db.prepare("UPDATE enrollments SET grade = 'F' WHERE id = ?").run(e.id);
      updateAcademicStatus(e.student_id);
    }
  };
  setInterval(checkExpiredIncompleteGrades, 24 * 60 * 60 * 1000); // Check daily

  // Registration Eligibility Check
  const isEligibleForRegistration = (student_id: number) => {
    const student = db.prepare("SELECT academic_status FROM students WHERE id = ?").get(student_id) as any;
    return student.academic_status !== 'probation' && student.academic_status !== 'suspended';
  };

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const authorize = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      }
      next();
    };
  };

  // AI Chat Bot
  app.post("/api/ai/chat", authenticate, async (req, res) => {
    const { message } = req.body;
    try {
      const response = await aiService.chatbotResponse(message);
      res.json({ response });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // System Status for Admins
  app.get("/api/admin/system-status", authenticate, authorize(['superadmin']), async (req, res) => {
    const status = {
      database: { status: 'online', type: 'SQLite' },
      ai: { 
        status: process.env.GEMINI_API_KEY ? 'configured' : 'missing_key',
        provider: 'Google Gemini'
      },
      sms: {
        status: process.env.AFROMESSAGE_API_KEY && process.env.AFROMESSAGE_API_KEY !== 'demo_key' ? 'configured' : 'demo_mode',
        provider: 'AfroMessage'
      },
      email: {
        status: process.env.RESEND_API_KEY ? 'configured' : 'console_only',
        provider: 'Resend'
      },
      payment: {
        chapa: process.env.CHAPA_SECRET_KEY ? 'configured' : 'missing_key',
        cbe_ocr: 'simulation_active' 
      },
      storage: {
        uploads: fs.existsSync(path.join(__dirname, 'uploads')) ? 'writable' : 'error',
        backups: fs.existsSync(path.join(__dirname, 'src', 'backups')) ? 'writable' : 'error'
      }
    };
    res.json(status);
  });

  // AI Diagnostics
  app.get("/api/diagnostics/ai", authenticate, authorize(['superadmin']), async (req, res) => {
    try {
      const testResponse = await aiService.chatbotResponse("Hello, are you connected and working correctly?");
      const config = {
        hasKey: !!process.env.GEMINI_API_KEY,
        keyPrefix: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 5)}...` : 'none',
        response: testResponse
      };
      res.json({ status: 'success', config });
    } catch (error: any) {
      res.status(500).json({ status: 'error', error: error.message });
    }
  });

  // API Routes
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { username, password, rememberMe } = req.body;
    console.log(`[AUTH] Login attempt for username: ${username}`);
    const user = db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get(username, username) as any;

    if (!user) {
      console.log(`[AUTH] User not found: ${username}`);
    }

    if (user && await bcrypt.compare(password, user.password)) {
      console.log(`[AUTH] Password match for user: ${username}`);
      // Check if account is locked (too many failed attempts)
      const failedAttempts = db.prepare("SELECT failed_login_attempts, locked_until FROM users WHERE id = ?").get(user.id) as any;
      if (failedAttempts?.locked_until && new Date(failedAttempts.locked_until) > new Date()) {
        logAction(user.id, "LOGIN_ATTEMPT_LOCKED", { username });
        return res.status(423).json({ error: "Account is temporarily locked. Please try again later." });
      }

      // Reset failed attempts on successful login
      if (failedAttempts?.failed_login_attempts > 0) {
        db.prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?").run(user.id);
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, branch_id: user.branch_id }, JWT_SECRET, { expiresIn: '8h' });
      const refreshToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      
      logAction(user.id, "LOGIN_SUCCESS", { username, rememberMe });
      res.json({ 
        token, 
        refreshToken: rememberMe ? refreshToken : undefined,
        user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, branch_id: user.branch_id, email: user.email } 
      });
    } else {
      // Increment failed login attempts
      const failedUser = db.prepare("SELECT id, failed_login_attempts FROM users WHERE username = ? OR email = ?").get(username, username) as any;
      if (failedUser) {
        const newAttempts = (failedUser.failed_login_attempts || 0) + 1;
        const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // Lock for 15 min after 5 attempts
        
        db.prepare("UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?").run(
          newAttempts, 
          lockUntil ? lockUntil.toISOString() : null, 
          failedUser.id
        );
        
        if (lockUntil) {
          logAction(null, "ACCOUNT_LOCKED", { username, attempts: newAttempts });
          return res.status(423).json({ error: "Too many failed attempts. Account locked for 15 minutes." });
        }
      }
      
      logAction(null, "LOGIN_FAILURE", { username });
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Token Refresh Endpoint
  app.post("/api/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    try {
      const decoded: any = jwt.verify(refreshToken, JWT_SECRET);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id) as any;
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const newToken = jwt.sign({ id: user.id, username: user.username, role: user.role, branch_id: user.branch_id }, JWT_SECRET, { expiresIn: '8h' });
      
      res.json({ token: newToken, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, branch_id: user.branch_id } });
    } catch (e) {
      res.status(401).json({ error: "Invalid refresh token" });
    }
  });

  // Logout Endpoint
  app.post("/api/auth/logout", authenticate, (req, res) => {
    const { reason } = req.body;
    logAction((req as any).user.id, "LOGOUT", { reason });
    res.json({ message: "Logged out successfully" });
  });

  // Password Reset Request
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: "If the email exists, a reset link has been sent" });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, token, expiresAt);

    // TODO: Send email with reset link
    // For now, log the token (in production, send via email)
    console.log(`Password reset link for ${email}: /reset-password?token=${token}`);
    
    logAction(user.id, "PASSWORD_RESET_REQUEST", { email });
    res.json({ message: "If the email exists, a reset link has been sent" });
  });

  // Password Reset
  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    
    const resetToken = db.prepare(`
      SELECT * FROM password_reset_tokens 
      WHERE token = ? AND used = 0 AND expires_at > ?
    `).get(token, new Date().toISOString()) as any;
    
    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, resetToken.user_id);
    db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(resetToken.id);
    
    logAction(resetToken.user_id, "PASSWORD_RESET_SUCCESS", {});
    res.json({ message: "Password reset successfully" });
  });

  // Get Current User Profile
  app.get("/api/auth/me", authenticate, (req, res) => {
    const user = db.prepare("SELECT id, username, role, full_name, email, branch_id FROM users WHERE id = ?").get((req as any).user.id) as any;
    res.json(user);
  });

  // Update User Profile
  app.put("/api/auth/profile", authenticate, async (req, res) => {
    const { full_name, email, current_password, new_password } = req.body;
    const userId = (req as any).user.id;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (full_name) {
      updates.push("full_name = ?");
      values.push(full_name);
    }
    
    if (email) {
      // Check if email is already taken
      const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, userId) as any;
      if (existing) {
        return res.status(400).json({ error: "Email already in use" });
      }
      updates.push("email = ?");
      values.push(email);
    }
    
    if (new_password) {
      const user = db.prepare("SELECT password FROM users WHERE id = ?").get(userId) as any;
      if (!await bcrypt.compare(current_password, user.password)) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      updates.push("password = ?");
      values.push(await bcrypt.hash(new_password, 10));
    }
    
    if (updates.length > 0) {
      values.push(userId);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      logAction(userId, "PROFILE_UPDATE", { full_name, email });
    }
    
    const updatedUser = db.prepare("SELECT id, username, role, full_name, email, branch_id FROM users WHERE id = ?").get(userId) as any;
    res.json({ message: "Profile updated", user: updatedUser });
  });

  // Branch Management (Superadmin only)
  app.get("/api/branches", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { role, branch_id } = (req as any).user;
    if (role === 'superadmin') {
      const branches = db.prepare("SELECT * FROM branches").all();
      return res.json(branches);
    }
    const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branch_id);
    res.json([branch]);
  });

  app.post("/api/branches", authenticate, authorize(['superadmin']), (req, res) => {
    const { name, location, contact } = req.body;
    const result = db.prepare("INSERT INTO branches (name, location, contact) VALUES (?, ?, ?)").run(name, location, contact);
    logAction((req as any).user.id, "BRANCH_CREATE", { name });
    res.json({ id: result.lastInsertRowid, name, location, contact });
  });

  // Student Management
  app.get("/api/students", authenticate, authorize(['superadmin', 'branch_admin', 'faculty', 'accountant', 'registrar']), (req, res) => {
    const { branch_id, role } = (req as any).user;
    let students;
    if (role === 'superadmin') {
      students = db.prepare(`
        SELECT s.*, u.full_name, u.username, b.name as branch_name, p.name as program_name 
        FROM students s 
        JOIN users u ON s.user_id = u.id 
        JOIN branches b ON s.branch_id = b.id
        LEFT JOIN programs p ON s.program_id = p.id
      `).all();
    } else {
      students = db.prepare(`
        SELECT s.*, u.full_name, u.username, b.name as branch_name, p.name as program_name 
        FROM students s 
        JOIN users u ON s.user_id = u.id 
        JOIN branches b ON s.branch_id = b.id
        LEFT JOIN programs p ON s.program_id = p.id
        WHERE s.branch_id = ?
      `).all(branch_id);
    }
    res.json(students);
  });

  app.get("/api/students/:id/transcript", authenticate, (req, res) => {
    const studentId = req.params.id;
    const student = db.prepare(`
      SELECT s.*, u.full_name, p.name as program_name, b.name as branch_name 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      JOIN programs p ON s.program_id = p.id 
      JOIN branches b ON s.branch_id = b.id 
      WHERE s.id = ?
    `).get(studentId) as any;

    if (!student) return res.status(404).json({ error: "Student not found" });

    const grades = db.prepare(`
      SELECT e.*, c.title as course_name, c.code as course_code, c.credits, sem.semester_name 
      FROM enrollments e 
      JOIN courses c ON e.course_id = c.id 
      JOIN semesters sem ON e.semester_id = sem.id 
      WHERE e.student_id = ? AND e.grade IS NOT NULL
    `).all(studentId) as any[];

    // Generate simple HTML transcript
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 30px; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { bg-color: #f5f5f5; }
            .footer { margin-top: 50px; text-align: right; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DREAMLAND COLLEGE</h1>
            <h2>OFFICIAL ACADEMIC TRANSCRIPT</h2>
          </div>
          <div class="info">
            <div>
              <p><strong>Name:</strong> ${student.full_name}</p>
              <p><strong>Student ID:</strong> ${student.student_id_code}</p>
            </div>
            <div>
              <p><strong>Program:</strong> ${student.program_name}</p>
              <p><strong>Branch:</strong> ${student.branch_name}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Semester</th>
                <th>Course Code</th>
                <th>Course Title</th>
                <th>Credits</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${grades.map(g => `
                <tr>
                  <td>${g.semester_name}</td>
                  <td>${g.course_code}</td>
                  <td>${g.course_name}</td>
                  <td>${g.credits}</td>
                  <td>${g.grade}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Registrar Signature: _________________________</p>
          </div>
        </body>
      </html>
    `;
    res.send(html);
  });

  app.post("/api/students", authenticate, authorize(['superadmin', 'branch_admin']), async (req, res) => {
    const { 
      full_name, birth_year, region, zone, woreda, kebele, 
      phone, email, emergency_name, emergency_phone,
      program_id, program_degree, student_type, branch_id, status, password
    } = req.body;

    const hashedPassword = await bcrypt.hash(password || "password123", 10);

    // Generate Student ID: BRANCH-YEAR-SEQUENCE
    const branch = db.prepare("SELECT name FROM branches WHERE id = ?").get(branch_id) as any;
    const branchCode = branch.name.substring(0, 2).toUpperCase();
    const year = new Date().getFullYear();
    const count = db.prepare("SELECT COUNT(*) as count FROM students").get() as { count: number };
    const student_id_code = `${branchCode}-${year}-${String(count.count + 1).padStart(4, '0')}`;

    try {
      // Create user first
      const userResult = db.prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)").run(
        email, hashedPassword, "student", full_name, email
      );

      // Create student
      const studentResult = db.prepare(`
        INSERT INTO students (
          user_id, student_id_code, branch_id, program_id, program_degree, student_type, 
          birth_year, birth_place_region, birth_place_zone, birth_place_woreda, birth_place_kebele,
          contact_phone, emergency_contact_name, emergency_contact_phone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userResult.lastInsertRowid, student_id_code, branch_id, program_id, program_degree, student_type,
        birth_year, region, zone, woreda, kebele,
        phone, emergency_name, emergency_phone, status
      );

      logAction((req as any).user.id, "STUDENT_CREATE", { email, student_id_code });
      res.json({ id: studentResult.lastInsertRowid, student_id_code });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/students/bulk-upload", authenticate, authorize(['superadmin', 'branch_admin']), upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true }) as any[];

      const results = [];
      for (const record of records) {
        const { full_name, email, phone, branch_id, program_id, program_degree, student_type } = record;
        const hashedPassword = await bcrypt.hash("password123", 10);

        // Generate Student ID
        const branch = db.prepare("SELECT name FROM branches WHERE id = ?").get(branch_id) as any;
        const branchCode = branch ? branch.name.substring(0, 2).toUpperCase() : 'XX';
        const year = new Date().getFullYear();
        const count = db.prepare("SELECT COUNT(*) as count FROM students").get() as { count: number };
        const student_id_code = `${branchCode}-${year}-${String(count.count + 1).padStart(4, '0')}`;

        try {
          const userResult = db.prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)").run(
            email, hashedPassword, "student", full_name, email
          );

          db.prepare(`
            INSERT INTO students (user_id, student_id_code, branch_id, program_id, program_degree, student_type, contact_phone) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(userResult.lastInsertRowid, student_id_code, branch_id, program_id, program_degree || null, student_type, phone);

          results.push({ email, status: 'success', student_id_code });
        } catch (e: any) {
          results.push({ email, status: 'error', error: e.message });
        }
      }

      logAction((req as any).user.id, "STUDENT_BULK_UPLOAD", { count: records.length });
      res.json({ results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    } finally {
      if (req.file) fs.unlinkSync(req.file.path);
    }
  });

  // Student Enrollment
  app.post("/api/enrollments", authenticate, authorize(['student']), (req, res) => {
    const { course_offering_id, is_audit } = req.body;
    const student_id = (req as any).user.id;

    // Check registration period
    const period = db.prepare("SELECT * FROM registration_periods WHERE is_open = 1").get() as any;
    if (!period) return res.status(400).json({ error: "Registration is closed" });

    // Check capacity
    const offering = db.prepare("SELECT * FROM course_offerings WHERE id = ?").get(course_offering_id) as any;
    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(offering.course_id) as any;
    
    if (is_audit && !course.is_auditable) {
      return res.status(400).json({ error: "Course is not auditable" });
    }

    const enrolledCount = db.prepare("SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND semester_id = ?").get(offering.course_id, offering.semester_id) as { count: number };
    
    if (enrolledCount.count >= offering.capacity) {
      // Add to waitlist
      const waitlistCount = db.prepare("SELECT COUNT(*) as count FROM course_waitlist WHERE course_offering_id = ?").get(course_offering_id) as { count: number };
      db.prepare("INSERT INTO course_waitlist (course_offering_id, student_id, position) VALUES (?, ?, ?)").run(course_offering_id, student_id, waitlistCount.count + 1);
      return res.json({ message: "Course full, added to waitlist" });
    }

    // Check prerequisites (only if not auditing)
    if (!is_audit && course.prerequisites) {
      const prereqs = course.prerequisites.split(',');
      for (const prereq of prereqs) {
        const completed = db.prepare("SELECT grade FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.student_id = ? AND c.code = ? AND e.grade != 'F'").get(student_id, prereq.trim());
        if (!completed) return res.status(400).json({ error: `Prerequisite ${prereq} not met` });
      }
    }

    db.prepare("INSERT INTO enrollments (student_id, course_id, semester_id, is_audit) VALUES (?, ?, ?, ?)").run(student_id, offering.course_id, offering.semester_id, is_audit ? 1 : 0);
    logAction((req as any).user.id, "COURSE_ENROLL", { course_offering_id, is_audit });
    res.json({ message: "Enrolled successfully" });
  });

  app.get("/api/enrollments", authenticate, authorize(['student']), (req, res) => {
    const student_id = (req as any).user.id;
    const enrollments = db.prepare(`
      SELECT e.*, c.title as course_name, c.code as course_code 
      FROM enrollments e 
      JOIN courses c ON e.course_id = c.id 
      WHERE e.student_id = (SELECT id FROM students WHERE user_id = ?)
    `).all(student_id);
    res.json(enrollments);
  });

  // Student Withdrawal
  app.post("/api/enrollments/withdraw", authenticate, authorize(['student']), (req, res) => {
    const { enrollment_id } = req.body;
    const student_id = (req as any).user.id;
    
    const enrollment = db.prepare("SELECT * FROM enrollments WHERE id = ? AND student_id = (SELECT id FROM students WHERE user_id = ?)").get(enrollment_id, student_id) as any;
    if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });
    
    db.prepare("UPDATE enrollments SET status = 'withdrawn' WHERE id = ?").run(enrollment_id);
    logAction((req as any).user.id, "COURSE_WITHDRAW", { enrollment_id });
    
    // Trigger waitlist promotion
    const nextWaitlist = db.prepare("SELECT * FROM course_waitlist WHERE course_offering_id = ? ORDER BY position ASC LIMIT 1").get(enrollment.course_id) as any;
    if (nextWaitlist) {
      db.prepare("INSERT INTO enrollments (student_id, course_id, semester_id) VALUES (?, ?, ?)").run(nextWaitlist.student_id, enrollment.course_id, enrollment.semester_id);
      db.prepare("DELETE FROM course_waitlist WHERE id = ?").run(nextWaitlist.id);
    }
    
    res.json({ message: "Withdrawn successfully" });
  });

  // Faculty Grade Entry
  app.post("/api/enrollments/grades", authenticate, authorize(['faculty', 'superadmin']), (req, res) => {
    const { enrollment_id, assignment_grade, midterm_grade, final_grade } = req.body;
    
    // Check if student is cleared for FINAL grade visibility (Optional: Business rule)
    // Here we allow ENTRY, but we might restrict student viewing later.

    const points = (assignment_grade * 0.2) + (midterm_grade * 0.3) + (final_grade * 0.5);
    let grade = 'F';
    if (points >= 90) grade = 'A';
    else if (points >= 80) grade = 'B';
    else if (points >= 70) grade = 'C';
    else if (points >= 60) grade = 'D';
    
    db.prepare("UPDATE enrollments SET assignment_grade = ?, midterm_grade = ?, final_grade = ?, points = ?, grade = ? WHERE id = ?").run(assignment_grade, midterm_grade, final_grade, points, grade, enrollment_id);
    logAction((req as any).user.id, "GRADE_ENTRY", { enrollment_id, grade });
    res.json({ message: "Grades updated successfully" });
  });

  // Bulk Grade Finalization and SMS Distribution
  app.post("/api/enrollments/bulk-finalize", authenticate, authorize(['faculty', 'superadmin']), async (req, res) => {
    const { course_id, semester_id } = req.body;
    
    try {
      // 1. Get all enrollments for this course and semester
      const enrollments = db.prepare(`
        SELECT e.id, e.student_id, e.points, e.grade, s.contact_phone, s.financial_clearance, u.full_name, c.title as course_name
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE e.course_id = ? AND e.semester_id = ? AND e.grade IS NOT NULL
      `).all(course_id, semester_id) as any[];

      if (enrollments.length === 0) {
        return res.status(404).json({ error: "No graded enrollments found for this course." });
      }

      const results = {
        total: enrollments.length,
        sms_sent: 0,
        blocked_due_to_finance: 0,
        errors: [] as string[]
      };

      // 2. Distribute reports via SMS
      for (const e of enrollments) {
        try {
          if (!e.financial_clearance) {
             results.blocked_due_to_finance++;
             continue; // Don't send SMS if not cleared
          }

          const message = `Dear ${e.full_name}, your final grade for ${e.course_name} is: ${e.grade}. - Dreamland College`;
          if (e.contact_phone) {
            await afroMessage.sendSMS(e.contact_phone, message);
            results.sms_sent++;
          }
          
          updateAcademicStatus(e.student_id);
        } catch (smsErr: any) {
          results.errors.push(`Failed to send SMS to ${e.full_name}: ${smsErr.message}`);
        }
      }

      logAction((req as any).user.id, "BULK_GRADE_FINALIZE", { course_id, semester_id, count: enrollments.length });
      res.json({ message: "Bulk grade reports processed.", results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Registration Periods Management
  app.get("/api/registration-periods/current", authenticate, (req, res) => {
    const period = db.prepare("SELECT * FROM registration_periods WHERE is_open = 1 ORDER BY id DESC LIMIT 1").get() as any;
    res.json({ isOpen: !!period, period: period || null });
  });

  app.post("/api/registration-periods", authenticate, authorize(['superadmin']), (req, res) => {
    const { branch_id, semester_id, start_date, end_date } = req.body;
    db.prepare("INSERT INTO registration_periods (branch_id, semester_id, start_date, end_date) VALUES (?, ?, ?, ?)").run(branch_id, semester_id, start_date, end_date);
    logAction((req as any).user.id, "REG_PERIOD_CREATE", { branch_id, semester_id });
    res.json({ message: "Registration period defined" });
  });


  // Available Courses
  app.get("/api/courses/available", authenticate, authorize(['student']), (req, res) => {
    const courses = db.prepare("SELECT co.*, c.title, c.code, c.is_auditable FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE co.semester_id = (SELECT id FROM semesters WHERE is_active = 1)").all();
    res.json(courses);
  });

  // Payment Verification
  app.post("/api/payments/verify", authenticate, authorize(['student']), async (req, res) => {
  const { reference, last8Digits, student_id } = req.body;

  const result = await cbeVerifier.verify(reference, last8Digits);

  if (result.success) {
    // Mark fee paid in database
    db.prepare("INSERT INTO payments (student_id, amount, status, transaction_ref, payment_method) VALUES (?, ?, ?, ?, ?)").run(student_id, result.amount, 'verified', reference, 'cbe_receipt');
    logAction((req as any).user.id, "PAYMENT_VERIFY", { reference, amount: result.amount });

    // Get student details
    const student = db.prepare(`
      SELECT s.phone, s.full_name, u.email 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.id = ?
    `).get(student_id) as any;
    
    if (student) {
      // Send SMS
      try {
        await afroMessage.sendSMS(
          student.phone, 
          `✅ Payment Confirmed!\n\nDear ${student.full_name},\nYour payment of ${result.amount} ETB has been verified successfully.\n\nRef: ${reference}\n\nThank you! - Dreamland College`
        );
        console.log(`✅ Payment SMS sent to ${student.phone}`);
      } catch (smsError) {
        console.error('❌ Payment SMS failed:', smsError);
      }
      
      // Send Email
      try {
        await emailService.sendPaymentConfirmation(
          student.email,
          student.full_name,
          result.amount,
          reference
        );
        console.log(`✅ Payment email sent to ${student.email}`);
      } catch (emailError) {
        console.error('❌ Payment email failed:', emailError);
      }
    }

    res.json({ message: "Payment verified successfully", amount: result.amount });
  } else {
    res.status(400).json({ error: result.error });
  }
});

  // Academic Calendars
  app.get("/api/academic-calendars", authenticate, (req, res) => {
    const calendars = db.prepare(`
      SELECT ac.*, b.name as branch_name 
      FROM academic_calendars ac 
      JOIN branches b ON ac.branch_id = b.id
    `).all();
    res.json(calendars);
  });

  // Integration Settings (Superadmin only) - Service Status
  app.get("/api/settings/integrations", authenticate, authorize(['superadmin']), (req, res) => {
    res.json({
      afromessage: {
        configured: !!process.env.AFROMESSAGE_API_KEY && process.env.AFROMESSAGE_API_KEY !== 'demo_key',
        sender_id: process.env.AFROMESSAGE_SENDER_ID || 'Dreamland'
      },
      chapa: {
        configured: !!process.env.CHAPA_SECRET_KEY && !process.env.CHAPA_SECRET_KEY.includes('REPLACE'),
        public_key_set: !!process.env.CHAPA_PUBLIC_KEY
      },
      cbe_verifier: {
        configured: !!process.env.CBE_VERIFIER_URL && process.env.CBE_VERIFIER_URL !== 'http://localhost:5001',
        url: process.env.CBE_VERIFIER_URL || 'Not configured'
      },
      email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        provider: process.env.EMAIL_PROVIDER || 'resend',
        configured: !!process.env.RESEND_API_KEY
      }
    });
  });

  // File Upload
  app.post("/api/upload", authenticate, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
  app.use("/uploads", express.static(uploadDir));

  app.get("/api/programs", authenticate, (req, res) => {
    const programs = db.prepare("SELECT * FROM programs").all();
    res.json(programs);
  });

  app.get("/api/announcements", authenticate, (req, res) => {
    const announcements = db.prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5").all();
    res.json(announcements);
  });

  // Analytics
  app.get("/api/analytics/dashboard-stats", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const enrollmentStats = db.prepare(`
      SELECT b.name as branch, COUNT(s.id) as count 
      FROM branches b 
      LEFT JOIN students s ON b.id = s.branch_id 
      GROUP BY b.id
    `).all();

    const paymentStats = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total 
      FROM payments 
      WHERE status = 'verified' 
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `).all();

    const programStats = db.prepare(`
      SELECT p.name as program, COUNT(s.id) as count 
      FROM programs p 
      LEFT JOIN students s ON p.id = s.program_id 
      GROUP BY p.id
    `).all();

    res.json({ enrollmentStats, paymentStats, programStats });
  });

  // SMS Sending Endpoint (Real AfroMessage Integration)
  app.post("/api/sms/send", authenticate, authorize(['superadmin', 'branch_admin', 'accountant']), async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await afroMessage.sendSMS(to, message);
    
    if (result.success) {
      logAction((req as any).user.id, "SMS_SENT", { to, messageId: result.messageId });
      res.json({ success: true, message: 'SMS sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to send SMS' });
    }
  });

  // Bulk SMS Endpoint
  app.post("/api/sms/send-bulk", authenticate, authorize(['superadmin', 'branch_admin']), async (req, res) => {
    const { phoneNumbers, message } = req.body;

    if (!Array.isArray(phoneNumbers) || !message) {
      return res.status(400).json({ error: 'Phone numbers array and message are required' });
    }

    const result = await afroMessage.sendBulkSMS(phoneNumbers, message);
    
    if (result.success) {
      logAction((req as any).user.id, "BULK_SMS_SENT", { count: phoneNumbers.length });
      res.json({ success: true, message: `SMS sent to ${phoneNumbers.length} recipients` });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to send bulk SMS' });
    }
  });

  // Chapa Payment Initialization (Real Integration)
  app.post("/api/payments/initialize", authenticate, authorize(['superadmin', 'branch_admin', 'student', 'accountant']), async (req, res) => {
    const { amount, email, first_name, last_name, phone_number, callback_url, return_url, customization } = req.body;
    
    if (!amount || !email || !first_name) {
      return res.status(400).json({ error: 'Amount, email, and first name are required' });
    }

    const tx_ref = chapa.generateTxRef('TX');
    
    const paymentData = {
      amount: amount.toString(),
      currency: 'ETB',
      email,
      first_name,
      last_name: last_name || '',
      phone_number: phone_number || '',
      tx_ref,
      callback_url: callback_url || `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/callback`,
      return_url: return_url || `${process.env.APP_URL || 'http://localhost:3000'}/payment-success`,
      customization: customization || {
        title: 'Dreamland College Payment',
        description: 'Tuition fee payment'
      }
    };

    const result = await chapa.initializePayment(paymentData);
    
    if (result.status === 'success' && result.data?.checkout_url) {
      // Store pending payment in database
      const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get((req as any).user.id) as any;
      if (student) {
        db.prepare(`
          INSERT INTO payments (student_id, amount, status, transaction_ref, payment_method)
          VALUES (?, ?, 'pending', ?, 'chapa')
        `).run(student.id, amount, tx_ref);
      }
      
      logAction((req as any).user.id, "PAYMENT_INITIALIZED", { tx_ref, amount });
      res.json(result);
    } else {
      res.status(500).json({ error: result.message || 'Failed to initialize payment' });
    }
  });

  // Chapa Payment Callback
  app.get("/api/payments/callback", async (req, res) => {
    const { tx_ref, status } = req.query;
    
    if (!tx_ref) {
      return res.status(400).json({ error: 'Transaction reference required' });
    }

    const txRef = Array.isArray(tx_ref) ? tx_ref[0] : tx_ref;

    // Verify payment with Chapa
    const verification = await chapa.verifyPayment(txRef as string);
    
    if (verification.status === 'success' && verification.data?.status === 'success') {
      // Update payment status in database
      const payment = db.prepare("SELECT * FROM payments WHERE transaction_ref = ?").get(txRef) as any;
      
      if (payment) {
        db.prepare("UPDATE payments SET status = 'verified' WHERE transaction_ref = ?").run(txRef);
        
        // Get student details for notification
        const student = db.prepare(`
          SELECT s.phone, s.full_name, u.email
          FROM students s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ?
        `).get(payment.student_id) as any;

        if (student) {
          // Send SMS notification
          await afroMessage.sendSMS(
            student.phone,
            `✅ Payment Confirmed!\n\nDear ${student.full_name},\nYour payment of ${verification.data.amount} ETB has been verified successfully.\n\nRef: ${txRef}\n\nThank you! - Dreamland College`
          );

          // Send email notification
          await emailService.sendPaymentConfirmation(
            student.email,
            student.full_name,
            verification.data.amount,
            txRef
          );
        }

        logAction(null, "PAYMENT_VERIFIED", { tx_ref: String(txRef), amount: verification.data.amount });
      }

      // Redirect to success page
      res.redirect(`/payment-success?tx_ref=${txRef}&status=success`);
    } else {
      res.redirect(`/payment-success?tx_ref=${txRef}&status=failed`);
    }
  });

  // Chapa Webhook (for asynchronous payment notifications)
  app.post("/api/payments/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-chapa-signature'] as string;
    const payload = req.body.toString();
    
    // Verify webhook signature
    if (!chapa.verifyWebhookSignature(payload, signature)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const eventData = JSON.parse(payload);
    
    if (eventData.status === 'success') {
      const tx_ref = eventData.tx_ref;
      
      // Update payment in database
      const payment = db.prepare("SELECT * FROM payments WHERE transaction_ref = ?").get(tx_ref) as any;
      
      if (payment && payment.status !== 'verified') {
        db.prepare("UPDATE payments SET status = 'verified' WHERE transaction_ref = ?").run(tx_ref);
        
        // Get student details for notification
        const student = db.prepare(`
          SELECT s.phone, s.full_name, u.email
          FROM students s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ?
        `).get(payment.student_id) as any;

        if (student) {
          await afroMessage.sendSMS(
            student.phone,
            `✅ Payment Confirmed!\n\nDear ${student.full_name},\nYour payment of ${eventData.amount} ETB has been verified.\n\nRef: ${tx_ref}`
          );

          await emailService.sendPaymentConfirmation(
            student.email,
            student.full_name,
            eventData.amount,
            tx_ref
          );
        }

        logAction(null, "PAYMENT_WEBHOOK_VERIFIED", { tx_ref, amount: eventData.amount });
      }
    }

    res.json({ received: true });
  });

  // CBE Receipt Verification (Real Integration)
  app.post("/api/payments/verify-cbe", authenticate, async (req, res) => {
    const { reference, last8Digits } = req.body;
    
    if (!reference || !last8Digits) {
      return res.status(400).json({ error: 'Reference and last 8 digits are required' });
    }

    const result = await cbeVerifier.verify(reference, last8Digits);
    
    if (result.success) {
      const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get((req as any).user.id) as any;
      
      if (student) {
        db.prepare(`
          INSERT INTO payments (student_id, amount, status, transaction_ref, payment_method)
          VALUES (?, ?, 'verified', ?, 'cbe_receipt')
        `).run(student.id, result.amount, reference);

        // Get student details for notification
        const studentDetails = db.prepare(`
          SELECT s.phone, s.full_name, u.email
          FROM students s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ?
        `).get(student.id) as any;

        if (studentDetails) {
          await afroMessage.sendSMS(
            studentDetails.phone,
            `✅ Payment Confirmed!\n\nDear ${studentDetails.full_name},\nYour payment of ${result.amount} ETB has been verified successfully.\n\nRef: ${reference}\n\nThank you! - Dreamland College`
          );

          await emailService.sendPaymentConfirmation(
            studentDetails.email,
            studentDetails.full_name,
            result.amount,
            reference
          );
        }
      }

      logAction((req as any).user.id, "PAYMENT_CBE_VERIFIED", { reference, amount: result.amount });
      res.json({ verified: true, amount: result.amount, date: result.date });
    } else {
      res.status(400).json({ verified: false, error: result.error });
    }
  });

  // ==========================================
  // ENTERPRISE ENDPOINTS
  // ==========================================

  // --- Password Change (Authenticated) ---
  app.post("/api/auth/change-password", authenticate, async (req, res) => {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get((req as any).user.id) as any;
    if (!user || !await bcrypt.compare(old_password, user.password)) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, user.id);
    logAction(user.id, "PASSWORD_CHANGE", {});
    res.json({ message: "Password changed successfully" });
  });

  // --- Password Reset Request (Public) ---
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user) return res.json({ message: "If the email exists, a reset code has been sent." }); // Don't reveal
    
    const token = uuidv4().substring(0, 8).toUpperCase(); // 8-char reset code
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    db.prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expiresAt);
    
    // Send via SMS
    const student = db.prepare("SELECT contact_phone FROM students WHERE user_id = ?").get(user.id) as any;
    if (student?.contact_phone) {
      try {
        await afroMessage.sendSMS(
          student.contact_phone, 
          `🔐 Dreamland College Password Reset\n\nYour reset code is: ${token}\n\nValid for 1 hour.\n\nIf you didn't request this, contact support immediately.`
        );
        console.log(`✅ SMS sent to ${student.contact_phone}`);
      } catch (smsError) {
        console.error('❌ SMS failed:', smsError);
      }
    }
    
    // Send via Email
    try {
      await emailService.sendPasswordResetEmail(email, token, user.full_name || 'User');
      console.log(`✅ Email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
    }
    
    // Also log to console for testing
    console.log(`\n🔑 PASSWORD RESET CODE\n━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 User: ${user.full_name}`);
    console.log(`🔢 Code: ${token}`);
    console.log(`⏰ Expires: ${expiresAt}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━\n`);
    
    logAction(null, "PASSWORD_RESET_REQUEST", { email, userId: user.id });
    res.json({ 
      message: "If the email exists, a reset code has been sent.",
      // In production, remove this debug info
      debug: process.env.NODE_ENV === 'development' ? { code: token } : undefined
    });
  });

  // --- Password Reset Confirm ---
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, token, new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user) return res.status(400).json({ error: "Invalid request" });
    const resetToken = db.prepare("SELECT * FROM password_reset_tokens WHERE user_id = ? AND token = ? AND used = 0 AND expires_at > ?").get(user.id, token, new Date().toISOString()) as any;
    if (!resetToken) return res.status(400).json({ error: "Invalid or expired reset code" });
    const hashed = await bcrypt.hash(new_password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, user.id);
    db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(resetToken.id);
    logAction(user.id, "PASSWORD_RESET_COMPLETE", {});
    res.json({ message: "Password reset successfully. You can now log in." });
  });

  // --- Student Update (PUT) ---
  app.put("/api/students/:id", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), (req, res) => {
    const studentId = req.params.id;
    const { full_name, birth_year, birth_place_region, birth_place_zone, birth_place_woreda, birth_place_kebele, contact_phone, emergency_contact_name, emergency_contact_phone, student_type, program_id, program_degree, academic_status, status } = req.body;
    try {
      db.prepare(`UPDATE students SET birth_year = ?, birth_place_region = ?, birth_place_zone = ?, birth_place_woreda = ?, birth_place_kebele = ?, contact_phone = ?, emergency_contact_name = ?, emergency_contact_phone = ?, student_type = ?, program_id = ?, program_degree = ?, academic_status = ? WHERE id = ?`).run(
        birth_year, birth_place_region, birth_place_zone, birth_place_woreda, birth_place_kebele, contact_phone, emergency_contact_name, emergency_contact_phone, student_type, program_id, program_degree, academic_status || 'good_standing', studentId
      );
      if (full_name) {
        const student = db.prepare("SELECT user_id FROM students WHERE id = ?").get(studentId) as any;
        if (student) {
          db.prepare("UPDATE users SET full_name = ? WHERE id = ?").run(full_name, student.user_id);
        }
      }
      logAction((req as any).user.id, "STUDENT_UPDATE", { studentId });
      res.json({ message: "Student updated successfully" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- Student Delete ---
  app.delete("/api/students/:id", authenticate, authorize(['superadmin']), (req, res) => {
    const student = db.prepare("SELECT user_id FROM students WHERE id = ?").get(req.params.id) as any;
    if (!student) return res.status(404).json({ error: "Student not found" });
    db.prepare("DELETE FROM enrollments WHERE student_id = ?").run(req.params.id);
    db.prepare("DELETE FROM payments WHERE student_id = ?").run(req.params.id);
    db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(student.user_id);
    logAction((req as any).user.id, "STUDENT_DELETE", { studentId: req.params.id });
    res.json({ message: "Student deleted" });
  });

  // --- Paginated Student List ---
  app.get("/api/students/paginated", authenticate, authorize(['superadmin', 'branch_admin', 'faculty', 'accountant', 'registrar']), (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;
    const { branch_id, role } = (req as any).user;

    let whereClause = role === 'superadmin' ? '' : 'WHERE s.branch_id = ?';
    const params: any[] = role === 'superadmin' ? [] : [branch_id];

    if (search) {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` (u.full_name LIKE ? OR s.student_id_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const total = (db.prepare(`SELECT COUNT(*) as count FROM students s JOIN users u ON s.user_id = u.id ${whereClause}`).get(...params) as any).count;
    const students = db.prepare(`
      SELECT s.*, u.full_name, u.username, b.name as branch_name, p.name as program_name 
      FROM students s JOIN users u ON s.user_id = u.id JOIN branches b ON s.branch_id = b.id LEFT JOIN programs p ON s.program_id = p.id
      ${whereClause} ORDER BY s.id DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ students, total, page, limit, totalPages: Math.ceil(total / limit) });
  });

  // --- Academic Calendar CRUD ---
  app.post("/api/academic-calendars", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { branch_id, semester_name, start_date, end_date, reg_start_date, reg_end_date, exam_start_date, exam_end_date } = req.body;
    const result = db.prepare("INSERT INTO academic_calendars (branch_id, semester_name, start_date, end_date, reg_start_date, reg_end_date, exam_start_date, exam_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(branch_id, semester_name, start_date, end_date, reg_start_date, reg_end_date, exam_start_date, exam_end_date);
    logAction((req as any).user.id, "CALENDAR_CREATE", { semester_name });
    res.json({ id: result.lastInsertRowid, message: "Calendar created" });
  });

  app.put("/api/academic-calendars/:id", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { semester_name, start_date, end_date, reg_start_date, reg_end_date, exam_start_date, exam_end_date } = req.body;
    db.prepare("UPDATE academic_calendars SET semester_name = ?, start_date = ?, end_date = ?, reg_start_date = ?, reg_end_date = ?, exam_start_date = ?, exam_end_date = ? WHERE id = ?").run(semester_name, start_date, end_date, reg_start_date, reg_end_date, exam_start_date, exam_end_date, req.params.id);
    res.json({ message: "Calendar updated" });
  });

  app.delete("/api/academic-calendars/:id", authenticate, authorize(['superadmin']), (req, res) => {
    db.prepare("DELETE FROM academic_calendars WHERE id = ?").run(req.params.id);
    res.json({ message: "Calendar deleted" });
  });

  // --- Announcement CRUD ---
  app.post("/api/announcements", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { branch_id, title, content } = req.body;
    const result = db.prepare("INSERT INTO announcements (branch_id, title, content) VALUES (?, ?, ?)").run(branch_id, title, content);
    logAction((req as any).user.id, "ANNOUNCEMENT_CREATE", { title });
    res.json({ id: result.lastInsertRowid, message: "Announcement created" });
  });

  app.put("/api/announcements/:id", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { title, content } = req.body;
    db.prepare("UPDATE announcements SET title = ?, content = ? WHERE id = ?").run(title, content, req.params.id);
    res.json({ message: "Announcement updated" });
  });

  app.delete("/api/announcements/:id", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    db.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
    res.json({ message: "Announcement deleted" });
  });

  // --- Course CRUD ---
  app.get("/api/courses", authenticate, (req, res) => {
    const courses = db.prepare("SELECT * FROM courses").all();
    res.json(courses);
  });

  app.post("/api/courses", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { code, title, credits, prerequisites, is_auditable } = req.body;
    const result = db.prepare("INSERT INTO courses (code, title, credits, prerequisites, is_auditable) VALUES (?, ?, ?, ?, ?)").run(code, title, credits, prerequisites || null, is_auditable ? 1 : 0);
    logAction((req as any).user.id, "COURSE_CREATE", { code, title });
    res.json({ id: result.lastInsertRowid, message: "Course created" });
  });

  app.put("/api/courses/:id", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { code, title, credits, prerequisites, is_auditable } = req.body;
    db.prepare("UPDATE courses SET code = ?, title = ?, credits = ?, prerequisites = ?, is_auditable = ? WHERE id = ?").run(code, title, credits, prerequisites || null, is_auditable ? 1 : 0, req.params.id);
    res.json({ message: "Course updated" });
  });

  app.delete("/api/courses/:id", authenticate, authorize(['superadmin']), (req, res) => {
    db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
    res.json({ message: "Course deleted" });
  });

  // --- Program CRUD ---
  app.post("/api/programs", authenticate, authorize(['superadmin']), (req, res) => {
    const { name, code, duration_years, total_credits } = req.body;
    const result = db.prepare("INSERT INTO programs (name, code, duration_years, total_credits) VALUES (?, ?, ?, ?)").run(name, code, duration_years, total_credits);
    logAction((req as any).user.id, "PROGRAM_CREATE", { name, code });
    res.json({ id: result.lastInsertRowid, message: "Program created" });
  });

  app.put("/api/programs/:id", authenticate, authorize(['superadmin']), (req, res) => {
    const { name, code, duration_years, total_credits } = req.body;
    db.prepare("UPDATE programs SET name = ?, code = ?, duration_years = ?, total_credits = ? WHERE id = ?").run(name, code, duration_years, total_credits, req.params.id);
    res.json({ message: "Program updated" });
  });

  app.delete("/api/programs/:id", authenticate, authorize(['superadmin']), (req, res) => {
    db.prepare("DELETE FROM programs WHERE id = ?").run(req.params.id);
    res.json({ message: "Program deleted" });
  });

  // --- Room Management ---
  app.get("/api/rooms", authenticate, (req, res) => {
    const rooms = db.prepare("SELECT r.*, b.name as branch_name FROM rooms r JOIN branches b ON r.branch_id = b.id").all();
    res.json(rooms);
  });

  app.post("/api/rooms", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { branch_id, name, capacity, type } = req.body;
    const result = db.prepare("INSERT INTO rooms (branch_id, name, capacity, type) VALUES (?, ?, ?, ?)").run(branch_id, name, capacity, type);
    res.json({ id: result.lastInsertRowid, message: "Room created" });
  });

  // --- Faculty Assignment ---
  app.post("/api/course-offerings/:id/assign-faculty", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { user_id, role } = req.body;
    db.prepare("INSERT INTO course_offerings_faculty (course_offering_id, user_id, role) VALUES (?, ?, ?)").run(req.params.id, user_id, role || 'Lecturer');
    res.json({ message: "Faculty assigned successfully" });
  });

  // --- Scheduling ---
  app.post("/api/course-offerings/:id/schedule", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { room_id, day_of_week, start_time, end_time } = req.body;
    
    // Simple conflict check (Enterprise requirement)
    const conflict = db.prepare(`
      SELECT * FROM class_schedule 
      WHERE room_id = ? AND day_of_week = ? 
      AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
    `).get(room_id, day_of_week, start_time, start_time, end_time, end_time);

    if (conflict) {
      return res.status(400).json({ error: "Schedule conflict: Room is already booked for this time." });
    }

    db.prepare("INSERT INTO class_schedule (course_offering_id, room_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)").run(req.params.id, room_id, day_of_week, start_time, end_time);
    res.json({ message: "Schedule defined successfully" });
  });

  // --- Faculty: My Courses ---
  app.get("/api/faculty/my-courses", authenticate, authorize(['faculty', 'superadmin']), (req, res) => {
    const faculty_id = (req as any).user.id;
    const courses = db.prepare(`
      SELECT co.*, c.title, c.code, p.name as program_name, cof.role 
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      JOIN programs p ON c.id = p.id -- Simplification: assumes 1:1 for demo or join via course_programs
      JOIN course_offerings_faculty cof ON co.id = cof.course_offering_id
      WHERE cof.user_id = ?
    `).all(faculty_id);
    res.json(courses);
  });

  // --- Student: My Schedule ---
  app.get("/api/my-schedule", authenticate, authorize(['student', 'superadmin']), (req, res) => {
    const user_id = (req as any).user.id;
    const schedule = db.prepare(`
      SELECT cs.*, c.title as course_name, c.code as course_code, r.name as room_name, b.name as branch_name
      FROM class_schedule cs
      JOIN course_offerings co ON cs.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN enrollments e ON co.id = (SELECT course_offering_id FROM course_offerings WHERE course_id = e.course_id AND semester_id = e.semester_id) -- Join logic fix
      JOIN students s ON e.student_id = s.id
      JOIN rooms r ON cs.room_id = r.id
      JOIN branches b ON r.branch_id = b.id
      WHERE s.user_id = ?
    `).all(user_id);
    
    // Alternative join if above is too complex for SQLite in one go
    const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get(user_id) as any;
    if (!student) return res.json([]);

    const studentSchedule = db.prepare(`
      SELECT cs.*, c.title as course_name, c.code as course_code, r.name as room_name
      FROM enrollments e
      JOIN course_offerings co ON e.course_id = co.id -- Simplification
      JOIN class_schedule cs ON co.id = cs.course_offering_id
      JOIN courses c ON co.course_id = c.id
      JOIN rooms r ON cs.room_id = r.id
      WHERE e.student_id = ?
    `).all(student.id);

    res.json(studentSchedule);
  });

  // --- Attendance ---
  app.post("/api/attendance/bulk", authenticate, authorize(['faculty', 'superadmin']), (req, res) => {
    const { course_offering_id, date, records } = req.body; // records: [{student_id, status, notes}]
    
    const insert = db.prepare("INSERT INTO attendance (enrollment_id, date, status, notes) VALUES ((SELECT id FROM enrollments WHERE student_id = ? AND course_id = (SELECT course_id FROM course_offerings WHERE id = ?)), ?, ?, ?)");
    
    const transaction = db.transaction((recs) => {
      for (const r of recs) {
        insert.run(r.student_id, course_offering_id, date, r.status, r.notes || null);
      }
    });

    try {
      transaction(records);
      res.json({ message: "Attendance recorded successfully" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/my-attendance", authenticate, authorize(['student']), (req, res) => {
    const user_id = (req as any).user.id;
    const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get(user_id) as any;
    
    const attendance = db.prepare(`
      SELECT a.*, c.title as course_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = ?
    `).all(student.id);
    
    res.json(attendance);
  });

  // --- LMS: Course Materials ---
  app.get("/api/courses/:id/materials", authenticate, (req, res) => {
    const materials = db.prepare("SELECT * FROM course_materials WHERE course_offering_id = ? ORDER BY uploaded_at DESC").all(req.params.id);
    res.json(materials);
  });

  app.post("/api/courses/:id/materials", authenticate, authorize(['faculty', 'superadmin']), upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { title } = req.body;
    db.prepare("INSERT INTO course_materials (course_offering_id, title, file_url) VALUES (?, ?, ?)").run(req.params.id, title, `/uploads/${req.file.filename}`);
    res.json({ message: "Material uploaded successfully" });
  });

  // --- LMS: Assignments ---
  app.get("/api/courses/:id/assignments", authenticate, (req, res) => {
    const assignments = db.prepare("SELECT * FROM assignments WHERE course_offering_id = ? ORDER BY deadline ASC").all(req.params.id);
    res.json(assignments);
  });

  app.post("/api/courses/:id/assignments", authenticate, authorize(['faculty', 'superadmin']), upload.single("file"), (req, res) => {
    const { title, description, deadline } = req.body;
    const file_url = req.file ? `/uploads/${req.file.filename}` : null;
    db.prepare("INSERT INTO assignments (course_offering_id, title, description, file_url, deadline) VALUES (?, ?, ?, ?, ?)").run(req.params.id, title, description, file_url, deadline);
    res.json({ message: "Assignment created successfully" });
  });

  // --- LMS: Submissions ---
  app.post("/api/assignments/:id/submit", authenticate, authorize(['student']), upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const student_id = (db.prepare("SELECT id FROM students WHERE user_id = ?").get((req as any).user.id) as any).id;
    db.prepare("INSERT INTO submissions (assignment_id, student_id, file_url) VALUES (?, ?, ?)").run(req.params.id, student_id, `/uploads/${req.file.filename}`);
    res.json({ message: "Assignment submitted successfully" });
  });

  app.get("/api/faculty/assignments/:id/submissions", authenticate, authorize(['faculty', 'superadmin']), (req, res) => {
    const submissions = db.prepare(`
      SELECT sub.*, u.full_name, s.student_id_code
      FROM submissions sub
      JOIN students s ON sub.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE sub.assignment_id = ?
    `).all(req.params.id);
    res.json(submissions);
  });

  app.post("/api/submissions/:id/grade", authenticate, authorize(['faculty', 'superadmin']), (req, res) => {
    const { grade, feedback } = req.body;
    db.prepare("UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?").run(grade, feedback, req.params.id);
    res.json({ message: "Submission graded" });
  });

  // --- Faculty Dashboard Core ---
  app.get("/api/faculty/course/:id/students", authenticate, authorize(['faculty', 'superadmin']), (req, res) => {
    const students = db.prepare(`
      SELECT s.*, u.full_name, e.id as enrollment_id, e.assignment_grade, e.midterm_grade, e.final_grade, e.grade as final_letter_grade
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN enrollments e ON s.id = e.student_id
      JOIN course_offerings co ON e.course_id = co.course_id AND e.semester_id = co.semester_id
      WHERE co.id = ?
    `).all(req.params.id);
    res.json(students);
  });

  // --- Finance & Invoicing ---
  app.get("/api/finance/scholarships", authenticate, (req, res) => {
    res.json(db.prepare("SELECT * FROM scholarships").all());
  });

  app.post("/api/finance/generate-invoice", authenticate, authorize(['superadmin', 'accountant']), (req, res) => {
    const { student_id, semester_id, scholarship_id } = req.body;
    
    // Calculate total based on programs/fees
    const student = db.prepare("SELECT program_id FROM students WHERE id = ?").get(student_id) as any;
    const fees = db.prepare("SELECT SUM(amount) as total FROM fee_structures WHERE program_id = ? AND semester_id = ?").get(student.program_id, semester_id) as any;
    
    let total = fees.total || 5000; // Default if not defined
    let balance = total;
    
    if (scholarship_id) {
      const scholarship = db.prepare("SELECT * FROM scholarships WHERE id = ?").get(scholarship_id) as any;
      if (scholarship.type === 'Percentage') balance = total * (1 - (scholarship.value / 100));
      else balance = total - scholarship.value;
    }

    const result = db.prepare("INSERT INTO invoices (student_id, semester_id, total_amount, scholarship_id, balance_due) VALUES (?, ?, ?, ?, ?)").run(student_id, semester_id, total, scholarship_id || null, balance);
    res.json({ id: result.lastInsertRowid, message: "Invoice generated" });
  });

  app.get("/api/my-invoices", authenticate, authorize(['student']), (req, res) => {
    const user_id = (req as any).user.id;
    const invoices = db.prepare(`
      SELECT i.*, s.name as scholarship_name, sem.semester_name, sem.academic_year
      FROM invoices i
      LEFT JOIN scholarships s ON i.scholarship_id = s.id
      JOIN semesters sem ON i.semester_id = sem.id
      WHERE i.student_id = (SELECT id FROM students WHERE user_id = ?)
    `).all(user_id);
    res.json(invoices);
  });

  // --- Grade Visibility (Financial Clearance) ---
  const checkClearance = (student_id: number) => {
    const student = db.prepare("SELECT financial_clearance FROM students WHERE id = ?").get(student_id) as any;
    return student.financial_clearance === 1;
  };

  // --- Semester CRUD ---
  app.get("/api/semesters", authenticate, (req, res) => {
    const semesters = db.prepare("SELECT s.*, b.name as branch_name FROM semesters s JOIN branches b ON s.branch_id = b.id").all();
    res.json(semesters);
  });

  app.post("/api/semesters", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { branch_id, academic_year, semester_name, start_date, end_date } = req.body;
    const result = db.prepare("INSERT INTO semesters (branch_id, academic_year, semester_name, start_date, end_date) VALUES (?, ?, ?, ?, ?)").run(branch_id, academic_year, semester_name, start_date, end_date);
    logAction((req as any).user.id, "SEMESTER_CREATE", { academic_year, semester_name });
    res.json({ id: result.lastInsertRowid, message: "Semester created" });
  });

  app.put("/api/semesters/:id/activate", authenticate, authorize(['superadmin']), (req, res) => {
    db.prepare("UPDATE semesters SET is_active = 0").run(); // Deactivate all
    db.prepare("UPDATE semesters SET is_active = 1 WHERE id = ?").run(req.params.id);
    logAction((req as any).user.id, "SEMESTER_ACTIVATE", { semesterId: req.params.id });
    res.json({ message: "Semester activated" });
  });

  // --- User Management ---
  app.get("/api/users", authenticate, authorize(['superadmin']), (req, res) => {
    const users = db.prepare("SELECT id, username, role, full_name, email, branch_id FROM users").all();
    res.json(users);
  });

  app.post("/api/users", authenticate, authorize(['superadmin']), async (req, res) => {
    const { username, password, role, full_name, email, branch_id } = req.body;
    const hashed = await bcrypt.hash(password || "password123", 10);
    try {
      const result = db.prepare("INSERT INTO users (username, password, role, full_name, email, branch_id) VALUES (?, ?, ?, ?, ?, ?)").run(username, hashed, role, full_name, email, branch_id || null);
      logAction((req as any).user.id, "USER_CREATE", { username, role });
      res.json({ id: result.lastInsertRowid, message: "User created" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/users/:id", authenticate, authorize(['superadmin']), (req, res) => {
    const { full_name, email, role, branch_id } = req.body;
    db.prepare("UPDATE users SET full_name = ?, email = ?, role = ?, branch_id = ? WHERE id = ?").run(full_name, email, role, branch_id || null, req.params.id);
    logAction((req as any).user.id, "USER_UPDATE", { userId: req.params.id });
    res.json({ message: "User updated" });
  });

  app.delete("/api/users/:id", authenticate, authorize(['superadmin']), (req, res) => {
    if (parseInt(req.params.id) === (req as any).user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    logAction((req as any).user.id, "USER_DELETE", { userId: req.params.id });
    res.json({ message: "User deleted" });
  });

  // --- Notifications ---
  app.get("/api/notifications", authenticate, (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").all((req as any).user.id);
    const unreadCount = (db.prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0").get((req as any).user.id) as any).count;
    res.json({ notifications, unreadCount });
  });

  app.post("/api/notifications/read", authenticate, (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run((req as any).user.id);
    res.json({ message: "All notifications marked as read" });
  });

  app.post("/api/notifications/send", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { user_id, title, message } = req.body;
    db.prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)").run(user_id, title, message);
    res.json({ message: "Notification sent" });
  });

  // --- Fee Structures ---
  app.get("/api/fee-structures", authenticate, authorize(['superadmin', 'branch_admin', 'accountant']), (req, res) => {
    const fees = db.prepare("SELECT fs.*, p.name as program_name, s.semester_name FROM fee_structures fs LEFT JOIN programs p ON fs.program_id = p.id LEFT JOIN semesters s ON fs.semester_id = s.id").all();
    res.json(fees);
  });

  app.post("/api/fee-structures", authenticate, authorize(['superadmin']), (req, res) => {
    const { program_id, semester_id, fee_type, amount } = req.body;
    const result = db.prepare("INSERT INTO fee_structures (program_id, semester_id, fee_type, amount) VALUES (?, ?, ?, ?)").run(program_id, semester_id, fee_type, amount);
    logAction((req as any).user.id, "FEE_STRUCTURE_CREATE", { program_id, fee_type, amount });
    res.json({ id: result.lastInsertRowid, message: "Fee structure created" });
  });

  // --- Branch Update/Delete ---
  app.put("/api/branches/:id", authenticate, authorize(['superadmin']), (req, res) => {
    const { name, location, contact } = req.body;
    db.prepare("UPDATE branches SET name = ?, location = ?, contact = ? WHERE id = ?").run(name, location, contact, req.params.id);
    logAction((req as any).user.id, "BRANCH_UPDATE", { branchId: req.params.id });
    res.json({ message: "Branch updated" });
  });

  app.delete("/api/branches/:id", authenticate, authorize(['superadmin']), (req, res) => {
    db.prepare("DELETE FROM branches WHERE id = ?").run(req.params.id);
    logAction((req as any).user.id, "BRANCH_DELETE", { branchId: req.params.id });
    res.json({ message: "Branch deleted" });
  });

  // --- Audit Logs ---
  app.get("/api/audit-logs", authenticate, authorize(['superadmin']), (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = db.prepare("SELECT al.*, u.full_name as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT ? OFFSET ?").all(limit, (page - 1) * limit);
    const total = (db.prepare("SELECT COUNT(*) as count FROM audit_logs").get() as any).count;
    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  });

  // --- Payment History ---
  app.get("/api/payments", authenticate, authorize(['superadmin', 'branch_admin', 'accountant']), (req, res) => {
    const payments = db.prepare(`
      SELECT p.*, u.full_name as student_name, s.student_id_code 
      FROM payments p 
      LEFT JOIN students s ON p.student_id = s.id 
      LEFT JOIN users u ON s.user_id = u.id 
      ORDER BY p.created_at DESC
    `).all();
    res.json(payments);
  });

  // --- Course Offerings CRUD ---
  app.get("/api/course-offerings", authenticate, (req, res) => {
    const offerings = db.prepare(`
      SELECT co.*, c.title as course_title, c.code as course_code, s.semester_name 
      FROM course_offerings co 
      JOIN courses c ON co.course_id = c.id 
      JOIN semesters s ON co.semester_id = s.id
    `).all();
    res.json(offerings);
  });

  app.post("/api/course-offerings", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { course_id, semester_id, capacity } = req.body;
    const result = db.prepare("INSERT INTO course_offerings (course_id, semester_id, capacity) VALUES (?, ?, ?)").run(course_id, semester_id, capacity || 30);
    logAction((req as any).user.id, "COURSE_OFFERING_CREATE", { course_id, semester_id });
    res.json({ id: result.lastInsertRowid, message: "Course offering created" });
  });

  // ==========================================
  // AI-POWERED FEATURES
  // ==========================================

  // AI Grade Prediction
  app.post("/api/ai/predict-grade", authenticate, authorize(['superadmin', 'branch_admin', 'faculty']), async (req, res) => {
    const { student_id, course_id } = req.body;

    try {
      const student = db.prepare(`
        SELECT s.*, u.full_name, u.email,
               (SELECT AVG(e.points) FROM enrollments e WHERE e.student_id = s.id AND e.points IS NOT NULL) as current_gpa
        FROM students s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `).get(student_id) as any;

      if (!student) return res.status(404).json({ error: "Student not found" });

      const enrollments = db.prepare(`
        SELECT assignment_grade, midterm_grade, final_grade
        FROM enrollments
        WHERE student_id = ? AND course_id = ?
      `).get(student_id, course_id) as any;

      if (!enrollments) return res.status(404).json({ error: "Enrollment not found" });

      const assignmentGrades = [enrollments.assignment_grade || 0].filter(Boolean);
      
      const prediction = await aiService.predictGrade({
        name: student.full_name,
        gpa: student.current_gpa || 3.0,
        attendanceRate: 85, // Would need attendance table join
        assignmentGrades,
        midtermGrade: enrollments.midterm_grade || 0,
        studyHours: 10,
        previousFailures: 0
      });

      res.json({ prediction, student: { name: student.full_name, id: student_id } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI At-Risk Students Report
  app.get("/api/ai/at-risk-students", authenticate, authorize(['superadmin', 'branch_admin']), async (req, res) => {
    try {
      const { branch_id, role } = (req as any).user;
      
      let students;
      if (role === 'superadmin') {
        students = db.prepare(`
          SELECT s.*, u.full_name, u.email,
                 (SELECT AVG(e.points) FROM enrollments e WHERE e.student_id = s.id AND e.points IS NOT NULL) as gpa,
                 (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.id AND e.grade = 'F') as failed_courses
          FROM students s
          JOIN users u ON s.user_id = u.id
        `).all() as any[];
      } else {
        students = db.prepare(`
          SELECT s.*, u.full_name, u.email,
                 (SELECT AVG(e.points) FROM enrollments e WHERE e.student_id = s.id AND e.points IS NOT NULL) as gpa,
                 (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.id AND e.grade = 'F') as failed_courses
          FROM students s
          JOIN users u ON s.user_id = u.id
          WHERE s.branch_id = ?
        `).all(branch_id) as any[];
      }

      const atRiskStudents = await aiService.identifyAtRiskStudents(students);
      res.json({ atRiskStudents, total: atRiskStudents.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Generate Report Comment
  app.post("/api/ai/generate-comment", authenticate, authorize(['faculty', 'superadmin']), async (req, res) => {
    const { student_name, subject, grade, strengths, weaknesses, attendance_rate, participation } = req.body;

    try {
      const comment = await aiService.generateReportComment({
        name: student_name,
        subject,
        grade,
        strengths: strengths || [],
        weaknesses: weaknesses || [],
        attendanceRate: attendance_rate || 85,
        participationLevel: participation || 'medium'
      });

      res.json({ comment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Chatbot
  app.post("/api/ai/chat", authenticate, async (req, res) => {
    const { query } = req.body;
    const user = (req as any).user;

    try {
      const response = await aiService.chatbotResponse(query, {
        role: user.role,
        studentInfo: user.role === 'student' ? db.prepare("SELECT * FROM students WHERE user_id = ?").get(user.id) : null
      });

      res.json({ response });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Study Tips
  app.post("/api/ai/study-tips", authenticate, authorize(['student']), async (req, res) => {
    const { learning_style, weak_subjects, available_hours } = req.body;

    try {
      const tips = await aiService.generateStudyTips({
        learningStyle: learning_style,
        weakSubjects: weak_subjects || [],
        availableHours: available_hours || 10
      });

      res.json({ tips });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // BACKUP & DATA EXPORT (GDPR Compliance)
  // ==========================================

  // Create Backup
  app.post("/api/admin/backup", authenticate, authorize(['superadmin']), async (req, res) => {
    const { reason } = req.body || { reason: 'manual' };
    
    try {
      const result = await backupService.createBackup(reason);
      if (result.success) {
        res.json({ message: "Backup created successfully", path: result.backupPath });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List Backups
  app.get("/api/admin/backups", authenticate, authorize(['superadmin']), (req, res) => {
    const backups = backupService.listBackups();
    res.json({ backups });
  });

  // Restore Backup
  app.post("/api/admin/restore", authenticate, authorize(['superadmin']), async (req, res) => {
    const { backup_filename } = req.body;

    try {
      const result = await backupService.restoreBackup(backup_filename);
      if (result.success) {
        res.json({ message: "Database restored successfully" });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Backup
  app.delete("/api/admin/backups/:filename", authenticate, authorize(['superadmin']), (req, res) => {
    const success = backupService.deleteBackup(req.params.filename);
    if (success) {
      res.json({ message: "Backup deleted" });
    } else {
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // Export Student Data (GDPR Right to Access)
  app.get("/api/students/:id/export", authenticate, authorize(['superadmin', 'student']), (req, res) => {
    const studentId = parseInt(req.params.id);
    const user = (req as any).user;

    // Students can only export their own data
    if (user.role === 'student') {
      const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get(user.id) as any;
      if (!student || student.id !== studentId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const result = backupService.exportStudentData(studentId, db);
    if (result.success) {
      res.json({ data: result.data });
    } else {
      res.status(500).json({ error: result.error });
    }
  });

  // Delete Student Data (GDPR Right to be Forgotten)
  app.delete("/api/students/:id/data", authenticate, authorize(['superadmin']), (req, res) => {
    const studentId = parseInt(req.params.id);
    const student = db.prepare("SELECT user_id FROM students WHERE id = ?").get(studentId) as any;
    
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const result = backupService.deleteStudentData(studentId, db, student.user_id);
    if (result.success) {
      logAction((req as any).user.id, "STUDENT_DATA_DELETED", { studentId });
      res.json({ message: "Student data deleted successfully" });
    } else {
      res.status(500).json({ error: result.error });
    }
  });

  // Export All Data (Full Database Export)
  app.get("/api/admin/export-all", authenticate, authorize(['superadmin']), (req, res) => {
    const exportData = backupService.exportAllData(db);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dreamland_export_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(exportData);
  });

  // ==========================================
  // ADVANCED ANALYTICS
  // ==========================================

  // Enrollment Trends (for charts)
  app.get("/api/analytics/enrollment-trends", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { branch_id, role } = (req as any).user;
    const whereClause = role === 'superadmin' ? '' : 'WHERE s.branch_id = ?';
    const params = role === 'superadmin' ? [] : [branch_id];

    const trends = db.prepare(`
      SELECT 
        strftime('%Y-%m', u.created_at) as month,
        COUNT(*) as count,
        b.name as branch
      FROM students s
      JOIN users u ON s.user_id = u.id
      ${role === 'branch_admin' ? 'JOIN branches b ON s.branch_id = b.id' : 'LEFT JOIN branches b ON s.branch_id = b.id'}
      ${whereClause}
      GROUP BY strftime('%Y-%m', u.created_at)
      ORDER BY month DESC
      LIMIT 12
    `).all(...params) as any[];

    res.json({ trends: trends.reverse() });
  });

  // Revenue Trends (for charts)
  app.get("/api/analytics/revenue-trends", authenticate, authorize(['superadmin', 'branch_admin', 'accountant']), (req, res) => {
    const trends = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        SUM(amount) as revenue,
        COUNT(*) as transaction_count
      FROM payments
      WHERE status = 'verified'
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `).all() as any[];

    res.json({ trends: trends.reverse() });
  });

  // Program Distribution (for pie chart)
  app.get("/api/analytics/program-distribution", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { branch_id, role } = (req as any).user;
    const params = role === 'superadmin' ? [] : [branch_id];
    const whereClause = role === 'superadmin' ? '' : 'WHERE s.branch_id = ?';

    const distribution = db.prepare(`
      SELECT 
        p.name as program,
        COUNT(s.id) as count
      FROM programs p
      LEFT JOIN students s ON p.id = s.program_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY count DESC
    `).all(...params) as any[];

    res.json({ distribution });
  });

  // Branch Comparison (for multi-branch analytics)
  app.get("/api/analytics/branch-comparison", authenticate, authorize(['superadmin']), (req, res) => {
    const comparison = db.prepare(`
      SELECT 
        b.name as branch,
        b.location,
        b.contact,
        COUNT(DISTINCT s.id) as student_count,
        COUNT(DISTINCT u.id) as user_count,
        COALESCE((SELECT SUM(amount) FROM payments p 
          JOIN students sp ON p.student_id = sp.id 
          WHERE sp.branch_id = b.id AND p.status = 'verified'), 0) as total_revenue
      FROM branches b
      LEFT JOIN students s ON b.id = s.branch_id
      LEFT JOIN users u ON b.id = u.branch_id
      GROUP BY b.id
    `).all() as any[];

    res.json({ comparison });
  });

  // Performance Heatmap (course performance)
  app.get("/api/analytics/course-performance", authenticate, authorize(['superadmin', 'branch_admin', 'faculty']), (req, res) => {
    const performance = db.prepare(`
      SELECT 
        c.code,
        c.title,
        COUNT(e.id) as enrollment_count,
        AVG(e.points) as avg_score,
        AVG(CASE WHEN e.grade = 'A' THEN 4 
                 WHEN e.grade = 'B' THEN 3 
                 WHEN e.grade = 'C' THEN 2 
                 WHEN e.grade = 'D' THEN 1 
                 ELSE 0 END) as avg_gpa,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND grade = 'F') * 100.0 / COUNT(e.id) as fail_rate
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE e.grade IS NOT NULL
      GROUP BY c.id
      ORDER BY avg_score ASC
    `).all() as any[];

    res.json({ performance });
  });

  // Student Ledger (complete financial picture)
  app.get("/api/students/:id/ledger", authenticate, (req, res) => {
    const studentId = req.params.id;
    const user = (req as any).user;

    // Check permission
    if (user.role === 'student') {
      const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get(user.id) as any;
      if (!student || student.id !== parseInt(studentId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId) as any;
    if (!student) return res.status(404).json({ error: "Student not found" });

    const invoices = db.prepare(`
      SELECT i.*, s.name as scholarship_name, sem.semester_name
      FROM invoices i
      LEFT JOIN scholarships s ON i.scholarship_id = s.id
      JOIN semesters sem ON i.semester_id = sem.id
      WHERE i.student_id = ?
      ORDER BY i.created_at DESC
    `).all(studentId) as any[];

    const payments = db.prepare(`
      SELECT * FROM payments
      WHERE student_id = ?
      ORDER BY created_at DESC
    `).all(studentId) as any[];

    const totalOwed = invoices.reduce((sum, inv) => sum + inv.balance_due, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);

    res.json({
      student: {
        id: student.id,
        name: db.prepare("SELECT full_name FROM users WHERE id = ?").get(student.user_id),
        studentIdCode: student.student_id_code
      },
      ledger: {
        invoices,
        payments,
        summary: {
          totalInvoiced: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
          totalPaid,
          totalOwed,
          financialClearance: student.financial_clearance === 1
        }
      }
    });
  });

  // Auto-Enrollment (for next semester)
  app.post("/api/enrollments/auto-enroll", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { semester_id, branch_id } = req.body;

    try {
      const transaction = db.transaction(() => {
        // Get all active students
        const students = db.prepare(`
          SELECT id, program_id, current_semester_id
          FROM students
          WHERE branch_id = ? AND academic_status != 'suspended'
        `).all(branch_id) as any[];

        let enrolled = 0;
        let skipped = 0;

        for (const student of students) {
          // Get their completed courses
          const completed = db.prepare(`
            SELECT c.code FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = ? AND e.grade IS NOT NULL AND e.grade != 'F'
          `).all(student.id) as any[];

          const completedCodes = completed.map(c => c.code);

          // Get next semester courses for their program
          const nextCourses = db.prepare(`
            SELECT c.id FROM courses c
            WHERE c.prerequisites IS NULL OR 
                  (SELECT COUNT(*) FROM enrollments e2
                   JOIN courses c2 ON e2.course_id = c2.id
                   WHERE e2.student_id = ? AND c2.code IN (SELECT value FROM json_each(json(?))))
          `).all(student.id, JSON.stringify(completedCodes));

          for (const course of nextCourses) {
            try {
              db.prepare(`
                INSERT INTO enrollments (student_id, course_id, semester_id, status)
                VALUES (?, ?, ?, 'enrolled')
              `).run(student.id, course.id, semester_id);
              enrolled++;
            } catch {
              skipped++;
            }
          }
        }

        return { enrolled, skipped };
      });

      const result = transaction();
      logAction((req as any).user.id, "AUTO_ENROLLMENT", { semester_id, branch_id, ...result });
      res.json({ message: "Auto-enrollment completed", ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Digital Transcript with Signature
  app.get("/api/students/:id/transcript-digital", authenticate, (req, res) => {
    const studentId = req.params.id;
    const crypto = require('crypto');

    const student = db.prepare(`
      SELECT s.*, u.full_name, p.name as program_name, b.name as branch_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN programs p ON s.program_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.id = ?
    `).get(studentId) as any;

    if (!student) return res.status(404).json({ error: "Student not found" });

    const grades = db.prepare(`
      SELECT e.*, c.title as course_name, c.code as course_code, c.credits, sem.semester_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN semesters sem ON e.semester_id = sem.id
      WHERE e.student_id = ? AND e.grade IS NOT NULL
    `).all(studentId) as any[];

    // Generate digital signature
    const transcriptHash = crypto.createHash('sha256')
      .update(`${student.student_id_code}${student.full_name}${grades.map(g => g.grade).join('')}`)
      .digest('hex');

    const digitalSignature = crypto
      .createHmac('sha256', authConfig.jwtSecret)
      .update(transcriptHash)
      .digest('hex');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 48px; margin-bottom: 10px; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #1e40af; color: white; padding: 12px; text-align: left; }
            td { border: 1px solid #ddd; padding: 10px; }
            tr:nth-child(even) { background: #f5f5f5; }
            .footer { margin-top: 50px; border-top: 2px solid #333; padding-top: 20px; }
            .signature { margin-top: 30px; display: flex; justify-content: space-between; align-items: center; }
            .qr-placeholder { width: 100px; height: 100px; border: 2px dashed #333; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666; }
            .verification { font-size: 10px; color: #666; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🎓</div>
            <h1>DREAMLAND COLLEGE</h1>
            <h2>OFFICIAL ACADEMIC TRANSCRIPT</h2>
          </div>
          <div class="info">
            <div>
              <p><strong>Name:</strong> ${student.full_name}</p>
              <p><strong>Student ID:</strong> ${student.student_id_code}</p>
              <p><strong>Program:</strong> ${student.program_name}</p>
            </div>
            <div>
              <p><strong>Branch:</strong> ${student.branch_name}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${student.academic_status}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Semester</th>
                <th>Code</th>
                <th>Course Title</th>
                <th>Credits</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${grades.map(g => `
                <tr>
                  <td>${g.semester_name}</td>
                  <td>${g.course_code}</td>
                  <td>${g.course_name}</td>
                  <td>${g.credits}</td>
                  <td>${g.grade}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div class="signature">
              <div>
                <p>_________________________</p>
                <p>Registrar Signature</p>
              </div>
              <div class="qr-placeholder">
                QR Code<br/>${digitalSignature.substring(0, 8)}...
              </div>
            </div>
            <p class="verification">
              <strong>Digital Signature:</strong> ${digitalSignature}<br/>
              Verify this transcript at: ${process.env.APP_URL || 'https://dreamland.edu'}/verify/${digitalSignature}
            </p>
          </div>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // ==========================================
  // PARENT PORTAL
  // ==========================================

  // Link Parent to Student (Admin only)
  app.post("/api/parent/link-student", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { parent_user_id, student_id, relationship } = req.body;

    try {
      db.prepare(`
        INSERT INTO parent_students (parent_user_id, student_id, relationship)
        VALUES (?, ?, ?)
      `).run(parent_user_id, student_id, relationship || 'guardian');

      logAction((req as any).user.id, "PARENT_STUDENT_LINK", { parent_user_id, student_id });
      res.json({ message: "Parent linked to student successfully" });
    } catch (error: any) {
      if (error.message.includes('UNIQUE')) {
        res.status(400).json({ error: "Parent is already linked to this student" });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Unlink Parent from Student
  app.delete("/api/parent/unlink-student", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { parent_user_id, student_id } = req.body;

    try {
      db.prepare(`DELETE FROM parent_students WHERE parent_user_id = ? AND student_id = ?`).run(parent_user_id, student_id);
      logAction((req as any).user.id, "PARENT_STUDENT_UNLINK", { parent_user_id, student_id });
      res.json({ message: "Parent unlinked from student" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Parent's Children
  app.get("/api/parent/my-children", authenticate, authorize(['parent']), (req, res) => {
    const parentUserId = (req as any).user.id;

    const children = db.prepare(`
      SELECT s.*, u.full_name, u.email, p.name as program_name, b.name as branch_name,
             ps.relationship
      FROM parent_students ps
      JOIN students s ON ps.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE ps.parent_user_id = ?
    `).all(parentUserId) as any[];

    res.json({ children });
  });

  // Parent View Child's Grades
  app.get("/api/parent/child/:id/grades", authenticate, authorize(['parent']), (req, res) => {
    const parentUserId = (req as any).user.id;
    const childId = parseInt(req.params.id);

    // Verify parent has access to this child
    const link = db.prepare(`
      SELECT * FROM parent_students WHERE parent_user_id = ? AND student_id = ?
    `).get(parentUserId, childId);

    if (!link) {
      return res.status(403).json({ error: "You don't have access to this student's records" });
    }

    const grades = db.prepare(`
      SELECT e.*, c.code, c.title, sem.semester_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN semesters sem ON e.semester_id = sem.id
      WHERE e.student_id = ? AND e.grade IS NOT NULL
      ORDER BY sem.semester_name DESC
    `).all(childId) as any[];

    res.json({ grades });
  });

  // Parent View Child's Attendance
  app.get("/api/parent/child/:id/attendance", authenticate, authorize(['parent']), (req, res) => {
    const parentUserId = (req as any).user.id;
    const childId = parseInt(req.params.id);

    const link = db.prepare(`
      SELECT * FROM parent_students WHERE parent_user_id = ? AND student_id = ?
    `).get(parentUserId, childId);

    if (!link) {
      return res.status(403).json({ error: "You don't have access to this student's records" });
    }

    const attendance = db.prepare(`
      SELECT a.*, c.title as course_name, strftime('%Y-%m-%d', a.date) as formatted_date
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = ?
      ORDER BY a.date DESC
      LIMIT 50
    `).all(childId) as any[];

    // Calculate attendance rate
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    res.json({ attendance, summary: { total, present, absent: total - present, rate } });
  });

  // Parent View Child's Financial Status
  app.get("/api/parent/child/:id/finance", authenticate, authorize(['parent']), (req, res) => {
    const parentUserId = (req as any).user.id;
    const childId = parseInt(req.params.id);

    const link = db.prepare(`
      SELECT * FROM parent_students WHERE parent_user_id = ? AND student_id = ?
    `).get(parentUserId, childId);

    if (!link) {
      return res.status(403).json({ error: "You don't have access to this student's records" });
    }

    const invoices = db.prepare(`
      SELECT i.*, s.name as scholarship_name, sem.semester_name
      FROM invoices i
      LEFT JOIN scholarships s ON i.scholarship_id = s.id
      JOIN semesters sem ON i.semester_id = sem.id
      WHERE i.student_id = ?
      ORDER BY i.created_at DESC
    `).all(childId) as any[];

    const payments = db.prepare(`
      SELECT * FROM payments
      WHERE student_id = ?
      ORDER BY created_at DESC
    `).all(childId) as any[];

    const totalOwed = invoices.reduce((sum, inv) => sum + inv.balance_due, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);

    res.json({
      finance: {
        invoices,
        payments,
        summary: {
          totalInvoiced: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
          totalPaid,
          balanceDue: totalOwed,
          financialClearance: (db.prepare("SELECT financial_clearance FROM students WHERE id = ?").get(childId) as any).financial_clearance === 1
        }
      }
    });
  });

  // Parent View Child's Full Report
  app.get("/api/parent/child/:id/report", authenticate, authorize(['parent']), (req, res) => {
    const parentUserId = (req as any).user.id;
    const childId = parseInt(req.params.id);

    const link = db.prepare(`
      SELECT * FROM parent_students WHERE parent_user_id = ? AND student_id = ?
    `).get(parentUserId, childId);

    if (!link) {
      return res.status(403).json({ error: "You don't have access to this student's records" });
    }

    const student = db.prepare(`
      SELECT s.*, u.full_name, u.email, p.name as program_name, b.name as branch_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE s.id = ?
    `).get(childId) as any[];

    const grades = db.prepare(`
      SELECT e.*, c.code, c.title
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = ? AND e.grade IS NOT NULL
    `).all(childId) as any[];

    const gpa = grades.length > 0 
      ? (grades.reduce((sum, e) => sum + (e.points || 0), 0) / grades.length).toFixed(2)
      : 'N/A';

    res.json({
      student,
      academicSummary: {
        gpa,
        totalCourses: grades.length,
        grades: {
          A: grades.filter((g: any) => g.grade === 'A').length,
          B: grades.filter((g: any) => g.grade === 'B').length,
          C: grades.filter((g: any) => g.grade === 'C').length,
          D: grades.filter((g: any) => g.grade === 'D').length,
          F: grades.filter((g: any) => g.grade === 'F').length
        }
      }
    });
  });

  // ==========================================
  // API DOCUMENTATION
  // ==========================================

  app.get("/api/docs", (req, res) => {
    const docs = {
      name: "Dreamland College Management System API",
      version: "2.0.0",
      description: "Enterprise-grade college management API with AI features",
      endpoints: {
        "Authentication": [
          "POST /api/auth/login - User login",
          "POST /api/auth/logout - User logout",
          "POST /api/auth/refresh - Refresh JWT token",
          "POST /api/auth/forgot-password - Request password reset",
          "POST /api/auth/reset-password - Reset password with code",
          "POST /api/auth/change-password - Change password (authenticated)",
          "GET /api/auth/me - Get current user",
          "PUT /api/auth/profile - Update profile"
        ],
        "AI Features": [
          "POST /api/ai/predict-grade - Predict student grade",
          "GET /api/ai/at-risk-students - Get at-risk students report",
          "POST /api/ai/generate-comment - Generate report comments",
          "POST /api/ai/chat - AI chatbot",
          "POST /api/ai/study-tips - Get personalized study tips"
        ],
        "Parent Portal": [
          "POST /api/parent/link-student - Link parent to student",
          "DELETE /api/parent/unlink-student - Unlink parent from student",
          "GET /api/parent/my-children - Get parent's children",
          "GET /api/parent/child/:id/grades - View child's grades",
          "GET /api/parent/child/:id/attendance - View child's attendance",
          "GET /api/parent/child/:id/finance - View child's financial status",
          "GET /api/parent/child/:id/report - View child's full report"
        ],
        "Students": [
          "GET /api/students - List students",
          "POST /api/students - Create student",
          "PUT /api/students/:id - Update student",
          "DELETE /api/students/:id - Delete student",
          "GET /api/students/paginated - Paginated student list",
          "POST /api/students/bulk-upload - Bulk upload from CSV",
          "GET /api/students/:id/transcript - Get transcript",
          "GET /api/students/:id/transcript-digital - Get digital transcript",
          "GET /api/students/:id/export - Export student data (GDPR)",
          "GET /api/students/:id/ledger - Get financial ledger"
        ],
        "Backup & Compliance": [
          "POST /api/admin/backup - Create database backup",
          "GET /api/admin/backups - List backups",
          "POST /api/admin/restore - Restore from backup",
          "DELETE /api/admin/backups/:filename - Delete backup",
          "GET /api/admin/export-all - Export all data"
        ],
        "Analytics": [
          "GET /api/analytics/dashboard-stats - Dashboard statistics",
          "GET /api/analytics/enrollment-trends - Enrollment trends",
          "GET /api/analytics/revenue-trends - Revenue trends",
          "GET /api/analytics/program-distribution - Program distribution",
          "GET /api/analytics/branch-comparison - Branch comparison",
          "GET /api/analytics/course-performance - Course performance"
        ],
        "Finance": [
          "GET /api/payments - List payments",
          "POST /api/payments/initialize - Initialize payment",
          "POST /api/payments/verify - Verify payment",
          "GET /api/finance/scholarships - List scholarships",
          "POST /api/finance/generate-invoice - Generate invoice",
          "GET /api/fee-structures - List fee structures",
          "POST /api/fee-structures - Create fee structure"
        ],
        "Academics": [
          "GET /api/courses - List courses",
          "POST /api/courses - Create course",
          "PUT /api/courses/:id - Update course",
          "DELETE /api/courses/:id - Delete course",
          "GET /api/programs - List programs",
          "POST /api/programs - Create program",
          "PUT /api/programs/:id - Update program",
          "GET /api/semesters - List semesters",
          "POST /api/semesters - Create semester",
          "PUT /api/semesters/:id/activate - Activate semester",
          "POST /api/enrollments/auto-enroll - Auto-enrollment"
        ]
      },
      features: [
        "🤖 AI-Powered Grade Prediction",
        "📊 Advanced Analytics Dashboard",
        "💾 Automated Daily Backups",
        "🔒 GDPR Compliance (Export/Delete)",
        "📱 Mobile App Support (React Native/Expo)",
        "👨‍👩‍👧 Parent Portal",
        "📧 SMS Notifications via AfroMessage",
        "💳 Payment Integration (Chapa, CBE)",
        "🎓 Digital Transcripts with Signatures",
        "⚠️ At-Risk Student Detection",
        "🤖 AI Chatbot Support",
        "📈 Enrollment & Revenue Trends",
        "🔍 Course Performance Heatmap",
        "🏫 Multi-Branch Management",
        "📚 LMS Integration (Materials, Assignments, Submissions)"
      ]
    };

    res.json(docs);
  });

  // --- Health Check (for Render) ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "2.0.0" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Start server with port conflict handling
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
  });

  // Handle port already in use
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
      console.error(`\nSolutions:`);
      console.error(`1. Stop other processes: taskkill /F /IM node.exe`);
      console.error(`2. Use a different port: Set PORT=3001 in .env.local`);
      console.error(`3. Find what's using port 3000: netstat -ano | findstr :3000\n`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error.message);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('💾 Database connection closed');
      db.close();
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('💾 Database connection closed');
      db.close();
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

startServer();
