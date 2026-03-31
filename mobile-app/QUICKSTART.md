# 🚀 Quick Start Guide - Dreamland College Mobile App

## Step 1: Install Dependencies

```bash
cd mobile-app
npm install
```

## Step 2: Configure Backend URL

1. Find your computer's IP address:
   ```cmd
   ipconfig
   ```
   Look for **IPv4 Address** (e.g., `192.168.1.100`)

2. Edit `.env` file:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000/api
   ```

3. Make sure your backend server is running:
   ```bash
   cd ..
   npm run dev
   ```

## Step 3: Run the App

```bash
cd mobile-app
npm start
```

Scan the QR code with:
- **Android**: Expo Go app from Play Store
- **iOS**: Expo Go app from App Store OR Camera app

## Step 4: Test Login

Use your existing Dreamland College credentials to login.

---

## 📱 Building APK for Android

### First Time Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (follow prompts)
eas build:configure
```

### Build APK

```bash
# Build APK (for sharing/testing)
npm run build:apk

# Build for Play Store
npm run build:android
```

Download the APK from Expo servers and install on your Android device.

---

## ⚙️ Common Issues

### "Network request failed"
- ✅ Backend server is running
- ✅ IP address in `.env` is correct
- ✅ Phone and computer on same WiFi
- ✅ Firewall allows port 3000

### "Module not found"
```bash
npm install
expo start -c  # Clear cache
```

### App crashes on login
- Check backend console for errors
- Verify `/api/auth/login` endpoint works
- Check CORS settings in `server.ts`

---

## 📋 Next Steps

1. **Customize Branding**: Update `app.json` with your college colors and logo
2. **Push Notifications**: Configure Expo project ID for notifications
3. **Production Build**: Use `eas build` for app store releases
4. **Backend Integration**: Ensure all API endpoints are implemented

---

## 📞 Need Help?

Check the full `README.md` for detailed documentation.
