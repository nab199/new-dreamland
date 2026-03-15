# 🚀 Demo Deployment Guide

## Architecture Overview

```
┌─────────────┐    API Calls     ┌───────────────┐     SQL      ┌──────────────┐
│   VERCEL     │ ──────────────> │    RENDER      │ ──────────> │   SUPABASE   │
│  (Frontend)  │ <────────────── │   (Backend)    │ <────────── │  (Database)  │
│  React SPA   │    JSON         │  Express API   │   Results   │  PostgreSQL  │
└─────────────┘                  └───────────────┘              └──────────────┘
```

| Component | Service | URL Pattern |
|-----------|---------|-------------|
| Frontend | Vercel | `https://dreamland.vercel.app` |
| Backend | Render | `https://dreamland-api.onrender.com` |
| Database | Supabase | PostgreSQL connection string |

---

## Step 1: Supabase Setup (Database)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Set:
   - **Name**: `dreamland-college`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** and wait for it to provision

### 1.2 Run the SQL Schema
1. In the Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Paste the following SQL and click **"Run"**:

```sql
-- =============================================
-- DREAMLAND COLLEGE MANAGEMENT SYSTEM SCHEMA
-- For Supabase PostgreSQL
-- =============================================

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
  branch_id INTEGER REFERENCES branches(id),
  full_name TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  student_id_code TEXT UNIQUE,
  branch_id INTEGER REFERENCES branches(id),
  program_id INTEGER,
  student_type TEXT,
  birth_year INTEGER,
  birth_place_region TEXT,
  birth_place_zone TEXT,
  birth_place_woreda TEXT,
  birth_place_kebele TEXT,
  birth_location TEXT,
  contact_phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  academic_status TEXT DEFAULT 'good_standing',
  current_semester_id INTEGER,
  documents_json TEXT,
  status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  duration_years INTEGER,
  total_credits INTEGER
);

ALTER TABLE students ADD CONSTRAINT fk_program FOREIGN KEY (program_id) REFERENCES programs(id);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL,
  prerequisites TEXT,
  is_auditable INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS semesters (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id),
  academic_year TEXT,
  semester_name TEXT,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  course_id INTEGER REFERENCES courses(id),
  semester_id INTEGER REFERENCES semesters(id),
  grade TEXT,
  points REAL,
  status TEXT DEFAULT 'enrolled',
  assignment_grade REAL,
  midterm_grade REAL,
  final_grade REAL,
  is_audit INTEGER DEFAULT 0,
  resolution_deadline TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  amount REAL,
  type TEXT,
  status TEXT DEFAULT 'pending',
  transaction_ref TEXT,
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id),
  title TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_calendars (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id),
  semester_name TEXT,
  start_date TEXT,
  end_date TEXT,
  reg_start_date TEXT,
  reg_end_date TEXT,
  exam_start_date TEXT,
  exam_end_date TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token TEXT UNIQUE,
  expires_at TIMESTAMP,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fee_structures (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES programs(id),
  semester_id INTEGER REFERENCES semesters(id),
  fee_type TEXT,
  amount REAL
);

CREATE TABLE IF NOT EXISTS registration_periods (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id),
  semester_id INTEGER REFERENCES semesters(id),
  start_date TEXT,
  end_date TEXT,
  is_open INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS course_offerings (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id),
  semester_id INTEGER REFERENCES semesters(id),
  capacity INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS course_waitlist (
  id SERIAL PRIMARY KEY,
  course_offering_id INTEGER REFERENCES course_offerings(id),
  student_id INTEGER REFERENCES students(id),
  position INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 Seed Demo Data
Run a second query with this seed data:

```sql
-- Seed Branches
INSERT INTO branches (name, location, contact) VALUES 
  ('Addis Ababa Main', 'Addis Ababa, 4 Kilo', '+251111223344'),
  ('Adama Branch', 'Adama, City Center', '+251221112233');

-- Seed Admin (password: admin123, hashed with bcrypt)
-- ⚠️ Generate this hash by running: node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
INSERT INTO users (username, password, role, full_name, email) VALUES 
  ('admin', '$2a$10$REPLACE_WITH_YOUR_HASH', 'superadmin', 'System Administrator', 'admin@dreamland.edu.et');

-- Seed Programs
INSERT INTO programs (name, code, duration_years, total_credits) VALUES 
  ('Computer Science', 'CS', 4, 147),
  ('Accounting & Finance', 'ACC', 3, 110),
  ('Business Administration', 'BA', 3, 120),
  ('Nursing', 'NUR', 4, 160);

-- Seed Courses
INSERT INTO courses (code, title, credits) VALUES 
  ('CS101', 'Introduction to Programming', 3),
  ('CS102', 'Data Structures', 4),
  ('CS201', 'Database Systems', 3),
  ('ACC101', 'Principles of Accounting', 3),
  ('BA101', 'Business Ethics', 2);
