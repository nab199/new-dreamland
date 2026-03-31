# DREAMLAND COLLEGE MANAGEMENT SYSTEM
## Complete System Documentation

---

## 1. SYSTEM OVERVIEW

**Dreamland College Management System** is a comprehensive full-stack web application designed to manage all aspects of a college/institution, including:
- Student registration and enrollment
- Academic management (courses, grades, schedules)
- Financial management (payments, invoices, scholarships)
- Communication (SMS, Email notifications)
- AI-powered features (grade prediction, at-risk student identification)
- Multi-branch support
- Role-based access control

---

## 2. TECHNOLOGY STACK

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT with bcrypt password hashing
- **File Storage**: Local filesystem with multer

### Frontend
- **Framework**: React 19
- **Routing**: React Router v7
- **Styling**: TailwindCSS v4
- **Animations**: Framer Motion
- **Build Tool**: Vite
- **Charts**: Recharts
- **i18n**: i18next (English & Amharic)

### External Services
- **SMS**: AfroMessage API
- **Email**: Resend API
- **Payments**: Chapa API, CBE Receipt Verification
- **AI**: Google Gemini API

---

## 3. DATABASE SCHEMA

### Core Tables

#### `branches`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Branch name |
| location | TEXT | Physical address |
| contact | TEXT | Contact phone |

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| username | TEXT UNIQUE | Login username |
| password | TEXT | Bcrypt hashed password |
| role | TEXT | superadmin, branch_admin, faculty, accountant, student, parent |
| branch_id | INTEGER | FK to branches |
| full_name | TEXT | Display name |
| email | TEXT | Email address |
| failed_login_attempts | INTEGER | Security lockout counter |
| locked_until | TEXT | Account lockout expiry |

#### `students`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER UNIQUE | FK to users |
| student_id_code | TEXT UNIQUE | Format: XX-YYYY-NNNN |
| branch_id | INTEGER | FK to branches |
| program_id | INTEGER | FK to programs |
| program_degree | TEXT | Masters, Degree, Diploma, Certificate |
| student_type | TEXT | Regular, Extension, Weekend, Distance |
| birth_year | INTEGER | Year of birth |
| birth_place_* | TEXT | Region, zone, woreda, kebele |
| contact_phone | TEXT | Phone number |
| emergency_contact_* | TEXT | Name and phone |
| academic_status | TEXT | good_standing, probation, suspended |
| financial_clearance | INTEGER | 0 or 1 |
| documents_json | TEXT | JSON of uploaded document URLs |

#### `programs`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Program name |
| code | TEXT UNIQUE | Short code (e.g., CS) |
| duration_years | INTEGER | Program length |
| total_credits | INTEGER | Required credits |

#### `courses`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| code | TEXT UNIQUE | Course code (e.g., CS101) |
| title | TEXT | Course title |
| credits | INTEGER | Credit hours |
| prerequisites | TEXT | Comma-separated course codes |
| is_auditable | INTEGER | 0 or 1 |

#### `semesters`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| branch_id | INTEGER | FK to branches |
| academic_year | TEXT | e.g., "2016 E.C." |
| semester_name | TEXT | e.g., "Semester I" |
| start_date | TEXT | ISO date |
| end_date | TEXT | ISO date |
| is_active | INTEGER | Current semester flag |

#### `enrollments`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| student_id | INTEGER | FK to students |
| course_id | INTEGER | FK to courses |
| semester_id | INTEGER | FK to semesters |
| assignment_grade | REAL | 20% weight |
| midterm_grade | REAL | 30% weight |
| final_grade | REAL | 50% weight |
| grade | TEXT | A, B, C, D, F |
| points | REAL | Weighted points |
| status | TEXT | enrolled, dropped, withdrawn |
| is_audit | INTEGER | Audit student flag |

#### `payments`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| student_id | INTEGER | FK to students |
| amount | REAL | Payment amount |
| type | TEXT | tuition, registration |
| status | TEXT | pending, paid, verified |
| transaction_ref | TEXT | External reference |
| payment_method | TEXT | chapa, cbe_receipt |

