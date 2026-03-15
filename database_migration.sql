-- Database Migration Script for Authentication Enhancements
-- Run this on your existing college.db to add new security features
-- Date: March 13, 2026

-- ========================================
-- 1. Add Account Lockout Columns
-- ========================================

-- Add failed login attempts tracking
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;

-- Add account lockout timestamp
ALTER TABLE users ADD COLUMN locked_until TEXT;

-- ========================================
-- 2. Add Email Column (if not exists)
-- ========================================

-- Add email for password reset functionality
ALTER TABLE users ADD COLUMN email TEXT;

-- ========================================
-- 3. Update Existing Admin User
-- ========================================

-- Add email to the default admin account
-- Replace with your actual admin email
UPDATE users 
SET email = 'admin@dreamland.edu' 
WHERE username = 'admin' AND email IS NULL;

-- ========================================
-- 4. Create Indexes for Performance
-- ========================================

-- Index for faster email lookups (password reset)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for faster username lookups (login)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Index for token lookups (password reset tokens)
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);

-- Index for user's reset tokens
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);

-- ========================================
-- 5. Verification Queries
-- ========================================

-- Check that columns were added
SELECT name, sql 
FROM sqlite_master 
WHERE type='table' AND name='users';

-- Verify admin has email
SELECT id, username, email, role 
FROM users 
WHERE username = 'admin';

-- ========================================
-- 6. Rollback (IF SOMETHING GOES WRONG)
-- ========================================

/*
-- WARNING: SQLite doesn't support DROP COLUMN in older versions
-- For SQLite 3.35.0+, you can use:

ALTER TABLE users DROP COLUMN failed_login_attempts;
ALTER TABLE users DROP COLUMN locked_until;
ALTER TABLE users DROP COLUMN email;

-- For older SQLite, you need to recreate the table:

BEGIN TRANSACTION;

CREATE TABLE users_backup AS SELECT id, username, password, role, branch_id, full_name FROM users;
DROP TABLE users;

-- Recreate original table structure
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  branch_id INTEGER,
  full_name TEXT,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

INSERT INTO users SELECT id, username, password, role, branch_id, full_name FROM users_backup;
DROP TABLE users_backup;

COMMIT;
*/

-- ========================================
-- 7. Test the Migration
-- ========================================

-- Test failed login tracking (manual test via login endpoint)
-- Test password reset (manual test via /forgot-password)

-- ========================================
-- END OF MIGRATION
-- ========================================