```

### 1.4 Get Connection Details
1. Go to **Project Settings > Database**
2. Copy the **Connection string (URI)** — you'll need this for Render:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

---

## Step 2: Migrate Backend to PostgreSQL

> **Important**: The current backend uses SQLite (`better-sqlite3`). For Supabase, you need to switch to PostgreSQL. Here's what to change:

### 2.1 Install PostgreSQL Driver
```bash
npm install pg @types/pg
```

### 2.2 Replace Database Connection in `server.ts`
Replace:
```typescript
import Database from "better-sqlite3";
const db = new Database("college.db");
```

With:
```typescript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### 2.3 Replace Query Syntax
SQLite uses `db.prepare("...").run(...)` and `.get(...)` and `.all(...)`.
PostgreSQL uses `pool.query("...", [...])`.

**Key differences:**
| SQLite | PostgreSQL |
|--------|-----------|
| `db.prepare("SELECT * FROM users WHERE id = ?").get(id)` | `(await pool.query("SELECT * FROM users WHERE id = $1", [id])).rows[0]` |
| `db.prepare("INSERT INTO...").run(...)` | `await pool.query("INSERT INTO...", [...])` |
| `result.lastInsertRowid` | `result.rows[0].id` (add `RETURNING id` to INSERT) |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| Synchronous | All queries are `async/await` |

> **Tip for demo**: You can keep SQLite for the demo if deploying on Render (SQLite works on Render's disk). Switch to PostgreSQL only when you need persistent production data.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Configure Environment Variable
Create or update `src/config.ts`:
```typescript
export const API_URL = import.meta.env.VITE_API_URL || '';
```

Then, in every `axios` call, prefix with `API_URL`:
```typescript
import { API_URL } from '../config';
axios.get(`${API_URL}/api/students`, { headers });
```

### 3.2 Deploy to Vercel
1. Push your code to **GitHub**
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://dreamland-api.onrender.com` |
6. Click **"Deploy"**

### 3.3 Custom Domain (Optional)
- Go to **Settings > Domains** and add your domain

---

## Step 4: Deploy Backend to Render

### 4.1 Prepare the Repository
Make sure these files are in your repo root:
- `server.ts` (your backend)
- `package.json` (with all dependencies)
- `render.yaml` (already created)

### 4.2 Deploy to Render
1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** > **"Web Service"**  
3. Connect your GitHub repository
4. Configure:
   - **Name**: `dreamland-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx server.ts`
   - **Plan**: Free
5. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `JWT_SECRET` | *(generate a random 64-char string)* |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
   | `DATABASE_URL` | *(your Supabase connection string)* |
   | `AFROMESSAGE_MOCK_MODE` | `true` |
   | `CHAPA_MOCK_MODE` | `true` |
6. Click **"Create Web Service"**

### 4.3 Health Check
Once deployed, verify: `https://dreamland-api.onrender.com/api/health`

Should return:
```json
{ "status": "ok", "timestamp": "...", "version": "1.0.0" }
```

---

## Step 5: Connect Everything

### 5.1 Update Vercel Environment Variable
After Render deploys, copy the Render URL and update the Vercel env var:
1. Go to your Vercel project > **Settings > Environment Variables**
2. Set `VITE_API_URL` = `https://dreamland-backend.onrender.com`
3. **Redeploy** from Vercel dashboard

### 5.2 Update Render CORS
1. Go to your Render service > **Environment**
2. Set `ALLOWED_ORIGINS` = `https://your-app.vercel.app`
3. The service will auto-restart

### 5.3 Test the Full Flow
1. Open your Vercel URL in a browser
2. Click "Login"
3. Login with: `admin` / `admin123`
4. You should see the Dashboard

---

## Step 6: Supabase Auth (Optional Enhancement)

If you want to use Supabase Auth instead of custom JWT:

### 6.1 Enable Auth in Supabase
1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Optionally enable **Phone** (for SMS OTP)

### 6.2 Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 6.3 Replace Custom Auth
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Replace login endpoint
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  res.json({ token: data.session?.access_token, user: data.user });
});
```

> **Note**: This is an advanced step. The existing JWT system works perfectly for demos.

---

## Environment Variables Summary

### Vercel (Frontend)
| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://dreamland-backend.onrender.com` | Backend API base URL |

### Render (Backend)
| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | `10000` | Render default port |
| `JWT_SECRET` | *(random 64-char string)* | JWT signing secret |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Frontend URL for CORS |
| `DATABASE_URL` | `postgresql://...` | Supabase connection string |
| `AFROMESSAGE_MOCK_MODE` | `true` | SMS mock mode |
| `CHAPA_MOCK_MODE` | `true` | Payment mock mode |

### Supabase
| Variable | Where to Find |
|----------|---------------|
| `SUPABASE_URL` | Project Settings > API > URL |
| `SUPABASE_ANON_KEY` | Project Settings > API > anon key |
| `DATABASE_URL` | Project Settings > Database > URI |

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `admin123` |

> After login, create additional users via **Dashboard > User Management**.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors in browser | Check `ALLOWED_ORIGINS` on Render matches your Vercel URL exactly |
| 401 Unauthorized | JWT may have expired (8h). Re-login |
| Render shows "Suspended" | Free tier spins down after 15 min. First request takes ~30s |
| Database connection refused | Check `DATABASE_URL` format and Supabase project status |
| Build fails on Vercel | Ensure `npm run build` works locally first |
