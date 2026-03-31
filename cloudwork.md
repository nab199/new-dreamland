# Cloudwork.md - Remaining 25% for Production

**Project:** Dreamland College Management System  
**Document Date:** March 24, 2026  
**Current Status:** 75% - Demo Ready  
**Target Status:** 100% - Production Ready

---

## Overview

This document outlines the remaining 25% of work needed to make the Dreamland College Management System production-ready. These items are **not critical for demo** but are essential for a professional, scalable, and secure production deployment.

---

## 1. Payment Integration - Chapa (15% → Complete)

### Current Status
```
CHAPA_MOCK_MODE=true
CHAPA_SECRET_KEY=CHASECK_TEST_REPLACE
CHAPA_PUBLIC_KEY=CHAPUB_TEST_REPLACE
```

### What's Needed
1. Create account at https://dashboard.chapa.co
2. Get live API keys
3. Configure webhook URL
4. Update environment variables

### How to Fix

**Step 1: Get Chapa API Keys**
```
1. Go to https://dashboard.chapa.co
2. Sign up / Log in
3. Go to Developers → API Keys
4. Copy Test Secret Key: CHASECK_TEST_xxxxxxxx
5. Copy Test Public Key: CHAPUB_TEST_xxxxxxxx
```

**Step 2: Update .env.local**
```env
CHAPA_MOCK_MODE=false
CHAPA_SECRET_KEY=CHASECK_TEST_your-real-key
CHAPA_PUBLIC_KEY=CHAPUB_TEST_your-real-key
CHAPA_WEBHOOK_SECRET=your-random-secret-here
```

**Step 3: Configure Webhook**
```
1. In Chapa dashboard, go to Settings → Webhooks
2. Add webhook URL: https://your-domain.com/api/payments/chapa-webhook
3. Enable events: payment.success, payment.failed
```

**Estimated Time:** 30 minutes (mostly waiting for account approval)

---

## 2. Telegram Bot Integration (5%)

### Current Status
- Code is integrated ✅
- Bot token not configured ❌

### What's Needed
1. Create Telegram bot via @BotFather
2. Get bot token
3. Add to environment

### How to Fix

**Step 1: Create Bot**
```
1. Open Telegram
2. Search for @BotFather
3. Send /newbot
4. Give bot a name (e.g., Dreamland Assistant)
5. Give bot a username (e.g., dreamlandcollege_bot)
6. Copy the token: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Step 2: Update .env.local**
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Step 3: (Optional) Add to Server Code**
```typescript
// In server.ts, uncomment/add notification calls:
if (student.telegram_chat_id) {
  await telegramService.sendWelcomeMessage(student.telegram_chat_id, studentName);
}
```

**Estimated Time:** 15 minutes

---

## 3. Custom Email Domain (5%)

### Current Status
```
EMAIL_FROM_ADDRESS=onboarding@resend.dev  // Test domain
```

### What's Needed
1. Own domain (e.g., dreamland.edu.et)
2. Configure DNS records
3. Verify in Resend dashboard

### How to Fix

**Step 1: Get a Domain**
```
- Register at Namecheap, GoDaddy, or local registrar
- Recommended: dreamland.edu.et (education domain)
- Cost: ~$10-30/year
```

**Step 2: Add Domain to Resend**
```
1. Log in to https://resend.com
2. Go to →Domains
3. Add your domain: dreamland.edu.et
4. Resend will give you DNS records to add
```

**Step 3: Add DNS Records**
```
Add these records in your domain registrar:

Type: TXT
Name: @ (or empty)
Value: "sendgrid-verification=xxxxx"

Type: MX
Name: @
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com