### Additional Tables
- `registration_periods` - Active registration windows
- `course_offerings` - Courses offered per semester
- `course_waitlist` - Students waiting for full courses
- `rooms` - Physical room management
- `course_offerings_faculty` - Faculty assignments
- `class_schedule` - Weekly schedule
- `attendance` - Daily attendance records
- `scholarships` - Financial aid programs
- `invoices` - Semester invoices
- `course_materials` - LMS materials
- `assignments` - LMS assignments
- `submissions` - Student submissions
- `parent_students` - Parent-student linking
- `registration_otps` - OTP verification codes
- `password_reset_tokens` - Password reset tokens
- `notifications` - In-app notifications
- `audit_logs` - Security audit trail
- `academic_calendars` - Important dates
- `fee_structures` - Program fees

---

## 4. API ENDPOINTS

### Public Endpoints (No Auth Required)
```
GET  /api/public/branches          - List branches
GET  /api/public/programs          - List programs
POST /api/public/send-otp          - Send OTP for verification
POST /api/public/verify-otp        - Verify OTP
POST /api/public/upload            - Upload documents
POST /api/public/register-student  - Register new student
```

### Authentication Endpoints
```
POST /api/auth/login              - User login
POST /api/auth/logout             - User logout
POST /api/auth/refresh            - Refresh JWT token
GET  /api/auth/me                 - Get current user
PUT  /api/auth/profile            - Update profile
POST /api/auth/forgot-password    - Request password reset
POST /api/auth/reset-password     - Reset password with token
POST /api/auth/change-password    - Change password
```

### Student Management (Requires Auth)
```
GET    /api/students              - List students
GET    /api/students/:id          - Get student details
POST   /api/students              - Create student (admin)
PUT    /api/students/:id          - Update student
DELETE /api/students/:id          - Delete student
GET    /api/students/paginated    - Paginated list
POST   /api/students/bulk-upload  - CSV bulk upload
GET    /api/students/:id/transcript - Generate transcript
```

### Enrollment & Courses
```
GET  /api/courses                - List courses
POST /api/courses                - Create course
GET  /api/courses/available      - Available courses for enrollment
POST /api/enrollments            - Enroll in course
GET  /api/enrollments            - My enrollments
POST /api/enrollments/withdraw   - Withdraw from course
POST /api/enrollments/grades     - Submit grades (faculty)
POST /api/enrollments/bulk-finalize - Finalize and send SMS
```

### Payments
```
POST /api/payments/initialize     - Initialize Chapa payment
GET  /api/payments/callback       - Chapa callback
POST /api/payments/webhook        - Chapa webhook
POST /api/payments/verify         - Verify CBE receipt
POST /api/payments/verify-cbe     - CBE verification
GET  /api/payments                - List all payments
```

### Communication
```
POST /api/telegram/send               - Send Telegram message
POST /api/telegram/send-bulk          - Send bulk Telegram messages
GET  /api/announcements          - List announcements
POST /api/announcements          - Create announcement
```

### Administration
```
GET  /api/branches               - List branches
POST /api/branches               - Create branch
GET  /api/programs               - List programs
POST /api/programs              - Create program
GET  /api/semesters             - List semesters
POST /api/semesters             - Create semester
GET  /api/rooms                - List rooms
GET  /api/users                - List users
POST /api/users                - Create user
GET  /api/audit-logs          - View audit logs
GET  /api/admin/system-status  - System health check
```

### AI Features
```
POST /api/ai/chat               - AI chatbot
POST /api/ai/predict-grade     - Grade prediction
GET  /api/ai/at-risk-students  - Identify at-risk students
POST /api/ai/generate-comment  - Generate report comments
```

---

## 5. USER ROLES & PERMISSIONS

| Role | Permissions |
|------|-------------|
| superadmin | Full system access, all branches |
| branch_admin | Branch-level management |
| faculty | Course management, grading |
| accountant | Financial operations |
| registrar | Student records |
| student | Own data access |
| parent | View child's information |

---

## 6. STUDENT REGISTRATION FLOW

### Public Registration Process

1. **Step 1 - Personal Info**
   - Enter full name, birth year
   - Enter phone (+2519... or +2517...)
   - Enter email
   - Select program, degree level, student type
   - Select branch

2. **Step 2 - Address & Documents**
   - Select region from Ethiopian regions list
   - Select zone/sub-region
   - Enter woreda and kebele
   - Upload required documents:
     - Portrait photo
     - ID card
     - Diploma
     - Transcript

3. **Step 3 - Payment & Account**
   - Choose payment method (Cash or CBE Receipt)
   - If CBE: Enter transaction reference and last 8 digits
   - Create account password

 4. **Verification**
    - OTP sent via SMS (required)
    - Email OTP as backup (optional)
    - Code expires in 10 minutes

