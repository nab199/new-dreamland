# 🚀 Quick Start - Make Your App Installable & Connect to Backend

## ⚡ 3-Minute Setup

### Step 1: Run Setup Script (Windows)
```powershell
.\setup.ps1
```

This creates:
- `.env.local` file from example
- Required directories (`pwa-icons`, `screenshots`)

### Step 2: Configure Environment Variables

Edit `.env.local` and add your deployed service URLs:

```env
# Your Render Backend API
VITE_API_BASE_URL=https://your-backend.onrender.com

# Your Supabase Project
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- **Render URL**: Dashboard → Your Web Service → URL
- **Supabase URL/Key**: Project Settings → API

### Step 3: Generate PWA Icons

**Option A - Use Icon Generator (Recommended):**
1. Start dev server: `npm run dev`
2. Open: `http://localhost:3000/generate-pwa-icons.html`
3. Upload your logo (512x512px minimum)
4. Download ZIP and extract to `public/pwa-icons/`

**Option B - Quick Placeholder Icons:**
1. Open: `http://localhost:3000/generate-icons-simple.html`
2. Icons will auto-download
3. Move all downloaded files to `public/pwa-icons/`

### Step 4: Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Vercel (recommended)
npm install -g vercel
vercel --prod

# Or deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Step 5: Test Installation

1. Open your deployed URL in Chrome/Edge
2. Look for install icon in address bar (⬇️ or 📲)
3. Click "Install" or "Add to Home Screen"
4. App appears in your applications!

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] App loads without errors
- [ ] Install prompt appears (or icon in address bar)
- [ ] App installs successfully
- [ ] Installed app opens in standalone mode
- [ ] Offline mode works (DevTools → Offline)
- [ ] API calls connect to Render backend
- [ ] Supabase connection works

---

## 🔧 Troubleshooting

### Install Prompt Not Showing?

**Check:**
1. Site is served over HTTPS (or localhost)
2. `manifest.json` is accessible: `https://your-domain.com/manifest.json`
3. Icons exist at paths specified in manifest
4. Service worker is registered

**Test in DevTools:**
- Open DevTools → Application → Manifest
- Should show no errors

### API Calls Failing?

**Check CORS on Render backend:**
```typescript
// In server.ts
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

### Supabase Not Connecting?

**Verify:**
1. Environment variables are set correctly
2. No typos in URL or key
3. Supabase project is active
4. Check browser console for errors

---

## 📊 Build Output

Your production build includes:

```
dist/
├── index.html              # Main HTML
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── pwa-icons/              # App icons
└── assets/
    ├── vendor-react/       # React libraries
    ├── vendor-ui/          # UI components
    ├── vendor-charts/      # Charts library
    ├── vendor-utils/       # Utilities (axios, i18n)
    └── vendor-supabase/    # Supabase client
```

**Total Size:** ~1.5MB (500KB gzipped)

---

## 📱 Install on Different Devices

### Android (Chrome)
1. Open app in Chrome
2. Tap menu (⋮) → "Install app"
3. Or "Add to Home screen"
4. App appears on home screen

### iOS (Safari)
1. Open app in Safari
2. Tap Share button (📤)
3. Scroll down → "Add to Home Screen"
4. App appears on home screen

### Desktop (Chrome/Edge)
1. Open app
2. Look for install icon in address bar (⬇️)
3. Click "Install"
4. App appears in Start Menu/Applications

---

## 🎯 What You Get

✅ **Installable PWA** - Works like native app  
✅ **Offline Support** - Cached content available offline  
✅ **Auto-Updates** - Service worker updates automatically  
✅ **Push Notifications** - Ready to implement  
✅ **Cross-Platform** - Works on all devices  
✅ **No App Store** - Direct installation  

---

## 📖 Full Documentation

- **DEPLOYMENT_GUIDE.md** - Complete deployment instructions
- **OFFLINE_FUNCTIONALITY.md** - Offline features documentation
- **SYSTEM_SCAN_REPORT.md** - System analysis report

---

## 🆘 Need Help?

1. Check browser console for errors
2. Verify environment variables are set
3. Test backend API separately: `curl https://your-backend.onrender.com/api/public/branches`
4. Review DEPLOYMENT_GUIDE.md for detailed troubleshooting

---

**Ready to deploy?** Run these commands:

```bash
npm run build
vercel --prod
```

Then open your deployed URL and click the install prompt! 🎉
