# System Architecture & Student Registration Logic

This document details the internal logic and architectural flow of the Dreamland College Management System, specifically focused on the registration and authentication process.

## 1. Architectural Overview

The system follows a classic **MERN-like** architecture (using SQLite instead of MongoDB):

*   **Frontend**: React + Vite + Tailwind CSS.
    *   Uses `react-router-dom` for navigation.
    *   Uses `axios` for API communication.
    *   `AuthContext` handles session state via JWT stored in memory/context.
*   **Backend**: Node.js + Express + `better-sqlite3`.
    *   Single-file server (`server.ts`) handling all API routes and database initialization.
    *   Middleware used for JWT authentication and role-based authorization.
*   **Database**: SQLite (`college.db`).
    *   Relational schema with tables: `users`, `students`, `branches`, `programs`, `courses`, `enrollments`, `payments`, etc.

## 2. Student Registration Flow

There are two primary ways a student is added to the system:

### A. Public Self-Registration (`/api/public/register-student`)
1.  **Frontend**: Prospective students use the `PublicRegistration.tsx` page.
2.  **Data Collection**: Gathers personal info, address, educational history, and academic preferences.
3.  **Payment (Mocked)**: Requires CBE transaction reference if the CBE payment method is selected.
4.  **Backend Execution**:
    *   Generates a unique Student ID (e.g., `AA-2026-0001`).
    *   **User Account Creation**: Automatically creates a record in the `users` table.
        *   **Username**: The student's email.
        *   **Password**: User-provided password, or defaults to `password123`.
        *   **Hashing**: All passwords are now hashed using `bcryptjs` (Cost factor: 10).
    *   **Student Profile Creation**: Creates a record in the `students` table linked to the new user ID.

### B. Admin/Registrar Registration (`/api/students`)
1.  **Frontend**: Logged-in staff use `StudentRegistration.tsx`.
2.  **Auth**: Requires a valid JWT with `superadmin` or `branch_admin` roles.
3.  **Audit**: Every student created via this route is logged in the `audit_logs` table.

## 3. Password Creation & Security

### 🔑 Current Password Logic
The system has been upgraded to meet production security standards.

*   **Initial Password**: Students can set their own password during registration.
*   **Secure Storage**: Passwords are never stored in plain text. They are hashed using `bcryptjs` before being saved to the `users` table.
*   **Rate Limiting**: The authentication and registration endpoints are protected by `express-rate-limit` to prevent brute-force attacks.

### 🛡️ Authentication Protocol
1.  Login is handled via `/api/auth/login`.
2.  The server verifies the provided username and uses `bcrypt.compare` to validate the password against the hashed value in the `users` table.
3.  If successful, it returns a JWT (signed with a secret key) containing the user's role and branch ID.
4.  All subsequent protected requests must include this JWT in the `Authorization` header.
5.  All login attempts (success and failure) are recorded in the `audit_logs`.

## 4. Important Implementation Parts

| Feature | File | Description |
| :--- | :--- | :--- |
| **Schema Init** | `server.ts` | Detailed SQL logic for creating 12+ tables, including `audit_logs`. |
| **Auth Context** | `src/context/AuthContext.tsx` | Manages the global login state and axios interceptors. |
| **Dashboad Logic** | `src/pages/Dashboard.tsx` | Large component handling role-based views with integrated analytics charts. |
| **Audit Logs** | `server.ts` | Backend helper `logAction` tracks all sensitive system changes. |
| **SMS/Payment** | `src/services/` | Modules for AfroMessage and CBE verification (mock mode enabled via env). |
