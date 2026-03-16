# Supabase Deployment & Migration Guide

This guide will help you migrate your Dreamland College Management System from a local SQLite database to Supabase (PostgreSQL) for production deployment on Render and Vercel.

## 1. Supabase Project Setup

1.  **Create a Project:** Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Run SQL Migration:**
    -   In your Supabase dashboard, go to the **SQL Editor**.
    -   Click **New query**.
    -   Copy the entire content of `supabase_schema.sql` (found in your project root) and paste it into the editor.
    -   Click **Run**. This will create all tables and seed initial data (Admin user, Branches, etc.).
3.  **Get Connection String:**
    -   Go to **Project Settings** > **Database**.
    -   Find the **Connection string** section.
    -   Copy the **URI** (e.g., `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`).
    -   **Important:** Replace `[YOUR-PASSWORD]` with the password you set when creating the project.

## 2. Update Render Backend (render.yaml)

Your `render.yaml` has been prepared. You need to add the `DATABASE_URL` environment variable in the Render Dashboard once you've created the service:

-   **Key:** `DATABASE_URL`
-   **Value:** `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres`

## 3. Transitioning server.ts to PostgreSQL

Currently, `server.ts` uses `better-sqlite3`. To use Supabase, you have two main options:

### Option A: Use Prisma (Recommended for Production)
Prisma is an ORM that works perfectly with Supabase and TypeScript.
1.  Run `npx prisma init`.
2.  Copy the schema from `supabase_schema.sql` into `prisma/schema.prisma`.
3.  Run `npx prisma db pull` to sync.
4.  Update `server.ts` to use `PrismaClient` instead of `db.prepare()`.

### Option B: Use `pg` (Quickest for Demo)
If you want to keep using raw SQL:
1.  Install the driver: `npm install pg @types/pg`.
2.  Update `server.ts` to initialize a connection pool:
    ```typescript
    import { Pool } from 'pg';
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    ```
3.  Replace SQLite-specific calls:
    -   `db.prepare(sql).get(...)` -> `await db.query(sql, [...]).then(res => res.rows[0])`
    -   `db.prepare(sql).all(...)` -> `await db.query(sql, [...]).then(res => res.rows)`
    -   `db.prepare(sql).run(...)` -> `await db.query(sql, [...])`

## 4. Authentication (Supabase Auth)

Since you asked for Supabase Authentication:

1.  **Enable Auth:** Supabase Auth is enabled by default.
2.  **Migrate Logic:** 
    -   Instead of manually hashing passwords and signing JWTs in `server.ts`, you can use the `@supabase/supabase-js` client in both frontend and backend.
    -   **Frontend:** Use `supabase.auth.signInWithPassword()` in `LoginPage.tsx`.
    -   **Backend:** Verify the Supabase JWT using `supabase.auth.getUser(token)`.

## 5. Summary Checklist for Demo
- [ ] Run `supabase_schema.sql` in Supabase SQL Editor.
- [ ] Update `DATABASE_URL` in `.env.local` and Render.
- [ ] Ensure `JWT_SECRET` is set (at least 32 characters).
- [ ] Deploy Frontend to Vercel (point to Render backend URL).
- [ ] Deploy Backend to Render (point to Supabase DB).

---
*Note: The seeded Admin account is `admin@dreamland.edu` / `admin123`.*