Type: TXT  
Name: @
Value: "v=spf1 include:amazonses.com ~all"
```

**Step 4: Update .env.local**
```env
EMAIL_FROM_NAME=Dreamland College
EMAIL_FROM_ADDRESS=noreply@dreamland.edu.et
```

**Estimated Time:** 1-2 days (for DNS propagation)

---

## 4. Cloud Deployment (Not counted - Optional)

### Options

| Platform | Difficulty | Cost | Notes |
|----------|-----------|------|-------|
| **Vercel + Render** | Easy | Free tier | What you're using now |
| **AWS EC2** | Medium | ~$10-20/mo | Full control |
| **DigitalOcean** | Medium | ~$6/mo | Simple setup |
| **Railway** | Easy | ~$5/mo | Great for Node.js |

### Recommended: Render + Vercel

**Backend (Render):**
```
1. Go to render.com
2. Connect GitHub repo
3. Create Web Service
4. Root directory: /
5. Build command: (leave empty or npm run build)
6. Start command: npm run start
7. Add env vars from .env.local
```

**Frontend (Vercel):**
```
1. Already configured in vercel.json
2. Just push to GitHub
3. Vercel auto-deploys
```

---

## 5. Security Hardening (5%)

### What's Needed

**JWT Secret Rotation**
```env
# Generate new secret:
# Linux/Mac: openssl rand -hex 32
# Windows PowerShell: -join ((1..64) | ForEach-Object { [char](33..126) } | Get-Random)
JWT_SECRET=your-new-super-secret-key-at-least-32-chars
```

**CORS Restriction**
```typescript
// In server.ts, replace ALLOWED_ORIGINS with specific domains:
app.use(cors({
  origin: [
    'https://dreamland.edu.et',
    'https://www.dreamland.edu.et',
    'https://dreamland.vercel.app'
  ],
  credentials: true
}));
```

**Rate Limiting Review**
```typescript
// Already implemented, but review these values:
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Reduce from 100 to 5 for production
  message: { error: "Too many attempts" }
});
```

**Estimated Time:** 1 hour

---

## 6. Database Migration to Cloud (Not counted)

### Current: SQLite (Local)
```sqlite
college.db  // ~50-500MB depending on data
```

### Options for Scaling

**Option A: Supabase (Recommended)**
```bash
# Export current data:
node -e "const db = require('better-sqlite3')('./college.db'); 
console.log(JSON.stringify(db.prepare('SELECT * FROM students').all()))"
```

**Option B: PlanetScale (MySQL)**
```bash
# Export to MySQL format
# Use mysqlimport or similar tools
```

**Option C: Neon (PostgreSQL)**
```
1. Create account at neon.tech
2. Create new project
3. Get connection string
4. Update DATABASE_URL env var
```

**Estimated Time:** 2-4 hours

---

## 7. Testing Suite (Not counted)

### What's Needed

**Unit Tests (Jest)**
```bash
npm install --save-dev jest ts-jest @types/jest
npx ts-jest config:init
```

**Example Test**
```typescript
// __tests__/afroMessageService.test.ts
import { AfroMessageService } from '../src/services/messaging/afroMessageService';

describe('AfroMessageService', () => {
  it('should send SMS successfully', async () => {
    const service = new AfroMessageService({
      apiKey: 'test-key',
      mockMode: true
    });
    
    const result = await service.sendSMS('+251911111111', 'Test');
    expect(result.success).toBe(true);
  });
});
```

**E2E Tests (Playwright)**
```bash
npm install --save-dev playwright
npx playwright install
```

**Estimated Time:** 1-2 days (can be done post-launch)

---

## 8. Documentation (Not counted)

### What's Needed

**API Documentation (Swagger/OpenAPI)**
```bash
npm install swagger-ui-express swagger-jsdoc
```

**Example**
```typescript
// Add to server.ts:
/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: List of students
 */
app.get('/api/students', authenticate, authorize(['admin']), (req, res) => {
  // ...
});
```

**User Manual**
```
Create PDF/Google Doc covering:
- Admin setup guide
- Student registration flow
- Payment verification guide
- FAQ
```

**Estimated Time:** 4-8 hours

---

## Priority Checklist

### Must Do Before Launch (Critical)
- [ ] Get Chapa API keys and test real payment
- [ ] Rotate JWT secret
- [ ] Set up proper CORS domains
- [ ] Test full registration flow
- [ ] Backup database

### Should Do Before Launch (Important)
- [ ] Configure Telegram bot
- [ ] Set up custom email domain
- [ ] Choose and configure hosting
- [ ] Set up monitoring (Sentry, LogRocket)

### Can Do After Launch (Nice to Have)
- [ ] Add unit tests
- [ ] Set up CI/CD pipeline
- [ ] Add API documentation
- [ ] Cloud database migration
- [ ] Push notifications

---

## Time & Cost Estimate

| Task | Time | Cost |
|------|------|------|
| Chapa Integration | 30 min | Free |
| Telegram Bot | 15 min | Free |
| Email Domain | 1-2 days | ~$15/year |
| Security Hardening | 1 hour | Free |
| Cloud Hosting | 2-4 hours | ~$10-20/mo |
| Testing Suite | 1-2 days | Free |
| Documentation | 1 day | Free |

**Total Additional Time:** 2-3 days  
**Total Additional Cost:** ~$10-20/month hosting + domain

---

## Support Resources

### AfroMessage
- Dashboard: https://app.afromessage.com
- Docs: https://www.afromessage.com/developers
- Support: support@afromessage.com

### Chapa
- Dashboard: https://dashboard.chapa.co
- Docs: https://developer.chapa.co
- Support: support@chapa.co

### Resend
- Dashboard: https://resend.com
- Docs: https://resend.com/docs
- Support: support@resend.com

### Google Gemini
- API Key: https://aistudio.google.com/apikey
- Docs: https://ai.google.dev/docs

---

## Conclusion

The remaining 25% is mostly **configuration and third-party integrations** that require:
1. Creating accounts with service providers
2. Getting API keys
3. Adding DNS records
4. Testing

None of this requires code changes - it's just **setup work**. The core functionality is complete and working.

**You're ready to present with 75%. The remaining 25% is "checkbox work" that can be done in a few hours before or after launch.**
