# 🚀 Quick Start - Enable SMS & Email

## ⚡ FAST SETUP (5 minutes)

### **1. Get Your API Keys**

#### **AfroMessage (SMS):**
1. Go to: https://afromessage.com
2. Sign up → Dashboard → Copy API Key
3. Example key: `am_xxxxxxxxxxxxxxxx`

#### **Gmail App Password (Email):**
1. Go to: https://myaccount.google.com/apppasswords
2. Create app password for "Mail"
3. Copy 16-character password (no spaces!)
4. Example: `abcd1234efgh5678`

---

### **2. Update .env.local**

Open: `c:\Users\nabio\Desktop\new dream land\.env.local`

**Replace these lines:**
```env
AFROMESSAGE_API_KEY=REPLACE_WITH_YOUR_AFROMESSAGE_KEY
EMAIL_PASSWORD=YOUR_16_CHAR_APP_PASSWORD_HERE
```

**With your actual keys:**
```env
AFROMESSAGE_API_KEY=am_your_actual_key
EMAIL_PASSWORD=abcd1234efgh5678
```

**And change:**
```env
AFROMESSAGE_MOCK_MODE=false  # Was: true
```

---

### **3. Restart Server**

```bash
# Press Ctrl+C to stop current server
npm run dev
```

**Look for this in console:**
```
✅ Email service ready - Ready to send messages!
```

---

### **4. Test Now!**

#### **Option A: Use Test Page**
```
http://localhost:3000/test_features.html
```
1. Login to dashboard first
2. Click "Load from Dashboard"
3. Click "Request Password Reset"
4. ✅ Check your phone for SMS
5. ✅ Check your email inbox

#### **Option B: Browser Console**
Press F12 and paste:
```javascript
// Test SMS & Email
fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'nabiotsamuel690@gmail.com' })
}).then(r => r.json()).then(d => {
  console.log('✅ Check your phone and email!');
  console.log('Reset code:', d.debug?.code);
});
```

---

## ✅ Expected Results

### **On Your Phone (+251913224991):**
```
🔐 Dreamland College Password Reset

Your reset code is: ABC12345

Valid for 1 hour.
```

### **In Your Email (nabiotsamuel690@gmail.com):**
- Subject: 🔐 Password Reset Request - Dreamland College
- Beautiful HTML email with logo and branding
- Reset code in styled box

### **In Server Console:**
```
✅ SMS sent to +251913224991
✅ Email sent to nabiotsamuel690@gmail.com

🔑 PASSWORD RESET CODE
━━━━━━━━━━━━━━━━━━━━━
📧 Email: nabiotsamuel690@gmail.com
🔢 Code: ABC12345
⏰ Expires: 2024-03-14T15:30:00.000Z
━━━━━━━━━━━━━━━━━━━━━
```

---

## ❌ If It Doesn't Work

### **SMS Issues:**
```
❌ SMS failed
```
**Fix:**
1. Check `AFROMESSAGE_API_KEY` is correct
2. Set `AFROMESSAGE_MOCK_MODE=false`
3. Restart server

### **Email Issues:**
```
❌ Email failed: Invalid login
```
**Fix:**
1. Must use **App Password** (not regular password)
2. Enable 2FA on Gmail first
3. Check password is 16 characters (no spaces)

### **Both Fail:**
Messages still logged to console - system still works!

---

## 🎯 That's It!

You now have:
- ✅ Real SMS sending to Ethiopian phones
- ✅ Beautiful HTML emails
- ✅ Dual delivery (SMS + Email)
- ✅ Payment confirmations
- ✅ Password resets
- ✅ Console backup

**Go to `http://localhost:3000/test_features.html` and test!** 🎉

---

## 📚 Need More Help?

- Full guide: `SMS_EMAIL_SETUP.md`
- Testing guide: `TESTING_GUIDE.md`
- All features: `FINAL_SUMMARY.md`
