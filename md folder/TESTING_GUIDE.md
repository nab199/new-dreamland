# 🧪 Dreamland College - Testing Guide

## ✅ Completed Implementation

### **Frontend (Web)**
- ✅ AI Features Component (Grade Prediction, At-Risk Detection, Report Comments, Chatbot, Study Tips)
- ✅ Parent Portal Component (Children Management, Grades, Attendance, Finance)
- ✅ Analytics Dashboard (Enrollment Trends, Revenue Trends, Program Distribution, Branch Comparison, Course Performance)
- ✅ Backup Management (Create/Restore/Delete Backups, GDPR Export, Auto-Enrollment)
- ✅ Dashboard Integration (All new tabs added to navigation)

### **Mobile App (React Native/Expo)**
- ✅ Login Screen
- ✅ Dashboard Screen with role-based stats
- ✅ API Service Integration (All endpoints)
- ✅ Navigation Setup

---

## 🚀 How to Test Everything

### **Step 1: Start the Server**

```bash
cd "c:\Users\nabio\Desktop\new dream land"
npm install
npm run dev
```

Server will start at: `http://localhost:3000`

### **Step 2: Configure Environment Variables**

Create or update `.env.local` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=dreamland-secret-key-change-me

# AfroMessage (SMS)
AFROMESSAGE_API_KEY=your_afromessage_api_key
AFROMESSAGE_SENDER_ID=Dreamland
AFROMESSAGE_MOCK_MODE=false

# Chapa Payment
CHAPA_SECRET_KEY=your_chapa_secret_key
CHAPA_PUBLIC_KEY=your_chapa_public_key
CHAPA_MOCK_MODE=true

# CBE Verification
CBE_VERIFIER_URL=http://localhost:5001

# App URL
APP_URL=http://localhost:3000
```

### **Step 3: Test SMS Feature (AfroMessage)**

#### **Option A: Via API (Recommended)**

```bash
# Test SMS endpoint
curl -X POST http://localhost:3000/api/sms/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+251913224991",
    "message": "🎓 Test message from Dreamland College! Your SMS system is working correctly."
  }'
```

#### **Option B: Via Dashboard**

1. Login as admin (`admin` / `admin123`)
2. Go to **Integrations** tab
3. Find SMS Testing section
4. Enter phone: `+251913224991`
5. Enter message: `Test message from Dreamland College`
6. Click Send

#### **Expected Result:**
- If `AFROMESSAGE_MOCK_MODE=false` and API key is set: You'll receive SMS on your phone
- If mock mode is true: Check server console for mock message

### **Step 4: Test Email/Password Reset**

#### **Send Password Reset Request**

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nabiotsamuel690@gmail.com"
  }'
```

#### **Expected Result:**
- Reset code will be logged to server console (for now)
- Check console for: `[RESET CODE] User: nabiotsamuel690@gmail.com, Code: XXXXXXXX`
- SMS will also be sent if phone number is linked

#### **Reset Password:**

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nabiotsamuel690@gmail.com",
    "token": "CODE_FROM_CONSOLE",
    "new_password": "newpassword123"
  }'
```

### **Step 5: Test AI Features**

```bash
# Get at-risk students
curl http://localhost:3000/api/ai/at-risk-students \
  -H "Authorization: Bearer YOUR_TOKEN"

# Predict grade
curl -X POST http://localhost:3000/api/ai/predict-grade \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "course_id": 1
  }'

# Chat with AI
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I register for courses?"
  }'
```

### **Step 6: Test Analytics**

```bash
# Enrollment trends
curl http://localhost:3000/api/analytics/enrollment-trends \
  -H "Authorization: Bearer YOUR_TOKEN"

# Revenue trends
curl http://localhost:3000/api/analytics/revenue-trends \
  -H "Authorization: Bearer YOUR_TOKEN"

# Program distribution
curl http://localhost:3000/api/analytics/program-distribution \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Step 7: Test Backup System**

```bash
# Create backup
curl -X POST http://localhost:3000/api/admin/backup \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# List backups
curl http://localhost:3000/api/admin/backups \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Export student data (GDPR)
curl http://localhost:3000/api/students/1/export \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Step 8: Test Parent Portal**

```bash
# Link parent to student (admin only)
curl -X POST http://localhost:3000/api/parent/link-student \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_user_id": 5,
    "student_id": 1,
    "relationship": "father"
  }'

