# 📧 SMS & Email Setup Guide

## ✅ What's Been Enabled

Your Dreamland College system now has **REAL SMS and Email** functionality!

### **Features:**
- ✅ **SMS via AfroMessage** - Password resets, payment confirmations, notifications
- ✅ **Email via Gmail SMTP** - Beautiful HTML emails for password resets, payments, welcome messages
- ✅ **Dual Delivery** - Both SMS and Email sent simultaneously
- ✅ **Console Fallback** - Messages logged to console if services fail

---

## 🔧 Step-by-Step Setup

### **Step 1: Get AfroMessage API Key (For SMS)**

1. **Visit:** https://afromessage.com
2. **Sign up** for a new account
3. **Go to Dashboard** → API Keys
4. **Copy your API key** (looks like: `am_xxxxxxxxxxxxxxxx`)
5. **Add to `.env.local`:**
   ```env
   AFROMESSAGE_API_KEY=am_your_actual_api_key_here
   AFROMESSAGE_MOCK_MODE=false
   AFROMESSAGE_SENDER_ID=Dreamland
   ```

### **Step 2: Setup Gmail App Password (For Email)**

**Important:** You need a Gmail account and must enable 2FA first.

1. **Enable 2-Factor Authentication:**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"
   - Follow the setup process

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter: `Dreamland College`
   - Click **Generate**
   - **Copy the 16-character password** (no spaces!)

3. **Add to `.env.local`:**
   ```env
   EMAIL_ENABLED=true
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=nabiotsamuel690@gmail.com
   EMAIL_PASSWORD=abcd1234efgh5678  # Your 16-char app password
   EMAIL_FROM_NAME=Dreamland College
   EMAIL_FROM_ADDRESS=nabiotsamuel690@gmail.com
   ```

### **Step 3: Update `.env.local` File**

Open `c:\Users\nabio\Desktop\new dream land\.env.local` and fill in:

```env
# SMS - AfroMessage
AFROMESSAGE_MOCK_MODE=false  # ← Change from true to false
AFROMESSAGE_API_KEY=YOUR_KEY_HERE  # ← Add your key

# Email - Gmail
EMAIL_ENABLED=true
EMAIL_USER=nabiotsamuel690@gmail.com
EMAIL_PASSWORD=YOUR_16_CHAR_PASSWORD  # ← Add app password
```

### **Step 4: Restart Server**

```bash
# Stop current server (Ctrl+C)
npm run dev
```

You should see:
```
✅ Email service ready - Ready to send messages!
```

---

## 🧪 Testing

### **Test SMS & Email Together**

1. **Start server:**
   ```bash
   npm run dev
   ```

2. **Open test page:**
   ```
   http://localhost:3000/test_features.html
   ```

3. **Login to dashboard** first (to get token):
   - Username: `admin`
   - Password: `admin123`

4. **Go back to test page** - token auto-loads

5. **Test Password Reset:**
   - Email: `nabiotsamuel690@gmail.com`
   - Click **"Request Password Reset"**
   - ✅ **Check your phone** for SMS
   - ✅ **Check your email** for beautiful HTML email
   - ✅ **Check server console** for reset code

### **Expected Results:**

**SMS on your phone:**
```
🔐 Dreamland College Password Reset

Your reset code is: ABC12345

Valid for 1 hour.

If you didn't request this, contact support immediately.
```

**Email in your inbox:**
- Subject: 🔐 Password Reset Request - Dreamland College
- Beautiful HTML email with college branding
- Reset code in a styled box
- Security warnings and instructions

**Server console:**
```
✅ SMS sent to +251913224991
✅ Email sent to nabiotsamuel690@gmail.com

🔑 PASSWORD RESET CODE
━━━━━━━━━━━━━━━━━━━━━
📧 Email: nabiotsamuel690@gmail.com
👤 User: System Administrator
🔢 Code: ABC12345
⏰ Expires: 2024-03-14T15:30:00.000Z
━━━━━━━━━━━━━━━━━━━━━
```

---

## 📱 Send Test SMS Directly

While logged into dashboard, open browser console (F12) and run:

```javascript
fetch('/api/sms/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('dreamland_token')
  },
  body: JSON.stringify({
    to: '+251913224991',
    message: '🎓 Test from Dreamland College! SMS is working!'
  })
}).then(r => r.json()).then(d => {
  console.log('SMS Result:', d);
  alert('Check your phone!');
});
```

---

## 📨 Send Test Email

```javascript
fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'nabiotsamuel690@gmail.com'
  })
}).then(r => r.json()).then(d => {
  console.log('Result:', d);
  alert('Check your email and phone!');
  console.log('Reset code:', d.debug?.code);
});
```

---

## 🎯 When SMS/Email Are Sent

### **Password Reset** (Both SMS + Email)
- User clicks "Forgot Password"
- Reset code sent to email AND phone
- Also logged in console

### **Payment Confirmation** (Both SMS + Email)
- Student payment verified
- Confirmation sent to email AND phone
- Includes amount and reference number

### **At-Risk Student Alerts** (SMS only)
- Weekly automated report
- Sent to admin/staff phones

### **Registration Reminders** (SMS only)
- Daily at 8:00 AM
- Sent to students with pending registration

---

## ❌ Troubleshooting

### **SMS Not Sending**

**Problem:** "SMS failed" in console

**Solutions:**
1. Check `AFROMESSAGE_API_KEY` is correct
2. Set `AFROMESSAGE_MOCK_MODE=false`
3. Verify account has SMS credits
4. Check phone number format: `+251913224991`

### **Email Not Sending**

**Problem:** "Email failed" or "Authentication failed"

**Solutions:**
1. **Enable 2FA** on Gmail account first
2. **Generate App Password** (not regular password!)
3. Check `EMAIL_USER` is correct Gmail address
4. Check `EMAIL_PASSWORD` is 16 characters (no spaces)
5. Verify `EMAIL_ENABLED=true`

### **Both Fail**

**Problem:** Services not initializing

**Solutions:**
1. Restart server after changing `.env.local`
2. Check for typos in environment variables
3. Look for initialization errors in console
4. Verify `.env.local` file exists

---

## 🔐 Security Notes

### **Important:**
1. **Never commit `.env.local`** to Git (it's in .gitignore)
2. **Change JWT_SECRET** in production
3. **Use HTTPS** in production
4. **Rotate API keys** regularly
5. **Monitor usage** on AfroMessage dashboard

### **Production Checklist:**
- [ ] Change all default passwords
- [ ] Use production API keys
- [ ] Enable SSL/HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Remove debug info from responses
- [ ] Set up monitoring/alerts

---

## 📊 Service Status

Check service status in server console on startup:

```
✅ Email service ready - Ready to send messages!
```

or

```
❌ Email service verification failed: Invalid login
⚠️  Email notifications will be disabled
```

---

## 💡 Pro Tips

1. **Test Mode:** Keep `MOCK_MODE=true` during development to avoid sending real messages
2. **Dual Delivery:** Both SMS and Email sent for critical actions (password reset, payments)
3. **Console Logging:** All messages logged to console even if services fail
4. **Graceful Degradation:** System continues working even if SMS/Email fail
5. **Error Handling:** Failures caught and logged, don't crash the server

---

## 🎉 You're Ready!

Once configured:
- ✅ Password resets sent via SMS + Email
- ✅ Payment confirmations sent via SMS + Email
- ✅ Beautiful HTML emails with branding
- ✅ Instant SMS notifications
- ✅ Console backup for debugging

**Start testing now!** 🚀

```bash
npm run dev
```

Then visit: `http://localhost:3000/test_features.html`