5. **Registration Confirmation**
   - Student ID generated: XX-YYYY-NNNN
   - Voucher displayed with details

### Database Registration Process

The `/api/public/register-student` endpoint:
1. Hashes password with bcrypt (10 rounds)
2. Generates unique student_id_code
3. Creates user account with role='student'
4. Creates student record linked to user
5. Stores document URLs in documents_json
6. Logs action to audit_logs

---

## 7. PAYMENT INTEGRATIONS

### Chapa (Primary Payment Gateway)
- Initialize payment: `POST /api/payments/initialize`
- Callback handling: `GET /api/payments/callback`
- Webhook verification: `POST /api/payments/webhook`

### CBE Receipt Verification
- Manual receipt verification: `POST /api/payments/verify-cbe`
- OCR simulation for receipt scanning

---

## 8. COMMUNICATION SERVICES

### AfroMessage SMS (Primary)
- Single SMS: `POST /api/sms/send`
- Bulk SMS: `POST /api/sms/send-bulk`
- Cron job reminders at 08:00 daily
- OTP verification for registration
- SMS notifications for payments, grades, etc.

### Resend Email (Secondary)
- Password reset emails
- Payment confirmations
- Grade notifications
- Backup for critical notifications

---

## 9. AI FEATURES

### Grade Prediction
Uses student history and current performance to predict final grades.

### At-Risk Student Identification
Analyzes GPA, failed courses, and engagement to identify students needing intervention.

### Chatbot
AI-powered FAQ and guidance assistant using Google Gemini.

---

## 10. SECURITY FEATURES

### Authentication
- JWT tokens (8h expiry)
- Refresh tokens (7d expiry)
- bcrypt password hashing

### Account Security
- Failed login tracking (5 attempts)
- 15-minute account lockout
- Password reset with 8-char codes

### Rate Limiting
- Auth: 100 requests per 15 minutes
- Registration: 10 per hour per IP

### Audit Logging
All actions logged with user_id, action, and details.

---

## 11. SCHEDULED TASKS (Cron)

| Time | Task |
|------|------|
| Daily 08:00 | Registration reminders, course end notices |
| Daily 02:00 | Database backup |
| Monday 09:00 | At-risk student report |

---

## 12. MOBILE APP

Built with React Native (Expo):
- Cross-platform (iOS/Android)
- Offline support with AsyncStorage
- Login/Register functionality
- Dashboard and notifications
- APK: `DreamLandCollege_Final.apk`

---

## 13. PWA FEATURES

- Service worker for offline caching
- Install prompt
- Background sync ready
- Manifest configured

---

## 14. DEPLOYMENT

### Local Development
```bash
npm install
npm run dev  # Starts on port 3000
```

### Production
- Vercel for frontend
- Render for backend (server.ts)
- Environment variables required:
  - `JWT_SECRET`
  - `GEMINI_API_KEY`
  - `AFROMESSAGE_API_KEY`
  - `RESEND_API_KEY`
  - `CHAPA_SECRET_KEY`

---

## 15. READY FOR SALE FEATURES

1. **Complete Student Lifecycle**: Registration → Enrollment → Graduation
2. **Multi-Branch Support**: Centralized management
3. **Payment Integration**: Chapa + CBE verification
4. **SMS/Email Notifications**: AfroMessage + Resend
5. **AI-Powered Insights**: Grade prediction, at-risk alerts
6. **Offline-First PWA**: Works without internet
7. **Mobile App**: Native Android APK
8. **Role-Based Access**: Secure, granular permissions
9. **Audit Trail**: Complete accountability
10. **Financial Management**: Invoices, scholarships, clearance

---

## 16. CURRENT DATABASE STATUS

```
✓ Database: college.db
✓ Branches: 2 (Addis Ababa Main, Adama Branch)
✓ Programs: 2 (Computer Science, Accounting & Finance)
✓ Students: 1 registered
✓ Registration Periods: 1 (OPEN)
✓ Default Admin: admin / admin123
```

---

## 17. GETTING STARTED

### As Administrator
1. Run: `npm run dev`
2. Go to: http://localhost:3000/login
3. Login: `admin` / `admin123`
4. Navigate to dashboard to manage system

### As Student
1. Go to: http://localhost:3000/public-registration
2. Complete registration form
3. Verify email with OTP
4. Submit registration
5. Login with email/password

---

**System is production-ready and fully functional.**