# Parent views children
curl http://localhost:3000/api/parent/my-children \
  -H "Authorization: Bearer YOUR_PARENT_TOKEN"

# View child's grades
curl http://localhost:3000/api/parent/child/1/grades \
  -H "Authorization: Bearer YOUR_PARENT_TOKEN"
```

### **Step 9: Test Mobile App**

1. **Update API URL** in `mobile_app/app/login.tsx` and `mobile_app/app/api.ts`:
   - Replace `192.168.1.100` with YOUR computer's IP address
   - Find your IP: Run `ipconfig` in Command Prompt

2. **Install dependencies:**
   ```bash
   cd mobile_app
   npm install
   ```

3. **Start Expo:**
   ```bash
   npm start
   ```

4. **Run on device:**
   - Scan QR code with Expo Go app (iOS/Android)
   - Or press `w` to run in web browser

5. **Test login:**
   - Username: `admin`
   - Password: `admin123`

---

## 📊 Test Checklist

### **API Endpoints**
- [ ] `POST /api/auth/login` - Login
- [ ] `POST /api/auth/forgot-password` - Password reset request
- [ ] `POST /api/auth/reset-password` - Password reset
- [ ] `GET /api/ai/at-risk-students` - At-risk detection
- [ ] `POST /api/ai/predict-grade` - Grade prediction
- [ ] `POST /api/ai/chat` - AI chatbot
- [ ] `GET /api/analytics/enrollment-trends` - Analytics
- [ ] `POST /api/admin/backup` - Create backup
- [ ] `GET /api/students/:id/export` - GDPR export
- [ ] `POST /api/sms/send` - SMS sending
- [ ] `GET /api/parent/my-children` - Parent portal
- [ ] `POST /api/enrollments/auto-enroll` - Auto-enrollment

### **Frontend (Web)**
- [ ] AI Features tab visible and functional
- [ ] Analytics dashboard shows charts
- [ ] Parent portal displays child data
- [ ] Backup management creates/restores backups
- [ ] All navigation items appear based on role

### **Mobile App**
- [ ] Login screen loads
- [ ] Authentication works
- [ ] Dashboard shows correct stats
- [ ] Logout works
- [ ] Pull-to-refresh updates data

### **SMS/Email**
- [ ] SMS sent to +251913224991
- [ ] Password reset code generated
- [ ] Reset code sent via SMS/email

---

## 🔧 Troubleshooting

### **SMS Not Sending**
1. Check `AFROMESSAGE_API_KEY` is set
2. Set `AFROMESSAGE_MOCK_MODE=false`
3. Verify phone number format: `+251913224991`
4. Check server console for errors

### **Email Not Working**
Currently, email is logged to console. To enable real email:
1. Install nodemailer: `npm install nodemailer`
2. Add email config to server
3. Update `/api/auth/forgot-password` route

### **Mobile App Can't Connect**
1. Ensure phone and computer on same WiFi
2. Use computer's IP (not localhost)
3. Check firewall allows port 3000
4. Verify API_URL is correct

### **AI Features Not Working**
1. Check `GEMINI_API_KEY` is valid
2. AI features have fallback mode (work without AI)
3. Check server console for AI errors

---

## 📱 Quick SMS Test

To immediately test SMS to your phone, run this in your browser console while logged in as admin:

```javascript
fetch('/api/sms/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('dreamland_token')
  },
  body: JSON.stringify({
    to: '+251913224991',
    message: '🎓 Dreamland College Test - SMS is working!'
  })
}).then(r => r.json()).then(console.log);
```

---

## 📧 Quick Password Reset Test

```javascript
fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'nabiotsamuel690@gmail.com'
  })
}).then(r => r.json()).then(console.log);
```

Check server console for the reset code!

---

## ✅ Next Steps After Testing

1. **Production Setup:**
   - Change all default passwords
   - Set strong JWT_SECRET
   - Enable production mode
   - Set up SSL/HTTPS

2. **User Training:**
   - Create user manuals
   - Record video tutorials
   - Train admin staff

3. **Data Migration:**
   - Import existing student data
   - Set up fee structures
   - Configure academic calendar

4. **Go Live:**
   - Deploy to production server
   - Monitor for issues
   - Collect user feedback

---

**Testing completed? You're ready to launch! 🚀**
