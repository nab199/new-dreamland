import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
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

import { db, usePostgresMode as usePostgres } from './src/config/DatabaseConfig';
import { validatePaymentInsert, validateStudentUpdate, isStrictVerificationSignal } from './src/types/strict';
import { validateDoubleEntry } from './src/types/ledger';
import { IDEMPOTENCY_HEADER, validateIdempotencyKey } from './src/types/idempotency';
import { idempotencyService } from './src/services/idempotencyService';
import { ledgerService } from './src/services/ledgerService';

dotenv.config();
dotenv.config({ path: '.env.local' });

const cbeVerifier = new CBEVerificationService();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// SECURITY: Multer configuration with file type validation
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter
});

// Separate uploaders for different purposes
const uploadDocuments = multer({
  dest: "uploads/documents/",
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, PDF'));
    }
  }
});

// SECURITY: Error sanitization - don't expose internal errors to clients
function sanitizeError(error: unknown, context?: string): { message: string; code?: string } {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (error instanceof Error) {
    // Log full error for debugging
    console.error(`[ERROR ${context || 'UNKNOWN'}]:`, error);
    
    if (isDev) {
      // In development, return more details but not sensitive info
      return { message: error.message.substring(0, 200), code: 'DEV_ERROR' };
    } else {
      // In production, return generic messages
      return { message: 'An unexpected error occurred. Please try again later.', code: 'SERVER_ERROR' };
    }
  }
  
  return { message: 'An unexpected error occurred.', code: 'UNKNOWN_ERROR' };
}

// Audit logging helper
async function logAction(userId: number | null, action: string, details: any) {
  try {
    const sql = "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)";
    const params = [userId, action, JSON.stringify(details)];
    await db.run(sql, params);
  } catch (e) {
    console.error("Audit logging failed:", e);
  }
}

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // Reduced from 100 to 5 for production
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicRegLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // More restrictive in production
  message: { error: "Too many registration attempts, please try again later." }
});

const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Reduced from 10 to 5
  message: { error: "Too many SMS requests, please slow down." }
});

