# Dreamland College Mobile App

A cross-platform mobile application for Dreamland College Management System built with Expo (React Native).

## 🚀 Features

### Core Features
- **Secure Authentication** - JWT-based login with your existing backend
- **Push Notifications** - Real-time alerts for announcements, grades, payments
- **Offline-First** - Works offline with automatic sync when connected
- **Digital ID Card** - Student/faculty ID with QR code verification

### Student Features
- 📚 **My Courses** - View enrolled courses, credits, and grades
- 📝 **Assignments** - Submit assignments with camera/gallery upload
- 📅 **Exam Schedule** - View exam dates, times, rooms, and seat numbers
- 💳 **Digital ID** - Flip card design with QR code for verification
- 🏠 **Dashboard** - Quick stats, announcements, and pending items
- 👤 **Profile** - Account management and settings

### Special Features
- **Offline Mode** - Cache courses, assignments, exam schedules locally
- **Camera Integration** - Take photos for assignment submissions
- **Network Detection** - Auto-detect connectivity and sync when online
- **Secure Storage** - Tokens stored in Expo SecureStore

---

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **Expo CLI** (`npm install -g expo-cli`)
3. **EAS CLI** (`npm install -g eas-cli`)
4. **Expo Go** app on your phone (for testing)

---

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

### 2. Configure Environment

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your backend URL:

```env
# For local development (use your machine's IP)
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api

# For production
# EXPO_PUBLIC_API_URL=https://your-backend.com/api

EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

### 3. Find Your Machine's IP Address

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your network adapter.

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" under your network interface.

### 4. Update Backend CORS

Make sure your backend (`server.ts`) allows connections from the mobile app. Add your machine's IP to CORS origins if needed.

---

## 🏃 Running the App

### Development Mode

```bash
# Start Expo dev server
npm start

# Or run directly on platform
npm run android  # Android device/emulator
npm run ios      # iOS simulator (Mac only)
```

### Using Expo Go

1. Install **Expo Go** from:
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) (Android)
   - [App Store](https://apps.apple.com/app/expo-go/id982107779) (iOS)

2. Scan the QR code shown in terminal with Expo Go

3. App will load on your phone

---

## 📱 Building for Production

### Prerequisites

1. **EAS Account**: `eas login`
2. **Configure EAS**: The `eas.json` is already set up

### Build Android APK

```bash
# Build APK for internal distribution
npm run build:apk

# Or using EAS directly
eas build --platform android --profile apk
```

### Build Android App Bundle (Play Store)

```bash
npm run build:android
```

### Build iOS (Requires Apple Developer Account)

```bash
npm run build:ios
```

### Submit to Play Store

```bash
npm run submit:android
```

---

## 📁 Project Structure

```
mobile-app/
├── src/
│   ├── screens/          # App screens
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── CoursesScreen.tsx
│   │   ├── DigitalIDScreen.tsx
│   │   ├── AssignmentsScreen.tsx
│   │   ├── ExamScheduleScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── components/       # Reusable components
│   ├── services/         # API, notifications, cache
│   │   ├── api.ts
│   │   ├── notificationService.ts
│   │   └── offlineCache.ts
│   ├── context/          # React context
│   │   └── AuthContext.tsx
│   ├── hooks/            # Custom hooks
│   │   └── useNetworkStatus.ts
│   └── types/            # TypeScript types
│       └── index.ts
├── assets/               # Images, fonts, icons
├── app.json             # Expo configuration
├── eas.json             # EAS Build configuration
├── .env                 # Environment variables
└── App.tsx              # Main app entry
```

---

## 🔐 Authentication Flow

1. User enters username/password
2. App sends credentials to backend `/api/auth/login`
3. Backend returns JWT tokens (access + refresh)
4. Tokens stored in **Expo SecureStore** (encrypted)
5. All API requests include `Authorization: Bearer <token>`
6. Auto-refresh token when expired
7. Push notification token registered after login

---

## 📡 API Integration

The app connects to your existing backend. Required endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Login with username/password |
| `/auth/logout` | POST | Logout user |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/me` | GET | Get current user |
| `/students` | GET | Get students list |
| `/my-courses` | GET | Get enrolled courses |
| `/assignments` | GET | Get assignments |
| `/assignments/submit` | POST | Submit assignment |
| `/exam-schedule` | GET | Get exam schedule |
| `/announcements` | GET | Get announcements |

---

## 🔔 Push Notifications

### Setup

1. Get your Expo Project ID from [expo.dev](https://expo.dev)
2. Add it to `.env`:
   ```env
   EXPO_PUBLIC_PROJECT_ID=your-project-id
   ```

3. Configure backend to send notifications using Expo Push API

### Sending Notifications from Backend

```javascript
// Example: Send push notification
const message = {
  to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  title: 'New Announcement',
  body: 'Check out the latest updates!',
  data: { type: 'announcement', id: 123 },
};

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(message),
});
```

---

## 🛡️ Security

- **JWT Tokens** stored in Expo SecureStore (encrypted storage)
- **HTTPS** required for production
- **Certificate Pinning** recommended for production
- **Biometric Auth** can be added for extra security

---

## 🐛 Troubleshooting

### "Network request failed"
- Make sure backend is running
- Check IP address in `.env` matches your machine
- Ensure firewall allows connections on port 3000

### "Module not found"
- Run `npm install` again
- Clear cache: `expo start -c`

### App not loading on phone
- Both phone and computer must be on same WiFi
- Try tunnel mode: `expo start --tunnel`

---

## 📄 License

© 2026 Dreamland College. All rights reserved.

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Commit changes: `git commit -m 'Add new feature'`
3. Push to branch: `git push origin feature/new-feature`
4. Open Pull Request

---

## 📞 Support

For issues or questions, contact the development team.
