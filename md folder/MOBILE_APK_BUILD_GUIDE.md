# Dreamland College Mobile App - APK Build Guide

This guide will help you convert your Expo mobile app into an installable APK that works with your production backend on Render and Supabase database.

## ✅ Configuration Already Updated

The following files have been configured to connect to your production backend:

- **[`mobile_app/app/api.ts`](mobile_app/app/api.ts)** - Updated to use `https://new-dreamland.onrender.com/api`
- **[`mobile_app/app.json`](mobile_app/app.json)** - Production API URL configured
- **[`mobile_app/package.json`](mobile_app/package.json)** - Added build scripts

---

## 📋 Prerequisites

Before building the APK, ensure you have:

1. **Node.js** installed (v18+ recommended)
2. **Java Development Kit (JDK)** 17 or higher
3. **Android Studio** with SDK installed
4. **npm** or **yarn**

---

## 🔧 Installing Android Studio (Required for APK Build)

### Step 1: Download Android Studio

1. Go to: https://developer.android.com/studio
2. Download **Android Studio Flamingo** (or latest stable version)
3. Run the installer and follow the installation wizard

### Step 2: Install Required SDK Components

1. Open Android Studio
2. Go to **Tools** → **SDK Manager**
3. In **SDK Platforms** tab, check:
   - ✓ Android SDK Platform 34 (or latest)
   - ✓ Android SDK Build-Tools 34.0.0
4. Click **Apply** to download

### Step 3: Set Environment Variables

**For Windows:**

1. Search for "Environment Variables" in Windows Start menu
2. Click **"Edit the system environment variables"**
3. Click **"Environment Variables"** button
4. Under **System variables**, click **"New"**:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
5. Also add to **Path** (under System variables):
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
6. Click **OK** and restart your terminal

**To find your SDK path:**
- In Android Studio, go to **Tools** → **SDK Manager** → look at "Android SDK Location"

### Step 4: Verify Installation

```bash
# In new terminal, run:
echo %ANDROID_HOME%
# Should show: C:\Users\YourName\AppData\Local\Android\Sdk
```

---

## ☕ Install Java JDK 17

Android builds require Java. Download and install:

1. Go to: https://adoptium.net/temurin/releases/
2. Download **JDK 17 (LTS)** for Windows (x64 MSI installer)
3. Run the installer
4. Set JAVA_HOME:
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x` (or your install path)

---

## 🔨 Building the APK (Step by Step)

### Step 1: Install Dependencies

```bash
cd mobile_app
npm install
```

### Step 2: Generate Native Android Project

```bash
npx expo prebuild --platform android
```

This will create an `android` folder with native Android project files.

### Step 3: Build Debug APK

```bash
# Method 1: Using expo (requires Android Studio running)
npx expo run:android

# Method 2: Using Gradle directly (faster)
cd android
./gradlew assembleDebug
```

The APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 4: Build Release APK (Recommended for distribution)

```bash
cd android
./gradlew assembleRelease
```

The release APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔧 Environment Variables for Backend

Your mobile app is configured to connect to:

| Service | URL |
|---------|-----|
| **Backend API** | `https://new-dreamland.onrender.com/api` |
| **Supabase** | Configured in your main app |

---

## 📱 Installing the APK

### On Android Device:
1. Transfer the APK file to your phone
2. Enable "Install from unknown sources" in Settings
3. Open the APK file and install

### On Emulator:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## ⚠️ Important Notes

### Backend CORS Configuration
Make sure your Render backend allows requests from your mobile app. Update the `ALLOWED_ORIGINS` in your environment:

```
ALLOWED_ORIGINS=https://new-dreamland.onrender.com,exp://localhost:8081
```

### Supabase Configuration
If your app uses Supabase, ensure:
1. You have `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set
2. Supabase project allows connections from the mobile app

### Network Requirements
- The APK will work on any device with internet access
- It connects directly to your Render backend (no Expo server needed)
- Works with your Supabase database

---

## 🔧 Render Backend Configuration

Your `render.yaml` has been updated with the correct settings. To deploy:

1. Push your code to GitHub
2. Connect your GitHub repo to Render
3. Render will automatically use `render.yaml` for configuration
4. Update the following environment variables in Render dashboard:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `AFROMESSAGE_API_KEY` | Your AfroMessage API key |
| `RESEND_API_KEY` | Your Resend API key |
| `GEMINI_API_KEY` | Your Google Gemini API key |

You can find these in:
- **Supabase**: Project Settings → API
- **AfroMessage**: Dashboard → API
- **Resend**: API Keys page
- **Gemini**: Google AI Studio

---

## 🚀 Alternative: EAS Build (No Local Setup)

If you don't want to install Android Studio locally, use EAS (Expo's cloud build service):

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (use your Expo account)
eas login

# Initialize EAS in your project
cd mobile_app
eas build:configure

# Build for Android (will be built on Expo's servers)
eas build -p android --profile development
```

This will:
- Build the APK on Expo's servers (no local Android SDK needed)
- Provide a download link for the APK
- Take ~5-15 minutes to complete

---

## 📞 Troubleshooting

### Error: "SDK location not found"

This error means Android SDK is not configured. Either:

**Option 1: Install Android Studio** (see sections above)

**Option 2: Use EAS Build (No installation needed)**
```bash
cd mobile_app
npm install -g eas-cli
eas login
cd mobile_app
eas build:configure
eas build -p android --profile development
```

### Error: "Unable to resolve module"
```bash
# Clear cache and reinstall
npx expo start --clear
```

### Error: "Could not connect to development server"
- The APK is built for production, so this is expected
- Make sure your backend URL is correct in `api.ts`

### Error: "Network request failed"
- Check your Render backend is running
- Verify CORS settings on backend
- Ensure your phone has internet connection

---

## 📁 Project Structure

```
mobile_app/
├── app/
│   ├── api.ts          # ✅ Configured for production
│   ├── dashboard.tsx   # Main dashboard
│   ├── login.tsx      # Login screen
│   └── index.tsx      # Entry point
├── assets/             # Images and icons
├── app.json           # ✅ Production config
├── package.json       # ✅ Build scripts added
└── android/           # Generated native project
```

---

## ✅ Next Steps

1. Run the build commands above
2. Transfer APK to your phone
3. Test login and data sync
4. Share with students/parents

Your mobile app will now work independently, connecting to:
- **Backend**: https://new-dreamland.onrender.com
- **Database**: Your Supabase project