async function initializeSchema() {
  const schema = `
  CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    contact TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, 
    branch_id INTEGER,
    full_name TEXT,
    email TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );
  -- ... more tables ...
  `;

  // For simplicity in this demo, we'll use the existing SQLite initialization 
  // if NOT in Postgres mode. If in Postgres mode, we assume schema is already 
  // set up via Supabase dashboard or migrations.
  if (!usePostgres) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        student_id_code TEXT,
        branch_id INTEGER,
        program_id INTEGER,
        program_degree TEXT,
        student_type TEXT,
        birth_year TEXT,
        birth_place_region TEXT,
        birth_place_zone TEXT,
        birth_place_woreda TEXT,
        birth_place_kebele TEXT,
        contact_phone TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        documents_json TEXT,
        academic_status TEXT DEFAULT 'good_standing',
        financial_clearance INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (program_id) REFERENCES programs(id)
      );

      CREATE TABLE IF NOT EXISTS parent_students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_user_id INTEGER,
        student_id INTEGER,
        relationship TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_user_id) REFERENCES users(id),
        FOREIGN KEY (student_id) REFERENCES students(id),
        UNIQUE(parent_user_id, student_id)
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        category TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS semester_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        semester_id INTEGER NOT NULL,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'registered',
        approved_by INTEGER,
        notes TEXT,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (semester_id) REFERENCES semesters(id),
        FOREIGN KEY (approved_by) REFERENCES users(id),
        UNIQUE(student_id, semester_id)
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
        prerequisites TEXT,
        is_auditable INTEGER DEFAULT 0,
        program TEXT,
        price_per_credit INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS semesters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER,
        academic_year TEXT,
        semester_name TEXT,
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
        grade TEXT,
        points REAL,
        status TEXT DEFAULT 'enrolled',
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        amount REAL,
        type TEXT,
        status TEXT DEFAULT 'pending',
        transaction_ref TEXT,
        payment_method TEXT,
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
        fee_type TEXT,
        amount REAL,
        FOREIGN KEY (program_id) REFERENCES programs(id),
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key TEXT UNIQUE NOT NULL,
        request_hash TEXT NOT NULL,
        response_status INTEGER DEFAULT -1,
        response_body TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        parent_id INTEGER,
        is_active INTEGER DEFAULT 1,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES accounts(id)
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_number TEXT UNIQUE NOT NULL,
        date DATETIME NOT NULL,
        description TEXT,
        reference_type TEXT,
        reference_id INTEGER,
        status TEXT DEFAULT 'pending',
        posted_by INTEGER,
        posted_at DATETIME,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (posted_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journal_entry_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        entry_type TEXT NOT NULL,
        amount REAL NOT NULL,
        memo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
    `);
    
    // Safe migrations for SQLite - check if columns exist before adding
    function safeAddColumn(table: string, column: string, definition: string) {
      try {
        const result = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
        const exists = result.some(col => col.name === column);
        if (!exists) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        }
      } catch (e) {
        // Column may already exist or table doesn't exist - safe to ignore
      }
    }

    safeAddColumn('users', 'failed_login_attempts', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'locked_until', 'TEXT');
    safeAddColumn('course_materials', 'uploaded_by', 'INTEGER');
    
    // Create indexes for better query performance and security
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);',
      'CREATE INDEX IF NOT EXISTS idx_registration_otps_identifier ON registration_otps(identifier);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);',
      'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);',
      'CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON payments(transaction_ref);',
      'CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);',
      'CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);',
      'CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_students_branch_id ON students(branch_id);',
      'CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);',
      'CREATE INDEX IF NOT EXISTS idx_enrollments_semester_id ON enrollments(semester_id);',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);'
    ];
    
    for (const indexSql of indexes) {
      try { db.exec(indexSql); } catch (e) { /* Index may already exist */ }
    }
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS registration_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER,
        semester_id INTEGER,
        start_date TEXT,
        end_date TEXT,
        is_open INTEGER DEFAULT 0,
        description TEXT,
        course_ids TEXT,
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        semester_id INTEGER,
        title TEXT,
        description TEXT,
        due_date TEXT,
        max_points REAL,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
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
  } else {
    // In Postgres mode, we could run migrations here if needed
    console.log("🐘 Supabase Schema assumed to be managed via migrations/supabase_schema.sql");
  }
}

// Seed initial data
async function seedData() {
  if (usePostgres) return; // Skip seeding for Supabase in this demo (assume pre-seeded)
  
  const branchCount = await db.get("SELECT COUNT(*) as count FROM branches") as { count: number };
  if (branchCount.count === 0) {
    await db.run("INSERT INTO branches (name, location, contact) VALUES (?, ?, ?)", ["Main Campus", "Addis Ababa", "+251-911-123456"]);
    await db.run("INSERT INTO scholarships (name, type, value) VALUES (?, ?, ?)", ["Financial Aid", "Fixed", 2000.0]);
  }

  const hashedPassword = await bcrypt.hash("nabiot123", 10);
  const mockAccounts = [
    { username: "superadmin", role: "superadmin", full_name: "Super Administrator", email: "superadmin@dreamland.edu" },
    { username: "branch_admin", role: "branch_admin", full_name: "Branch Administrator", email: "branch_admin@dreamland.edu", branch_id: 1 },
    { username: "faculty", role: "faculty", full_name: "Faculty Member", email: "faculty@dreamland.edu", branch_id: 1 },
    { username: "accountant", role: "accountant", full_name: "Accountant", email: "accountant@dreamland.edu", branch_id: 1 },
    { username: "registrar", role: "registrar", full_name: "Registrar", email: "registrar@dreamland.edu", branch_id: 1 },
    { username: "student", role: "student", full_name: "Student User", email: "student@dreamland.edu", branch_id: 1 },
  ];

  for (const account of mockAccounts) {
    const existing = await db.get("SELECT id FROM users WHERE username = ?", [account.username]);
    if (!existing) {
      await db.run(
        "INSERT INTO users (username, password, role, full_name, email, branch_id) VALUES (?, ?, ?, ?, ?, ?)",
        [account.username, hashedPassword, account.role, account.full_name, account.email, account.branch_id || null]
      );
      console.log(`Created mock account: ${account.username} / nabiot123`);
    }
  }
}

import cron from 'node-cron';
import { AfroMessageService } from './src/services/messaging/afroMessageService';
import { EmailService } from './src/services/messaging/emailService';
import { TelegramService } from './src/services/messaging/telegramService';
import { AIService } from './src/services/ai/aiService';
import { BackupService } from './src/services/backup/backupService';
import { ChapaService } from './src/services/payment/chapaService';

// Helper to load settings from database
async function loadDbSettings() {
  try {
    const settings = await db.all("SELECT setting_key, setting_value FROM system_settings");
    const settingsObj: any = {};
    settings.forEach((s: any) => {
      try {
        settingsObj[s.setting_key] = JSON.parse(s.setting_value);
      } catch {
        settingsObj[s.setting_key] = s.setting_value;
      }
    });
    return settingsObj;
  } catch (e) {
    console.log("No stored settings found, using environment variables");
    return {};
  }
}

let afroMessage: AfroMessageService;
let emailService: EmailService;
let aiService: AIService;
let backupService: BackupService;
let telegramService: TelegramService;
let chapa: ChapaService;

// Daily Cron Job at 08:00
cron.schedule('0 8 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];

  // 1. Registration Day Reminders - Using SMS
  const regPeriods = await db.all("SELECT * FROM registration_periods WHERE end_date = ? AND is_open = 1", [today]);
  for (const period of regPeriods) {
    const students = await db.all("SELECT s.contact_phone, s.full_name FROM students s JOIN enrollments e ON s.id = e.student_id WHERE e.semester_id = ?", [period.semester_id]);
    for (const student of students) {
      if (student.contact_phone && afroMessage) {
        await afroMessage.sendSMS(student.contact_phone, `Dear ${student.full_name}, today is the last day for registration. Please complete your payment.`);
      }
    }
  }

  // 2. End of Course Reminders - Using SMS
  const coursesEnding = await db.all("SELECT c.title, e.student_id FROM enrollments e JOIN courses c ON e.course_id = c.id JOIN academic_calendars ac ON e.semester_id = ac.id WHERE ac.end_date = ?", [today]);
  for (const record of coursesEnding) {
    const student = await db.get("SELECT contact_phone, full_name FROM students WHERE id = ?", [record.student_id]);
    if (student && student.contact_phone && afroMessage) {
      await afroMessage.sendSMS(student.contact_phone, `Dear ${student.full_name}, your course ${record.title} is ending today. Please ensure all payments are settled.`);
    }
  }
});

// Daily Backup at 02:00 AM
cron.schedule('0 2 * * *', async () => {
  if (!backupService) return;
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
  if (!aiService) return;
  console.log('Generating weekly at-risk student report...');
  const students = await db.all(`
    SELECT s.*, u.full_name, u.email, 
           (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.id AND e.grade = 'F') as failed_courses
    FROM students s
    JOIN users u ON s.user_id = u.id
  `);

  const atRiskStudents = await aiService.identifyAtRiskStudents(students);
  
  if (atRiskStudents.length > 0) {
    // Notify admins
    const admins = await db.all("SELECT email FROM users WHERE role = 'superadmin'");
    for (const admin of admins) {
      console.log(`At-risk report sent to: ${admin.email}`);
    }
  }
});

async function startServer() {
  // Initialize Database
  await initializeSchema();
  await seedData();
  
  const dbSettings = await loadDbSettings();

  // Initialize Services with dbSettings
  afroMessage = new AfroMessageService({
    apiKey: dbSettings.sms_config?.apiKey || process.env.AFROMESSAGE_API_KEY,
    senderId: dbSettings.sms_config?.senderId || process.env.AFROMESSAGE_SENDER_ID || 'Dreamland',
    identifierId: dbSettings.sms_config?.identifierId || process.env.AFROMESSAGE_IDENTIFIER_ID || '',
    mockMode: dbSettings.sms_config?.mockMode || process.env.AFROMESSAGE_MOCK_MODE === 'true'
  });

  emailService = new EmailService({
    enabled: dbSettings.email_config?.enabled ?? (process.env.EMAIL_ENABLED === 'true'),
    provider: (dbSettings.email_config?.provider || process.env.EMAIL_PROVIDER as 'resend' | 'smtp') || 'resend',
    resendApiKey: dbSettings.email_config?.resendApiKey || process.env.RESEND_API_KEY,
    fromName: dbSettings.email_config?.fromName || process.env.EMAIL_FROM_NAME || 'Dreamland College',
    fromAddress: dbSettings.email_config?.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'
  });

  aiService = new AIService();
  backupService = new BackupService();
  telegramService = new TelegramService(process.env.TELEGRAM_BOT_TOKEN);

  chapa = new ChapaService({
    secretKey: dbSettings.payment_config?.secretKey || process.env.CHAPA_SECRET_KEY,
    publicKey: dbSettings.payment_config?.publicKey || process.env.CHAPA_PUBLIC_KEY,
    webhookSecret: dbSettings.payment_config?.webhookSecret || process.env.CHAPA_WEBHOOK_SECRET
  });

  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  // Security middleware
  app.use(helmet({ 
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false 
  }));
  
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : [
        'http://localhost:5173', 
        'http://localhost:3000',
        'https://dreamland-college.vercel.app',
        'https://dreamland.edu.et'
      ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const isProduction = process.env.NODE_ENV === 'production';
      
      // SECURITY: In production, only allow specific origins
      if (isProduction) {
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          console.warn(`[CORS] Blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        // In development, allow localhost and log other origins
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          console.warn(`[CORS] Development mode: blocking non-localhost origin: ${origin}`);
          callback(new Error('Not allowed by CORS in development'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
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
    const { identifier, type, full_name, phone } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    try {
      // Store OTP
      db.prepare("INSERT INTO registration_otps (identifier, code, expires_at) VALUES (?, ?, ?)").run(identifier, code, expiresAt);
      
      if (type === 'sms' && phone) {
        // Send via SMS
        const smsResult = await afroMessage.sendSMS(
          phone, 
          `Dreamland College: Your verification code is ${code}. Valid for 10 minutes. Do not share.`
        );
        if (smsResult.success) {
          res.json({ success: true, message: `OTP sent to ${phone}`, method: 'sms', messageId: smsResult.messageId });
        } else {
          res.status(500).json({ error: 'Failed to send SMS. Please try again.', details: smsResult.error });
        }
      } else {
        // Fallback to Email
        await emailService.sendNotification(
          identifier, 
          '🎓 Dreamland College Verification', 
          `Hello ${full_name || 'Student'},\n\nYour verification code for registration is: ${code}\n\nThis code will expire in 10 minutes.`
        );
        res.json({ success: true, message: `OTP sent to ${identifier}`, method: 'email' });
      }
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

  // SECURITY: Public upload with file type validation
  app.post("/api/public/upload", uploadDocuments.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/documents/${req.file.filename}` });
  });

  app.post("/api/public/register-student", publicRegLimiter, async (req, res) => {
    const { 
      full_name, birth_year, region, zone, woreda, kebele, 
      phone, email, afroMessage_username, emergency_name, emergency_phone,
      program_id, program_degree, student_type, branch_id, 
      diploma_url, transcript_url, id_card_url, portrait_url, password
    } = req.body;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

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
      req.user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
        status: process.env.AFROMESSAGE_API_KEY && process.env.AFROMESSAGE_API_KEY !== 'YOUR_AFROMESSAGE_API_KEY_HERE' ? 'configured' : 'demo_mode',
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

      // For students, check semester registration status
      if (user.role === 'student') {
        const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get(user.id) as any;
        
        if (student) {
          const activeSemester = db.prepare("SELECT id FROM semesters WHERE is_active = 1 ORDER BY id DESC LIMIT 1").get() as any;
          const period = db.prepare("SELECT * FROM registration_periods WHERE is_open = 1 ORDER BY id DESC LIMIT 1").get() as any;
          
          if (activeSemester) {
            const registration = db.prepare("SELECT status FROM semester_registrations WHERE student_id = ? AND semester_id = ?").get(student.id, activeSemester.id) as any;
            
            if (!registration) {
              // No registration record - check if in open registration period
              if (!period) {
                // Not in registration period - block login
                logAction(user.id, "LOGIN_BLOCKED_NO_REGISTRATION", { reason: "Not registered for current semester and registration period is closed" });
                return res.status(403).json({ 
                  error: "BLOCKED",
                  message: "You are not registered for the current semester. Registration period is closed. Please visit the registrar's office.",
                  requiresOfficeVisit: true
                });
              }
            } else if (registration.status === 'banned') {
              // Student is banned
              logAction(user.id, "LOGIN_BLOCKED_BANNED", { reason: "Student banned from registration" });
              return res.status(403).json({ 
                error: "BLOCKED",
                message: "You have been restricted from the system. Please visit the registrar's office.",
                requiresOfficeVisit: true
              });
            } else if (registration.status === 'pending_approval') {
              // Student has pending approval - allow login but show message
              logAction(user.id, "LOGIN_PENDING_APPROVAL", { message: "Student waiting for registration approval" });
            }
          }
        }
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, branch_id: user.branch_id }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });
      const refreshToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
      
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
      const decoded: any = jwt.verify(refreshToken, JWT_SECRET, { algorithms: ['HS256'] });
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id) as any;
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const newToken = jwt.sign({ id: user.id, username: user.username, role: user.role, branch_id: user.branch_id }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });
      
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
    // SECURITY: Never log tokens - only log that a reset was requested
    console.log(`Password reset requested for: ${email.substring(0, 3)}***@***`);
    
    logAction(user.id, "PASSWORD_RESET_REQUEST", { email: email.substring(0, 3) + '***' });
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

  app.get("/api/students/:id/transcript", authenticate, authorize(['superadmin', 'branch_admin', 'registrar', 'instructor', 'student']), (req, res) => {
    const studentId = req.params.id;
    const { role, id: userId } = (req as any).user;

    // Ownership check for students
    if (role === 'student') {
      const studentRecord = db.prepare("SELECT id FROM students WHERE user_id = ?").get(userId) as any;
      if (!studentRecord || studentRecord.id !== parseInt(studentId)) {
        return res.status(403).json({ error: "Forbidden: You can only view your own transcript" });
      }
    }

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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

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
        const { full_name, email, phone, branch_id, program_id, program_degree, student_type, password } = record;
        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!password || !passwordRegex.test(password)) {
          results.push({ email, status: 'error', error: "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character." });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

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
      console.error("[SERVER ERROR]", e);
      res.status(500).json({ error: "An internal server error occurred. Please contact support." });
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

  // Student: My Courses with Instructors
  app.get("/api/my-courses", authenticate, authorize(['student']), (req, res) => {
    const user_id = (req as any).user.id;
    
    const coursesWithInstructors = db.prepare(`
      SELECT 
        e.id as enrollment_id,
        e.status as enrollment_status,
        e.grade,
        c.id as course_id,
        c.code as course_code,
        c.title as course_title,
        c.credits,
        u_instructor.id as instructor_id,
        u_instructor.full_name as instructor_name,
        u_instructor.email as instructor_email,
        cof.role as instructor_role,
        sem.semester_name,
        sem.academic_year
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN semesters sem ON e.semester_id = sem.id
      LEFT JOIN course_offerings co ON co.course_id = c.id AND co.semester_id = e.semester_id
      LEFT JOIN course_offerings_faculty cof ON cof.course_offering_id = co.id
      LEFT JOIN users u_instructor ON cof.user_id = u_instructor.id
      WHERE e.student_id = (SELECT id FROM students WHERE user_id = ?)
      ORDER BY sem.start_date DESC, c.code
    `).all(user_id);
    
    res.json(coursesWithInstructors);
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

    // Grade validation
    if ([assignment_grade, midterm_grade, final_grade].some(g => typeof g !== 'number' || g < 0 || g > 100)) {
      return res.status(400).json({ error: "Invalid grade values. Must be numbers between 0 and 100." });
    }

    const points = (assignment_grade * 0.2) + (midterm_grade * 0.3) + (final_grade * 0.5);    let grade = 'F';
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

  app.get("/api/registration-periods", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), (req, res) => {
    const { branch_id, role } = (req as any).user;
    let periods;
    if (role === 'superadmin') {
      periods = db.prepare(`
        SELECT rp.*, b.name as branch_name, s.semester_name 
        FROM registration_periods rp 
        LEFT JOIN branches b ON rp.branch_id = b.id 
        LEFT JOIN semesters s ON rp.semester_id = s.id
        ORDER BY rp.start_date DESC
      `).all();
    } else {
      periods = db.prepare(`
        SELECT rp.*, b.name as branch_name, s.semester_name 
        FROM registration_periods rp 
        LEFT JOIN branches b ON rp.branch_id = b.id 
        LEFT JOIN semesters s ON rp.semester_id = s.id
        WHERE rp.branch_id = ?
        ORDER BY rp.start_date DESC
      `).all(branch_id);
    }
    res.json(periods);
  });

  app.post("/api/registration-periods", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), (req, res) => {
    const { branch_id, semester_id, start_date, end_date, description, course_ids } = req.body;
    const userBranchId = (req as any).user.role === 'branch_admin' ? (req as any).user.branch_id : branch_id;
    const result = db.prepare("INSERT INTO registration_periods (branch_id, semester_id, start_date, end_date, description, course_ids) VALUES (?, ?, ?, ?, ?, ?)").run(
      userBranchId || null, semester_id, start_date, end_date, description || null, course_ids ? JSON.stringify(course_ids) : null
    );
    logAction((req as any).user.id, "REG_PERIOD_CREATE", { semester_id, course_ids });
    res.json({ id: result.lastInsertRowid, message: "Registration period defined" });
  });

  app.put("/api/registration-periods/:id/toggle", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), (req, res) => {
    const periodId = req.params.id;
    const period = db.prepare("SELECT is_open FROM registration_periods WHERE id = ?").get(periodId) as any;
    
    if (period.is_open) {
      db.prepare("UPDATE registration_periods SET is_open = 0 WHERE id = ?").run(periodId);
    } else {
      db.prepare("UPDATE registration_periods SET is_open = 0").run();
      db.prepare("UPDATE registration_periods SET is_open = 1 WHERE id = ?").run(periodId);
    }
    
    logAction((req as any).user.id, "REG_PERIOD_TOGGLE", { periodId });
    res.json({ message: "Registration period status toggled" });
  });

  app.delete("/api/registration-periods/:id", authenticate, authorize(['superadmin', 'registrar']), (req, res) => {
    db.prepare("DELETE FROM registration_periods WHERE id = ?").run(req.params.id);
    logAction((req as any).user.id, "REG_PERIOD_DELETE", { periodId: req.params.id });
    res.json({ message: "Registration period deleted" });
  });

  // Semester Registration System
  // Check if student is registered for current semester
  app.get("/api/semester-registration/status", authenticate, authorize(['student']), (req, res) => {
    const userId = (req as any).user.id;
    const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get(userId) as any;
    
    if (!student) {
      return res.json({ registered: false, message: "Student record not found" });
    }

    const activeSemester = db.prepare("SELECT id, semester_name, academic_year FROM semesters WHERE is_active = 1 ORDER BY id DESC LIMIT 1").get() as any;
    
    if (!activeSemester) {
      return res.json({ registered: false, message: "No active semester", semester: null });
    }

    const registration = db.prepare("SELECT * FROM semester_registrations WHERE student_id = ? AND semester_id = ?").get(student.id, activeSemester.id) as any;
    
    res.json({
      registered: !!registration,
      status: registration?.status || null,
      semester: activeSemester,
      registrationDate: registration?.registration_date || null
    });
  });

  // Student registers for current semester
  app.post("/api/semester-registration/register", authenticate, authorize(['student']), (req, res) => {
    const userId = (req as any).user.id;
    const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get(userId) as any;
    
    if (!student) {
      return res.status(400).json({ error: "Student record not found" });
    }

    // Check if registration period is open
    const period = db.prepare("SELECT * FROM registration_periods WHERE is_open = 1 ORDER BY id DESC LIMIT 1").get() as any;
    
    const activeSemester = db.prepare("SELECT id FROM semesters WHERE is_active = 1 ORDER BY id DESC LIMIT 1").get() as any;
    
    if (!activeSemester) {
      return res.status(400).json({ error: "No active semester" });
    }

    // Check if already registered
    const existing = db.prepare("SELECT id, status FROM semester_registrations WHERE student_id = ? AND semester_id = ?").get(student.id, activeSemester.id) as any;
    
    if (existing) {
      if (existing.status === 'banned') {
        return res.status(403).json({ error: "You have been banned from registration. Please visit the registrar's office." });
      }
      return res.status(400).json({ error: "Already registered for this semester", status: existing.status });
    }

    // If registration period is closed, mark as pending manual approval
    const status = period ? 'registered' : 'pending_approval';
    
    const result = db.prepare("INSERT INTO semester_registrations (student_id, semester_id, status, notes) VALUES (?, ?, ?, ?)").run(
      student.id, activeSemester.id, status, period ? null : "Registered after deadline - requires approval"
    );

    logAction(userId, "SEMESTER_REGISTRATION", { student_id: student.id, semester_id: activeSemester.id, status });
    
    res.json({ 
      message: period ? "Successfully registered for semester!" : "Registration submitted - pending approval",
      registrationId: result.lastInsertRowid,
      status,
      requiresApproval: !period
    });
  });

  // Get all semester registrations (admin)
  app.get("/api/semester-registrations", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), (req, res) => {
    const { branch_id, role } = (req as any).user;
    const { semester_id, status } = req.query;
    
    let query = `
      SELECT sr.*, s.full_name, s.student_id_code, s.contact_phone, s.branch_id,
             sem.semester_name, sem.academic_year, u.full_name as approved_by_name
      FROM semester_registrations sr
      JOIN students s ON sr.student_id = s.id
      JOIN semesters sem ON sr.semester_id = sem.id
      LEFT JOIN users u ON sr.approved_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (role === 'branch_admin' || role === 'registrar') {
      query += " AND s.branch_id = ?";
      params.push(branch_id);
    }
    
    if (semester_id) {
      query += " AND sr.semester_id = ?";
      params.push(semester_id);
    }
    
    if (status) {
      query += " AND sr.status = ?";
      params.push(status);
    }
    
    query += " ORDER BY sr.registration_date DESC";
    
    const registrations = db.prepare(query).all(...params);
    res.json(registrations);
  });

  // Approve registration (registrar/admin)
  app.put("/api/semester-registrations/:id/approve", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    db.prepare("UPDATE semester_registrations SET status = 'registered', approved_by = ?, registration_date = CURRENT_TIMESTAMP WHERE id = ?").run(userId, id);
    
    logAction(userId, "REGISTRATION_APPROVE", { registration_id: id });
    res.json({ message: "Registration approved" });
  });

  // Ban student from registration
  app.put("/api/semester-registrations/:id/ban", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user.id;
    
    db.prepare("UPDATE semester_registrations SET status = 'banned', approved_by = ?, notes = ? WHERE id = ?").run(userId, reason || "Banned by admin", id);
    
    logAction(userId, "REGISTRATION_BAN", { registration_id: id, reason });
    res.json({ message: "Student banned from registration" });
  });

  // Allow banned student to register (manual override)
  app.put("/api/semester-registrations/:id/allow", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    db.prepare("UPDATE semester_registrations SET status = 'registered', approved_by = ? WHERE id = ?").run(userId, id);
    
    logAction(userId, "REGISTRATION_ALLOWED", { registration_id: id });
    res.json({ message: "Student allowed to register" });
  });

  // Student requests late registration (after deadline)
  app.post("/api/semester-registration/late-request", authenticate, authorize(['student']), (req, res) => {
    const { reason } = req.body;
    const userId = (req as any).user.id;
    const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get(userId) as any;
    
    if (!student) {
      return res.status(400).json({ error: "Student record not found" });
    }

    const activeSemester = db.prepare("SELECT id FROM semesters WHERE is_active = 1 ORDER BY id DESC LIMIT 1").get() as any;
    
    if (!activeSemester) {
      return res.status(400).json({ error: "No active semester" });
    }

    // Check if already has a pending or banned registration
    const existing = db.prepare("SELECT id, status FROM semester_registrations WHERE student_id = ? AND semester_id = ?").get(student.id, activeSemester.id) as any;
    
    if (existing) {
      if (existing.status === 'registered') {
        return res.status(400).json({ error: "Already registered for this semester" });
      }
      // Update existing pending request
      db.prepare("UPDATE semester_registrations SET status = 'pending_approval', notes = ? WHERE id = ?").run(`Late registration request: ${reason}`, existing.id);
      logAction(userId, "LATE_REGISTRATION_REQUEST", { student_id: student.id, reason });
      return res.json({ message: "Late registration request submitted" });
    }

    // Create new pending registration
    db.prepare("INSERT INTO semester_registrations (student_id, semester_id, status, notes) VALUES (?, ?, 'pending_approval', ?)").run(
      student.id, activeSemester.id, `Late registration request: ${reason}`
    );
    
    logAction(userId, "LATE_REGISTRATION_REQUEST", { student_id: student.id, reason });
    res.json({ message: "Late registration request submitted - pending approval" });
  });


  // Available Courses
  app.get("/api/courses/available", authenticate, authorize(['student']), (req, res) => {
    const courses = db.prepare("SELECT co.*, c.title, c.code, c.is_auditable FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE co.semester_id = (SELECT id FROM semesters WHERE is_active = 1)").all();
    res.json(courses);
  });

  // Payment Verification
  app.post("/api/payments/verify", authenticate, authorize(['student']), async (req, res) => {
    const idempotencyKey = req.headers[IDEMPOTENCY_HEADER.toLowerCase()] as string | undefined;

    // Check idempotency
    const idempotencyCheck = await idempotencyService.checkAndLock(idempotencyKey, req.body);
    if (idempotencyCheck.exists && idempotencyCheck.record) {
      if (idempotencyCheck.processing) {
        return res.status(409).json({ error: 'Request is already being processed' });
      }
      console.log(`[IDEMPOTENCY] Returning cached response for key: ${idempotencyKey}`);
      return res.status(idempotencyCheck.record.response_status).json(JSON.parse(idempotencyCheck.record.response_body));
    }

    const { reference, last8Digits, student_id } = req.body;

    // Strict type validation for input
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ error: 'Reference number is required' });
    }
    if (!last8Digits || typeof last8Digits !== 'string' || last8Digits.length !== 8) {
      return res.status(400).json({ error: 'Last 8 digits of account number are required' });
    }
    if (!student_id || typeof student_id !== 'number' || student_id <= 0) {
      return res.status(400).json({ error: 'Valid student_id is required' });
    }

    const result = await cbeVerifier.verify(reference, last8Digits);

    // STRICT: Only proceed with DB write if verification explicitly returns success=true
    if (result.success === true) {
      // Double-validate the verification signal
      if (!isStrictVerificationSignal(result)) {
        console.error('[PAYMENT VERIFY] Invalid verification signal - missing required fields');
        const response = { error: 'Verification signal invalid' };
        await idempotencyService.saveResponse(idempotencyKey || '', 500, response);
        return res.status(500).json(response);
      }

      // Validate payment insert data strictly
      const paymentData = {
        student_id,
        amount: result.amount,
        status: 'verified' as const,
        transaction_ref: reference,
        payment_method: 'cbe_receipt' as const
      };
      const validation = validatePaymentInsert(paymentData);
      if (!validation.valid) {
        console.error('[PAYMENT VERIFY] Payment data validation failed:', validation.error);
        const response = { error: 'Invalid payment data' };
        await idempotencyService.saveResponse(idempotencyKey || '', 500, response);
        return res.status(500).json(response);
      }

      try {
        // STRICT: Wrap payment + ledger in atomic transaction
        const userId = (req as any).user?.id || null;
        const entryNumber = await db.transaction(async (client) => {
          // Insert payment record
          const paymentResult = await client.run(
            "INSERT INTO payments (student_id, amount, status, transaction_ref, payment_method) VALUES (?, ?, 'verified', ?, 'cbe_receipt')",
            [student_id, result.amount, reference]
          );
          const paymentId = Number(paymentResult.lastInsertRowid);

          // Get ledger accounts
          const bankAccount = await ledgerService.getAccountByCode('1100');
          const tuitionRevenue = await ledgerService.getAccountByCode('4000');

          if (!bankAccount || !tuitionRevenue) {
            throw new Error('Required accounts not found. Please initialize ledger accounts.');
          }

          // Create journal entry
          const journalResult = await client.run(
            `INSERT INTO journal_entries (entry_number, date, description, reference_type, reference_id, status, posted_by, posted_at)
             VALUES (?, datetime('now'), ?, 'payment', ?, 'pending', ?, datetime('now'))`,
            [`JE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, 
             `Student payment - Student ID: ${student_id}, Amount: ${result.amount} ETB, Method: cbe_receipt`, 
             paymentId, userId]
          );

          const journalId = Number(journalResult.lastInsertRowid);

          // Create debit entry (Bank)
          await client.run(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, entry_type, amount, memo) VALUES (?, ?, ?, ?, ?)`,
            [journalId, bankAccount.id, 'debit', result.amount, `Payment from student ${student_id}, ref: ${reference}`]
          );

          // Create credit entry (Tuition Revenue)
          await client.run(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, entry_type, amount, memo) VALUES (?, ?, ?, ?, ?)`,
            [journalId, tuitionRevenue.id, 'credit', result.amount, `Tuition payment from student ${student_id}`]
          );

          // Mark journal entry as posted
          await client.run(
            `UPDATE journal_entries SET status = 'posted' WHERE id = ?`,
            [journalId]
          );

          return journalId;
        });

        console.log(`[PAYMENT VERIFY] Atomic transaction completed: Payment + Ledger entry created`);

        logAction((req as any).user.id, "PAYMENT_VERIFY", { reference, amount: result.amount });

        // Get student details
        const student = db.prepare(`
          SELECT s.phone, s.full_name, u.email 
          FROM students s 
          JOIN users u ON s.user_id = u.id 
          WHERE s.id = ?
        `).get(student_id) as any;
        
        if (student) {
          // Send via SMS
          if (student.contact_phone) {
            try {
              await afroMessage.sendSMS(
                student.contact_phone, 
                `✅ Payment Confirmed! Dear ${student.full_name}, your payment of ${result.amount} ETB has been verified. Ref: ${reference}. - Dreamland College`
              );
              console.log(`✅ Payment notification sent via SMS`);
            } catch (smsError) {
              console.error('❌ SMS notification failed:', smsError);
            }
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

        const response = { message: "Payment verified successfully", amount: result.amount };
        await idempotencyService.saveResponse(idempotencyKey || '', 200, response);
        res.json(response);
      } catch (dbError: unknown) {
        console.error('[PAYMENT VERIFY] Database write failed:', dbError);
        const response = { error: 'Failed to record payment' };
        await idempotencyService.saveResponse(idempotencyKey || '', 500, response);
        res.status(500).json(response);
      }
    } else {
      const response = { error: result.error };
      await idempotencyService.saveResponse(idempotencyKey || '', 400, response);
      res.status(400).json(response);
    }
  });

  // Academic Calendars
  app.get("/api/academic-calendars", authenticate, authorize(['superadmin', 'branch_admin', 'registrar', 'instructor', 'student', 'parent']), (req, res) => {
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
      afroMessage: {
        configured: !!process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE',
        mock_mode: process.env.TELEGRAM_MOCK_MODE === 'true'
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

  // Save Integration Settings (Superadmin only)
  app.post("/api/settings/integrations", authenticate, authorize(['superadmin']), (req, res) => {
    const { sms, email, payment } = req.body;
    
    try {
      const saveSetting = (key: string, value: any) => {
        const existing = db.prepare("SELECT id FROM system_settings WHERE setting_key = ?").get(key);
        if (existing) {
          db.prepare("UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?").run(JSON.stringify(value), key);
        } else {
          db.prepare("INSERT INTO system_settings (setting_key, setting_value, category) VALUES (?, ?, ?)").run(key, JSON.stringify(value), 'integrations');
        }
      };

      if (sms) saveSetting('sms_config', sms);
      if (email) saveSetting('email_config', email);
      if (payment) saveSetting('payment_config', payment);

      res.json({ success: true, message: "Settings saved successfully" });
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get System Settings (Superadmin only)
  app.get("/api/settings/system", authenticate, authorize(['superadmin']), (req, res) => {
    try {
      const settings = db.prepare("SELECT setting_key, setting_value, category, updated_at FROM system_settings").all();
      const settingsObj: any = {};
      settings.forEach((s: any) => {
        try {
          settingsObj[s.setting_key] = JSON.parse(s.setting_value);
        } catch {
          settingsObj[s.setting_key] = s.setting_value;
        }
      });
      res.json(settingsObj);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // File Upload (SECURITY: With file type validation)
  app.post("/api/upload", authenticate, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}`, mimetype: req.file.mimetype });
  });
  app.use("/uploads", express.static(uploadDir));

  app.get("/api/programs", authenticate, authorize(['superadmin', 'branch_admin', 'registrar', 'instructor', 'student', 'parent']), (req, res) => {
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

  // SMS Message Endpoint
  app.post("/api/sms/send", smsLimiter, authenticate, authorize(['superadmin', 'branch_admin', 'accountant']), async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await afroMessage.sendSMS(phone, message);
    
    if (result.success) {
      logAction((req as any).user.id, "SMS_SENT", { phone, messageId: result.messageId });
      res.json({ success: true, message: 'SMS sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to send SMS' });
    }
  });

  // Bulk SMS Endpoint
  app.post("/api/sms/send-bulk", smsLimiter, authenticate, authorize(['superadmin', 'branch_admin']), async (req, res) => {
    const { phones, message } = req.body;

    if (!Array.isArray(phones) || !message) {
      return res.status(400).json({ error: 'Phone numbers array and message are required' });
    }

    const result = await afroMessage.sendBulkSMS(phones, message);
    
    logAction((req as any).user.id, "BULK_SMS_SENT", { sent: result.sent, failed: result.failed });
    res.json({ success: true, message: `SMS sent: ${result.sent} sent, ${result.failed} failed`, sent: result.sent, failed: result.failed });
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
  // SECURITY: This endpoint verifies callbacks with Chapa API before updating payments
  app.get("/api/payments/callback", async (req, res) => {
    const { tx_ref, status } = req.query;
    
    if (!tx_ref) {
      return res.status(400).json({ error: 'Transaction reference required' });
    }

    const txRef = Array.isArray(tx_ref) ? tx_ref[0] : tx_ref;

    if (typeof txRef !== 'string' || txRef.length === 0) {
      return res.status(400).json({ error: 'Invalid transaction reference' });
    }

    // SECURITY: First verify tx_ref exists in our pending payments
    const pendingPayment = db.prepare("SELECT * FROM payments WHERE transaction_ref = ? AND status = 'pending'").get(txRef) as any;
    if (!pendingPayment) {
      // tx_ref not found or not pending - may already be processed or invalid
      console.log(`[CALLBACK] No pending payment found for tx_ref: ${txRef}`);
      return res.redirect(`/payment-success?tx_ref=${txRef}&status=not_found`);
    }

    // SECURITY: Verify with Chapa API - this is the critical verification step
    const verification = await chapa.verifyPayment(txRef as string);
    
    // STRICT: Only update database when Chapa explicitly confirms success
    if (verification.status === 'success' && verification.data?.status === 'success') {
      // Strict validation of verification response
      if (!verification.data || typeof verification.data.amount !== 'number' || verification.data.amount <= 0) {
        console.error('[CHAPA CALLBACK] Invalid verification data:', verification.data);
        return res.redirect(`/payment-success?tx_ref=${txRef}&status=failed`);
      }

      // Update payment status in database
      const payment = db.prepare("SELECT * FROM payments WHERE transaction_ref = ?").get(txRef) as any;
      
      if (payment) {
        try {
          // STRICT: Only write to DB after verified success signal from API
          await db.strictWrite('UPDATE', 'payments',
            "UPDATE payments SET status = 'verified' WHERE transaction_ref = ?",
            [txRef]
          );

          // Record in accounting ledger (double-entry bookkeeping)
          const ledgerResult = await ledgerService.recordPayment(
            payment.student_id,
            payment.id,
            verification.data.amount,
            'chapa',
            null
          );

          if (!ledgerResult.success) {
            console.error('[CHAPA CALLBACK] Ledger entry failed:', ledgerResult.error);
          }
          
          // Get student details for notification
          const student = db.prepare(`
            SELECT s.contact_phone, s.full_name, u.email
            FROM students s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ?
          `).get(payment.student_id) as any;

          if (student) {
            // Send SMS notification
            if (student.contact_phone) {
              try {
                await afroMessage.sendSMS(
                  student.contact_phone,
                  `✅ Payment Confirmed! Dear ${student.full_name}, your payment of ${verification.data.amount} ETB has been verified. Ref: ${txRef}. - Dreamland College`
                );
              } catch (smsError) {
                console.error('[CHAPA CALLBACK] SMS failed:', smsError);
              }
            }

            // Send email notification
            if (student.email) {
              try {
                await emailService.sendPaymentConfirmation(student.email, student.full_name, verification.data.amount, String(txRef));
              } catch (emailError) {
                console.error('[CHAPA CALLBACK] Email failed:', emailError);
              }
            }
          }

          logAction(null, "PAYMENT_VERIFIED", { tx_ref: String(txRef), amount: verification.data.amount, ledgerEntry: ledgerResult.entry_number });
        } catch (dbError: unknown) {
          console.error('[CHAPA CALLBACK] Database update failed:', dbError);
        }
      }

      // Redirect to success page
      res.redirect(`/payment-success?tx_ref=${txRef}&status=success`);
    } else {
      console.warn(`[CHAPA CALLBACK] Payment not verified: ${txRef}, status: ${verification.status}`);
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

    let eventData: Record<string, unknown>;
    try {
      eventData = JSON.parse(payload);
    } catch (parseError) {
      console.error('[WEBHOOK] Failed to parse payload:', parseError);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    
    // STRICT: Only proceed with verified success signal from webhook
    if (eventData.status === 'success') {
      const tx_ref = eventData.tx_ref;
      
      // Strict validation of webhook data
      if (typeof tx_ref !== 'string' || tx_ref.length === 0) {
        console.error('[WEBHOOK] Missing or invalid tx_ref');
        return res.json({ received: true });
      }
      
      if (typeof eventData.amount !== 'number' || eventData.amount <= 0) {
        console.error('[WEBHOOK] Missing or invalid amount');
        return res.json({ received: true });
      }

      // Update payment in database
      const payment = db.prepare("SELECT * FROM payments WHERE transaction_ref = ?").get(tx_ref) as any;
      
      if (payment && payment.status !== 'verified') {
        try {
          // STRICT: Only write to DB after verified success signal
          await db.strictWrite('UPDATE', 'payments',
            "UPDATE payments SET status = 'verified' WHERE transaction_ref = ?",
            [tx_ref]
          );

          // Record in accounting ledger (double-entry bookkeeping)
          const ledgerResult = await ledgerService.recordPayment(
            payment.student_id,
            payment.id,
            eventData.amount as number,
            'chapa',
            null
          );

          if (!ledgerResult.success) {
            console.error('[WEBHOOK] Ledger entry failed:', ledgerResult.error);
          }
          
          // Get student details for notification
          const student = db.prepare(`
            SELECT s.contact_phone, s.full_name, u.email
            FROM students s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ?
          `).get(payment.student_id) as any;

          if (student) {
            if (student.contact_phone) {
              try {
                await afroMessage.sendSMS(
                  student.contact_phone,
                  `✅ Payment Confirmed! Dear ${student.full_name}, your payment of ${eventData.amount} ETB has been verified. Ref: ${tx_ref}. - Dreamland College`
                );
              } catch (smsError) {
                console.error('[WEBHOOK] SMS failed:', smsError);
              }
            }
            if (student.email) {
              try {
                await emailService.sendPaymentConfirmation(student.email, student.full_name, eventData.amount as number, tx_ref as string);
              } catch (emailError) {
                console.error('[WEBHOOK] Email failed:', emailError);
              }
            }
          }

          logAction(null, "PAYMENT_WEBHOOK_VERIFIED", { tx_ref, amount: eventData.amount, ledgerEntry: ledgerResult.entry_number });
        } catch (dbError: unknown) {
          console.error('[WEBHOOK] Database update failed:', dbError);
        }
      }
    }

    res.json({ received: true });
  });

  // CBE Receipt Verification (Real Integration)
  app.post("/api/payments/verify-cbe", authenticate, async (req, res) => {
    const idempotencyKey = req.headers[IDEMPOTENCY_HEADER.toLowerCase()] as string | undefined;

    // Check idempotency
    const idempotencyCheck = await idempotencyService.checkAndLock(idempotencyKey, req.body);
    if (idempotencyCheck.exists && idempotencyCheck.record) {
      if (idempotencyCheck.processing) {
        return res.status(409).json({ error: 'Request is already being processed' });
      }
      console.log(`[IDEMPOTENCY] Returning cached response for key: ${idempotencyKey}`);
      return res.status(idempotencyCheck.record.response_status).json(JSON.parse(idempotencyCheck.record.response_body));
    }

    const { reference, last8Digits } = req.body;
    
    if (!reference || !last8Digits) {
      return res.status(400).json({ error: 'Reference and last 8 digits are required' });
    }

    const result = await cbeVerifier.verify(reference, last8Digits);
    
    // STRICT: Only proceed when verification explicitly returns success=true
    if (result.success === true) {
      // Double-validate the verification signal
      if (!isStrictVerificationSignal(result)) {
        console.error('[VERIFY-CBE] Invalid verification signal');
        const response = { error: 'Verification signal invalid' };
        await idempotencyService.saveResponse(idempotencyKey || '', 500, response);
        return res.status(500).json(response);
      }

      const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get((req as any).user.id) as any;
      
      if (student) {
        // Validate payment insert data strictly
        const paymentData = {
          student_id: student.id,
          amount: result.amount,
          status: 'verified' as const,
          transaction_ref: reference,
          payment_method: 'cbe_receipt' as const
        };
        const validation = validatePaymentInsert(paymentData);
        if (!validation.valid) {
          console.error('[VERIFY-CBE] Payment data validation failed:', validation.error);
          const response = { error: 'Invalid payment data' };
          await idempotencyService.saveResponse(idempotencyKey || '', 500, response);
          return res.status(500).json(response);
        }

        try {
          // STRICT: Only write to DB after verified success signal
          const paymentResult = await db.strictWrite('INSERT', 'payments',
            "INSERT INTO payments (student_id, amount, status, transaction_ref, payment_method) VALUES (?, ?, 'verified', ?, 'cbe_receipt')",
            [student.id, result.amount, reference]
          );
          const paymentId = Number(paymentResult.lastInsertRowid);

          // Record in accounting ledger (double-entry bookkeeping)
          const ledgerResult = await ledgerService.recordPayment(
            student.id,
            paymentId,
            result.amount,
            'cbe_receipt',
            (req as any).user?.id || null
          );

          if (!ledgerResult.success) {
            console.error('[VERIFY-CBE] Ledger entry failed:', ledgerResult.error);
          }

          // Get student details for notification
          const studentDetails = db.prepare(`
            SELECT s.contact_phone, s.full_name, u.email
            FROM students s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ?
          `).get(student.id) as any;

          if (studentDetails) {
            if (studentDetails.contact_phone) {
              try {
                await afroMessage.sendSMS(
                  studentDetails.contact_phone,
                  `✅ Payment Confirmed! Dear ${studentDetails.full_name}, your payment of ${result.amount} ETB has been verified. Ref: ${reference}. - Dreamland College`
                );
              } catch (smsError) {
                console.error('[VERIFY-CBE] SMS failed:', smsError);
              }
            }
            if (studentDetails.email) {
              try {
                await emailService.sendPaymentConfirmation(studentDetails.email, studentDetails.full_name, result.amount, reference);
              } catch (emailError) {
                console.error('[VERIFY-CBE] Email failed:', emailError);
              }
            }
          }

          logAction((req as any).user.id, "PAYMENT_CBE_VERIFIED", { reference, amount: result.amount, paymentId, ledgerEntry: ledgerResult.entry_number });
          const response = { verified: true, amount: result.amount, date: result.date, paymentId, ledgerEntry: ledgerResult.entry_number };
          await idempotencyService.saveResponse(idempotencyKey || '', 200, response);
          return res.json(response);
        } catch (dbError: unknown) {
          console.error('[VERIFY-CBE] Database write failed:', dbError);
          const response = { error: 'Failed to record payment' };
          await idempotencyService.saveResponse(idempotencyKey || '', 500, response);
          return res.status(500).json(response);
        }
      }

      logAction((req as any).user.id, "PAYMENT_CBE_VERIFIED", { reference, amount: result.amount });
      const response = { verified: true, amount: result.amount, date: result.date };
      await idempotencyService.saveResponse(idempotencyKey || '', 200, response);
      res.json(response);
    } else {
      const response = { verified: false, error: result.error };
      await idempotencyService.saveResponse(idempotencyKey || '', 400, response);
      res.status(400).json(response);
    }
  });

  // CBE Receipt Upload Verification (OCR-based)
  app.post("/api/payments/verify-cbe-receipt", authenticate, async (req, res) => {
    const { imageBase64, expectedAmount } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    try {
      const student = db.prepare("SELECT id, full_name FROM students WHERE user_id = ?").get((req as any).user.id) as any;
      const user = db.prepare("SELECT full_name FROM users WHERE id = ?").get((req as any).user.id) as any;
      const studentName = student?.full_name || user?.full_name || '';

      const result = await cbeVerifier.verifyFromReceipt(imageBase64, expectedAmount, studentName);
      
      // STRICT: Only proceed with DB write when verification explicitly returns success=true
      if (result.success === true) {
        // Validate the verification signal
        if (!result.reference || typeof result.reference !== 'string' || result.reference.length === 0) {
          console.error('[VERIFY-CBE-RECEIPT] Invalid verification signal - missing reference');
          return res.status(500).json({ error: 'Verification signal invalid' });
        }

        if (typeof result.amount !== 'number' || result.amount <= 0) {
          console.error('[VERIFY-CBE-RECEIPT] Invalid verification signal - invalid amount');
          return res.status(500).json({ error: 'Verification signal invalid' });
        }

        if (student) {
          // Validate payment insert data strictly
          const paymentData = {
            student_id: student.id,
            amount: result.amount,
            status: 'verified' as const,
            transaction_ref: result.reference,
            payment_method: 'cbe_receipt' as const
          };
          const validation = validatePaymentInsert(paymentData);
          if (!validation.valid) {
            console.error('[VERIFY-CBE-RECEIPT] Payment data validation failed:', validation.error);
            return res.status(500).json({ error: 'Invalid payment data' });
          }

          try {
            // STRICT: Only write to DB after verified success signal
            await db.strictWrite('INSERT', 'payments',
              "INSERT INTO payments (student_id, amount, status, transaction_ref, payment_method) VALUES (?, ?, 'verified', ?, 'cbe_receipt')",
              [student.id, result.amount, result.reference]
            );

            const studentDetails = db.prepare(`
              SELECT s.contact_phone, u.full_name, u.email
              FROM students s
              JOIN users u ON s.user_id = u.id
              WHERE s.id = ?
            `).get(student.id) as any;

            if (studentDetails) {
              if (studentDetails.contact_phone) {
                try {
                  await afroMessage.sendSMS(
                    studentDetails.contact_phone,
                    `✅ Payment Confirmed! Dear ${studentDetails.full_name}, your payment of ${result.amount} ETB has been verified. Ref: ${result.reference}. - Dreamland College`
                  );
                } catch (smsError) {
                  console.error('[VERIFY-CBE-RECEIPT] SMS failed:', smsError);
                }
              }
              if (studentDetails.email) {
                try {
                  await emailService.sendPaymentConfirmation(studentDetails.email, studentDetails.full_name, result.amount, result.reference || 'N/A');
                } catch (emailError) {
                  console.error('[VERIFY-CBE-RECEIPT] Email failed:', emailError);
                }
              }
            }
          } catch (dbError: unknown) {
            console.error('[VERIFY-CBE-RECEIPT] Database write failed:', dbError);
            return res.status(500).json({ error: 'Failed to record payment' });
          }
        }

        logAction((req as any).user.id, "PAYMENT_CBE_RECEIPT_VERIFIED", { reference: result.reference, amount: result.amount });
        res.json({ 
          verified: true, 
          amount: result.amount, 
          date: result.date,
          reference: result.reference,
          payerName: result.payerName
        });
      } else {
        res.status(400).json({ verified: false, error: result.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Receipt verification error:', errorMessage);
      res.status(500).json({ error: 'Failed to verify receipt: ' + errorMessage });
    }
  });

  // ==========================================
  // ENTERPRISE ENDPOINTS
  // ==========================================

  // --- Password Change (Authenticated) ---
  app.post("/api/auth/change-password", authenticate, async (req, res) => {
    const { old_password, new_password } = req.body;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!old_password || !new_password || !passwordRegex.test(new_password)) {
      return res.status(400).json({ error: "New password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character." });
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
          `Dreamland College: Your password reset code is ${token}. Valid for 1 hour. If you didn't request this, ignore.`
        );
        console.log(`✅ Password reset sent via SMS`);
      } catch (smsError) {
        console.error('❌ SMS failed:', smsError);
      }
    }
    
    // Send via Email
    try {
      await emailService.sendPasswordResetEmail(email, token, user.full_name || 'User');
      console.log(`✅ Password reset email sent to: ${email.substring(0, 3)}***@***`);
    } catch (emailError) {
      console.error('❌ Password reset email failed:', emailError);
    }
    
    // SECURITY: Never expose tokens in responses or logs
    console.log(`Password reset code requested for: ${email.substring(0, 3)}***@*** (User: ${user.full_name || 'Unknown'})`);
    
    logAction(null, "PASSWORD_RESET_REQUEST", { email: email.substring(0, 3) + '***', userId: user.id });
    res.json({ 
      message: "If the email exists, a reset code has been sent."
    });
  });

  // --- Password Reset Confirm ---
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, token, new_password } = req.body;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!new_password || !passwordRegex.test(new_password)) {
      return res.status(400).json({ error: "New password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character." });
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
  app.put("/api/students/:id", authenticate, authorize(['superadmin', 'branch_admin', 'registrar']), async (req, res) => {
    const studentId = req.params.id;

    // Strict validation of student ID
    if (!studentId || typeof studentId !== 'string' || studentId.length === 0) {
      return res.status(400).json({ error: 'Valid student ID is required' });
    }

    // Validate request body with strict type checking
    const validation = validateStudentUpdate(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { full_name, fields } = validation.sanitized!;
    const { birth_year, birth_place_region, birth_place_zone, birth_place_woreda, birth_place_kebele, contact_phone, emergency_contact_name, emergency_contact_phone, student_type, program_id, program_degree, academic_status } = fields;

    try {
      // Build the UPDATE query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (birth_year !== undefined) {
        updateFields.push('birth_year = ?');
        updateValues.push(birth_year);
      }
      if (birth_place_region !== undefined) {
        updateFields.push('birth_place_region = ?');
        updateValues.push(birth_place_region);
      }
      if (birth_place_zone !== undefined) {
        updateFields.push('birth_place_zone = ?');
        updateValues.push(birth_place_zone);
      }
      if (birth_place_woreda !== undefined) {
        updateFields.push('birth_place_woreda = ?');
        updateValues.push(birth_place_woreda);
      }
      if (birth_place_kebele !== undefined) {
        updateFields.push('birth_place_kebele = ?');
        updateValues.push(birth_place_kebele);
      }
      if (contact_phone !== undefined) {
        updateFields.push('contact_phone = ?');
        updateValues.push(contact_phone);
      }
      if (emergency_contact_name !== undefined) {
        updateFields.push('emergency_contact_name = ?');
        updateValues.push(emergency_contact_name);
      }
      if (emergency_contact_phone !== undefined) {
        updateFields.push('emergency_contact_phone = ?');
        updateValues.push(emergency_contact_phone);
      }
      if (student_type !== undefined) {
        updateFields.push('student_type = ?');
        updateValues.push(student_type);
      }
      if (program_id !== undefined) {
        updateFields.push('program_id = ?');
        updateValues.push(program_id);
      }
      if (program_degree !== undefined) {
        updateFields.push('program_degree = ?');
        updateValues.push(program_degree);
      }
      if (academic_status !== undefined) {
        updateFields.push('academic_status = ?');
        updateValues.push(academic_status);
      }

      // Only update if there are fields to update
      if (updateFields.length > 0) {
        updateValues.push(studentId);
        const updateSql = `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`;
        
        // STRICT: Use strictWrite for audit trail
        await db.strictWrite('UPDATE', 'students', updateSql, updateValues);
      }

      // Update full_name in users table if provided
      if (full_name && typeof full_name === 'string' && full_name.length > 0) {
        const student = db.prepare("SELECT user_id FROM students WHERE id = ?").get(studentId) as any;
        if (student) {
          // Strict validation for user name update
          await db.strictWrite('UPDATE', 'users',
            "UPDATE users SET full_name = ? WHERE id = ?",
            [full_name, student.user_id]
          );
        }
      }

      logAction((req as any).user.id, "STUDENT_UPDATE", { studentId });
      res.json({ message: "Student updated successfully" });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      console.error('[STUDENT UPDATE] Database write failed:', errorMessage);
      res.status(400).json({ error: errorMessage });
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
    const { code, title, credits, prerequisites, is_auditable, program, price_per_credit } = req.body;
    try {
      const result = db.prepare("INSERT INTO courses (code, title, credits, prerequisites, is_auditable, program, price_per_credit) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        code, title, credits, prerequisites || null, is_auditable ? 1 : 0, program || null, price_per_credit || 0
      );
      logAction((req as any).user.id, "COURSE_CREATE", { code, title });
      res.json({ id: result.lastInsertRowid, message: "Course created" });
    } catch (e: any) {
      // Handle case where new columns don't exist yet
      if (e.message.includes('no such column')) {
        const result = db.prepare("INSERT INTO courses (code, title, credits, prerequisites, is_auditable) VALUES (?, ?, ?, ?, ?)").run(
          code, title, credits, prerequisites || null, is_auditable ? 1 : 0
        );
        logAction((req as any).user.id, "COURSE_CREATE", { code, title });
        res.json({ id: result.lastInsertRowid, message: "Course created (legacy mode)" });
      } else {
        throw e;
      }
    }
  });

  app.put("/api/courses/:id", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { code, title, credits, prerequisites, is_auditable, program, price_per_credit } = req.body;
    try {
      db.prepare("UPDATE courses SET code = ?, title = ?, credits = ?, prerequisites = ?, is_auditable = ?, program = ?, price_per_credit = ? WHERE id = ?").run(
        code, title, credits, prerequisites || null, is_auditable ? 1 : 0, program || null, price_per_credit || 0, req.params.id
      );
      res.json({ message: "Course updated" });
    } catch (e: any) {
      // Handle case where new columns don't exist yet
      if (e.message.includes('no such column')) {
        db.prepare("UPDATE courses SET code = ?, title = ?, credits = ?, prerequisites = ?, is_auditable = ? WHERE id = ?").run(
          code, title, credits, prerequisites || null, is_auditable ? 1 : 0, req.params.id
        );
        res.json({ message: "Course updated (legacy mode)" });
      } else {
        throw e;
      }
    }
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
    const materials = db.prepare(`
      SELECT cm.*, u.full_name as uploaded_by
      FROM course_materials cm
      LEFT JOIN users u ON cm.uploaded_by = u.id
      WHERE cm.course_offering_id = ?
      ORDER BY cm.uploaded_at DESC
    `).all(req.params.id);
    
    // Add file metadata
    const materialsWithMeta = materials.map((m: any) => {
      const filePath = path.join(__dirname, m.file_url);
      let fileSize = 0;
      let fileType = 'application/octet-stream';
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
        
        // Detect file type based on extension
        const ext = filePath.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'mp4': 'video/mp4',
          'mp3': 'audio/mpeg',
          'zip': 'application/zip',
          'rar': 'application/vnd.rar'
        };
        fileType = mimeTypes[ext || ''] || 'application/octet-stream';
      }
      
      return {
        ...m,
        file_size: fileSize,
        file_type: fileType
      };
    });
    
    res.json(materialsWithMeta);
  });

  app.post("/api/courses/:id/materials", authenticate, authorize(['faculty', 'superadmin']), upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { title, description } = req.body;
    const result = db.prepare("INSERT INTO course_materials (course_offering_id, title, description, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?)").run(
      req.params.id, title, description || '', `/uploads/${req.file.filename}`, (req as any).user.id
    );
    res.json({ 
      id: result.lastInsertRowid, 
      message: "Material uploaded successfully",
      file_url: `/uploads/${req.file.filename}`,
      file_size: req.file.size,
      file_type: req.file.mimetype
    });
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
  app.get("/api/users", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { role, branch_id } = (req as any).user;
    let users;
    if (role === 'superadmin') {
      users = db.prepare("SELECT id, username, role, full_name, email, branch_id FROM users WHERE role != 'superadmin'").all();
    } else {
      // Branch admin can see users in their branch
      users = db.prepare("SELECT id, username, role, full_name, email, branch_id FROM users WHERE branch_id = ? AND role != 'superadmin'").all(branch_id);
    }
    res.json(users);
  });

  app.get("/api/users/faculty", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { branch_id } = (req as any).user;
    let users;
    if ((req as any).user.role === 'superadmin') {
      users = db.prepare("SELECT id, username, role, full_name, email, branch_id FROM users WHERE role = 'faculty'").all();
    } else {
      users = db.prepare("SELECT id, username, role, full_name, email, branch_id FROM users WHERE role = 'faculty' AND branch_id = ?").all(branch_id);
    }
    res.json(users);
  });

  app.post("/api/users", authenticate, authorize(['superadmin', 'branch_admin']), async (req, res) => {
    const { username, password, role, full_name, email, branch_id } = req.body;
    const currentUser = (req as any).user;
    
    // Validation: Branch admin can only create accountant and faculty
    if (currentUser.role === 'branch_admin') {
      if (!['accountant', 'faculty'].includes(role)) {
        return res.status(403).json({ error: 'Branch admin can only create accountant or faculty accounts' });
      }
      // Branch admin can only assign to their own branch
      if (branch_id && branch_id !== currentUser.branch_id) {
        return res.status(403).json({ error: 'Branch admin can only assign to their branch' });
      }
    }
    
    // Superadmin can also promote user to branch_admin
    if (role === 'branch_admin' && currentUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can create branch admin accounts' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character." });
    }
    const hashed = await bcrypt.hash(password, 10);
    try {
      const userBranchId = currentUser.role === 'branch_admin' ? currentUser.branch_id : branch_id;
      const result = db.prepare("INSERT INTO users (username, password, role, full_name, email, branch_id) VALUES (?, ?, ?, ?, ?, ?)").run(username, hashed, role, full_name, email, userBranchId || null);
      logAction(currentUser.id, "USER_CREATE", { username, role, createdBy: currentUser.role });
      res.json({ id: result.lastInsertRowid, message: "User created" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/users/:id/role", authenticate, authorize(['superadmin']), async (req, res) => {
    const { role, branch_id } = req.body;
    const targetUserId = parseInt(req.params.id);
    
    // Get current user info to check if promoting to branch_admin
    const targetUser = db.prepare("SELECT role FROM users WHERE id = ?").get(targetUserId) as any;
    
    if (role === 'branch_admin') {
      if (!branch_id) {
        return res.status(400).json({ error: 'Branch ID is required for branch admin role' });
      }
    }
    
    db.prepare("UPDATE users SET role = ?, branch_id = ? WHERE id = ?").run(role, branch_id || null, targetUserId);
    logAction((req as any).user.id, "USER_PROMOTE", { targetUserId, newRole: role });
    res.json({ message: "User role updated" });
  });

  app.put("/api/users/:id", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { full_name, email, role, branch_id } = req.body;
    const currentUser = (req as any).user;
    
    // Branch admin cannot change role to branch_admin or superadmin
    if (currentUser.role === 'branch_admin') {
      if (role === 'branch_admin' || role === 'superadmin') {
        return res.status(403).json({ error: 'Insufficient permissions to assign this role' });
      }
    }
    
    const userBranchId = currentUser.role === 'branch_admin' ? currentUser.branch_id : branch_id;
    db.prepare("UPDATE users SET full_name = ?, email = ?, role = ?, branch_id = ? WHERE id = ?").run(full_name, email, role, userBranchId || null, req.params.id);
    logAction(currentUser.id, "USER_UPDATE", { userId: req.params.id });
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

  app.post("/api/notifications/send", authenticate, authorize(['superadmin', 'branch_admin', 'faculty']), (req, res) => {
    const { user_id, role, title, message } = req.body;
    
    if (user_id) {
      db.prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)").run(user_id, title, message);
    } else if (role) {
      let users;
      if (role === 'all') {
        users = db.prepare("SELECT id FROM users").all();
      } else if (role === 'staff') {
        users = db.prepare("SELECT id FROM users WHERE role IN ('superadmin', 'branch_admin', 'faculty', 'accountant', 'registrar')").all();
      } else {
        users = db.prepare("SELECT id FROM users WHERE role = ?").all(role);
      }
      
      const stmt = db.prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
      const insertMany = db.transaction((userList) => {
        for (const user of userList) stmt.run(user.id, title, message);
      });
      insertMany(users);
    } else {
      return res.status(400).json({ error: "user_id or role is required" });
    }
    
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

  // --- Ledger Trial Balance ---
  app.get("/api/ledger/trial-balance", authenticate, authorize(['superadmin', 'accountant']), async (req, res) => {
    try {
      const balances = await ledgerService.getTrialBalance();
      const integrity = await ledgerService.validateLedgerIntegrity();
      res.json({
        balances,
        integrity: {
          valid: integrity.valid,
          errors: integrity.errors
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LEDGER] Trial balance error:', errorMessage);
      res.status(500).json({ error: 'Failed to generate trial balance' });
    }
  });

  // --- Ledger Journal Entries ---
  app.get("/api/ledger/entries", authenticate, authorize(['superadmin', 'accountant']), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const entries = await db.all(
        `SELECT je.*, u.full_name as posted_by_name
         FROM journal_entries je
         LEFT JOIN users u ON je.posted_by = u.id
         WHERE je.status = 'posted'
         ORDER BY je.date DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const total = (await db.get<{ count: number }>('SELECT COUNT(*) as count FROM journal_entries WHERE status = ?', ['posted']))?.count || 0;

      res.json({
        entries,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LEDGER] Journal entries error:', errorMessage);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  // --- Ledger Journal Entry Detail ---
  app.get("/api/ledger/entries/:id", authenticate, authorize(['superadmin', 'accountant']), async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ error: 'Invalid entry ID' });
      }

      const entry = await ledgerService.getJournalEntry(entryId);
      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      const lines = await ledgerService.getJournalEntryLines(entryId);

      res.json({
        entry,
        lines,
        validated: validateDoubleEntry(lines.map(l => ({
          account_id: l.account_id,
          entry_type: l.entry_type as 'debit' | 'credit',
          amount: l.amount
        })))
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LEDGER] Entry detail error:', errorMessage);
      res.status(500).json({ error: 'Failed to fetch entry details' });
    }
  });

  // --- Ledger Integrity Check ---
  app.get("/api/ledger/integrity", authenticate, authorize(['superadmin']), async (req, res) => {
    try {
      const integrity = await ledgerService.validateLedgerIntegrity();
      res.json({
        valid: integrity.valid,
        errors: integrity.errors,
        checkedAt: new Date().toISOString()
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LEDGER] Integrity check error:', errorMessage);
      res.status(500).json({ error: 'Failed to check ledger integrity' });
    }
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
  // SCHEDULE MANAGEMENT
  // ==========================================

  // Get all schedules (admin) or faculty/student specific
  app.get("/api/schedule", authenticate, (req, res) => {
    const { role } = (req as any).user;
    
    if (role === 'superadmin' || role === 'branch_admin') {
      const schedules = db.prepare(`
        SELECT cs.*, c.title as course_name, p.name as program_name, 
               u.full_name as faculty_name, r.name as room_name, b.name as branch_name
        FROM class_schedule cs
        JOIN course_offerings co ON cs.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        JOIN programs p ON co.program_id = p.id
        LEFT JOIN users u ON cs.faculty_id = u.id
        JOIN rooms r ON cs.room_id = r.id
        JOIN branches b ON r.branch_id = b.id
        ORDER BY cs.day_of_week, cs.start_time
      `).all();
      return res.json(schedules);
    } else if (role === 'faculty') {
      const schedules = db.prepare(`
        SELECT cs.*, c.title as course_name, p.name as program_name, 
               u.full_name as faculty_name, r.name as room_name, b.name as branch_name
        FROM class_schedule cs
        JOIN course_offerings co ON cs.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        JOIN programs p ON co.program_id = p.id
        LEFT JOIN users u ON cs.faculty_id = u.id
        JOIN rooms r ON cs.room_id = r.id
        JOIN branches b ON r.branch_id = b.id
        WHERE cs.faculty_id = ?
        ORDER BY cs.day_of_week, cs.start_time
      `).all((req as any).user.id);
      return res.json(schedules);
    } else {
      // Student - get schedule based on enrollments
      const student = db.prepare("SELECT id FROM students WHERE user_id = ?").get((req as any).user.id) as any;
      if (!student) return res.json([]);
      
      const schedules = db.prepare(`
        SELECT cs.*, c.title as course_name, p.name as program_name, 
               u.full_name as faculty_name, r.name as room_name
        FROM class_schedule cs
        JOIN course_offerings co ON cs.course_offering_id = co.id
        JOIN courses c ON co.course_id = c.id
        JOIN programs p ON co.program_id = p.id
        LEFT JOIN users u ON cs.faculty_id = u.id
        JOIN rooms r ON cs.room_id = r.id
        WHERE co.id IN (SELECT course_offering_id FROM enrollments WHERE student_id = ?)
        ORDER BY cs.day_of_week, cs.start_time
      `).all(student.id);
      return res.json(schedules);
    }
  });

  // Get faculty schedule
  app.get("/api/faculty/schedule", authenticate, authorize(['faculty']), (req, res) => {
    const schedules = db.prepare(`
      SELECT cs.*, c.title as course_name, p.name as program_name, 
             u.full_name as faculty_name, r.name as room_name, b.name as branch_name
      FROM class_schedule cs
      JOIN course_offerings co ON cs.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN programs p ON co.program_id = p.id
      LEFT JOIN users u ON cs.faculty_id = u.id
      JOIN rooms r ON cs.room_id = r.id
      JOIN branches b ON r.branch_id = b.id
      WHERE cs.faculty_id = ?
      ORDER BY cs.day_of_week, cs.start_time
    `).all((req as any).user.id);
    res.json(schedules);
  });

  // Create schedule entry
  app.post("/api/schedule", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { course_offering_id, room_id, day_of_week, start_time, end_time, faculty_id } = req.body;
    
    if (!course_offering_id || !room_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = db.prepare(`
      INSERT INTO class_schedule (course_offering_id, room_id, day_of_week, start_time, end_time, faculty_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(course_offering_id, room_id, day_of_week, start_time, end_time, faculty_id || null);
    
    logAction((req as any).user.id, "SCHEDULE_CREATE", { course_offering_id, day_of_week });
    res.json({ id: result.lastInsertRowid, message: "Schedule created" });
  });

  // Delete schedule entry
  app.delete("/api/schedule/:id", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    db.prepare("DELETE FROM class_schedule WHERE id = ?").run(req.params.id);
    logAction((req as any).user.id, "SCHEDULE_DELETE", { scheduleId: req.params.id });
    res.json({ message: "Schedule deleted" });
  });

  // Get rooms
  app.get("/api/rooms", authenticate, (req, res) => {
    const rooms = db.prepare(`
      SELECT r.*, b.name as branch_name
      FROM rooms r
      LEFT JOIN branches b ON r.branch_id = b.id
      ORDER BY r.name
    `).all();
    res.json(rooms);
  });

  // Create room
  app.post("/api/rooms", authenticate, authorize(['superadmin', 'branch_admin']), (req, res) => {
    const { name, capacity, building, branch_id } = req.body;
    const result = db.prepare("INSERT INTO rooms (name, capacity, building, branch_id) VALUES (?, ?, ?, ?)").run(
      name, capacity, building, branch_id
    );
    logAction((req as any).user.id, "ROOM_CREATE", { name });
    res.json({ id: result.lastInsertRowid, message: "Room created" });
  });

  // ==========================================
  // COURSE RESOURCES MANAGEMENT
  // ==========================================

  // Get resource by ID
  app.get("/api/resources/:id", authenticate, (req, res) => {
    const resource = db.prepare("SELECT * FROM course_materials WHERE id = ?").get(req.params.id);
    if (!resource) return res.status(404).json({ error: "Resource not found" });
    res.json(resource);
  });

  // Download resource
  app.get("/api/resources/:id/download", authenticate, (req, res) => {
    const resource = db.prepare("SELECT * FROM course_materials WHERE id = ?").get(req.params.id);
    if (!resource) return res.status(404).json({ error: "Resource not found" });
    
    const filePath = path.join(__dirname, resource.file_url);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    
    res.download(filePath, resource.title);
  });

  // Delete resource
  app.delete("/api/resources/:id", authenticate, authorize(['faculty', 'superadmin']), (req, res) => {
    const resource = db.prepare("SELECT * FROM course_materials WHERE id = ?").get(req.params.id);
    if (!resource) return res.status(404).json({ error: "Resource not found" });
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, resource.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    db.prepare("DELETE FROM course_materials WHERE id = ?").run(req.params.id);
    logAction((req as any).user.id, "RESOURCE_DELETE", { resourceId: req.params.id });
    res.json({ message: "Resource deleted" });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
    }
  });

  // Digital Transcript with Signature
  app.get("/api/students/:id/transcript-digital", authenticate, authorize(['superadmin', 'branch_admin', 'registrar', 'instructor', 'student']), (req, res) => {
    const studentId = req.params.id;
    const { role, id: userId } = (req as any).user;

    // Ownership check for students
    if (role === 'student') {
      const studentRecord = db.prepare("SELECT id FROM students WHERE user_id = ?").get(userId) as any;
      if (!studentRecord || studentRecord.id !== parseInt(studentId)) {
        return res.status(403).json({ error: "Forbidden: You can only view your own transcript" });
      }
    }

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
      console.error("[SERVER ERROR]", error);
      res.status(500).json({ error: "An internal server error occurred." });
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
  const server = app.listen(PORT, "0.0.0.0", async () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);

    // Initialize ledger accounts
    try {
      await ledgerService.initializeAccounts();
      const integrity = await ledgerService.validateLedgerIntegrity();
      if (!integrity.valid) {
        console.warn('[LEDGER] Integrity check warnings:', integrity.errors);
      }
    } catch (error) {
      console.error('[LEDGER] Initialization error:', error);
    }

    // Cleanup expired idempotency keys periodically (every hour)
    setInterval(async () => {
      try {
        const cleaned = await idempotencyService.cleanup();
        if (cleaned > 0) {
          console.log(`[IDEMPOTENCY] Cleaned up ${cleaned} expired keys`);
        }
      } catch (error) {
        console.error('[IDEMPOTENCY] Cleanup error:', error);
      }
    }, 60 * 60 * 1000);
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
