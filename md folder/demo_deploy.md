# 🚀 Demo Deployment Guide (Updated)

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

## Step 1: Supabase Setup (Database & Auth)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **"New Project"**.
3. Set **Name**, **Database Password**, and **Region**.
4. Click **"Create new project"**.

### 1.2 Run the Production Schema
1. In the Supabase Dashboard, go to **SQL Editor**.
2. Click **"New Query"**.
3. Open `supabase_schema.sql` from your project root.
4. Copy the entire content, paste it into the Supabase SQL Editor, and click **"Run"**.
   - This creates all tables (Branches, Users, Students, etc.).
   - This seeds the **Admin account**: `admin@dreamland.edu` / `admin123`.

### 1.3 Get Connection Details
1. Go to **Project Settings > Database**.
2. Copy the **Connection string (URI)**.
   - Example: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`
   - You will need this for the `DATABASE_URL` environment variable.

---

## Step 2: Backend Configuration (Security & DB)

### 2.1 JWT Security (Mandatory)
The backend now enforces strict security via `AuthConfig.ts`.
- **JWT_SECRET**: Must be at least 32 characters long.
- **Production Requirement**: The server will **fail to start** if `JWT_SECRET` is missing in production.

Generate a secure key:
```bash
openssl rand -base64 32
```

### 2.2 Database Migration (SQLite to Postgres)
The project is being transitioned to PostgreSQL. 
1. **Dependencies**: `pg` and `@supabase/supabase-js` are installed.
2. **Connection**: Use `src/config/DatabaseConfig.ts` to manage the pool.
3. **Async Queries**: Ensure all `db.prepare()` calls in `server.ts` are converted to `await db.query()` or use the `db` helper in `src/config/DatabaseConfig.ts`.

---

## Step 3: Deploy Backend to Render

### 3.1 Create Web Service
1. Connect your GitHub repository to [Render](https://render.com).
2. Use the following settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx server.ts`

### 3.2 Environment Variables (Render)
| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Critical for security enforcement |
| `DATABASE_URL` | `postgresql://...` | From Supabase Settings |
| `JWT_SECRET` | *(32+ chars)* | Your generated secure key |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Your Vercel URL |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase API settings |
| `SUPABASE_ANON_KEY` | `xxxx` | From Supabase API settings |

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Build Configuration
1. Connect your repo to [Vercel](https://vercel.com).
2. Framework Preset: `Vite`.
3. Output Directory: `dist`.

### 4.2 Environment Variables (Vercel)
| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://dreamland-backend.onrender.com` |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `xxxx` |

---

## Step 5: Post-Deployment Checklist
- [ ] Verify database connection: Check Render logs for `DATABASE_URL` errors.
- [ ] Test Login: Use `admin@dreamland.edu` / `admin123`.
- [ ] Check CORS: Ensure the frontend can talk to the backend.
- [ ] JWT Validation: Try a short JWT_SECRET to confirm `AuthConfig` blocks it.

---

## Demo Credentials

| Role | Email / Username | Password |
|------|------------------|----------|
| Super Admin | `admin@dreamland.edu` | `admin123` |

> **Note**: For password resets and SMS features, ensure `RESEND_API_KEY` and `AFROMESSAGE_API_KEY` are configured in Render.
