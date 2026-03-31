# 🚀 Deployment Guide - Dreamland College Management System

Complete guide for deploying your PWA with Render backend and Supabase database.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [PWA Icons Generation](#pwa-icons-generation)
4. [Frontend Deployment](#frontend-deployment)
5. [Backend Connection](#backend-connection)
6. [Supabase Integration](#supabase-integration)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ **Render Account** - Backend API deployed at `https://your-api.onrender.com`
- ✅ **Supabase Project** - Database and auth configured
- ✅ **Domain** (optional) - For custom domain deployment
- ✅ **Node.js 18+** - For building the frontend

---

## Environment Setup

### Step 1: Create `.env.local` File

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

### Step 2: Configure Environment Variables

Edit `.env.local` with your actual values:

```env
# ==========================================
# Backend API (Render)
# ==========================================
VITE_API_BASE_URL=https://your-backend-api.onrender.com

# ==========================================
# Supabase
# ==========================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==========================================
# PWA Configuration
# ==========================================
VITE_APP_URL=https://your-domain.com
VITE_APP_NAME=Dreamland College
VITE_APP_SHORT_NAME=Dreamland

# ==========================================
# Feature Flags
# ==========================================
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_PUSH_NOTIFICATIONS=false
```

### Where to Find Your Keys

#### Render Backend URL
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your web service
3. Copy the URL (e.g., `https://dreamland-college-api.onrender.com`)

#### Supabase Credentials
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`

---

## PWA Icons Generation

### Option 1: Use the Icon Generator Tool

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the icon generator:
   ```
   http://localhost:3000/generate-pwa-icons.html
   ```

3. Upload your logo (min 512x512px, PNG recommended)

4. Click "Generate Icons"

5. Download the ZIP file

6. Extract to `public/pwa-icons/`

### Option 2: Manual Icon Creation

Create icons in these sizes and place in `public/pwa-icons/`:

```
public/pwa-icons/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
└── icon-512x512.png
```

**Recommended Tool:** [Figma](https://figma.com) or [Canva](https://canva.com)

**Icon Design Tips:**
- Use a square canvas (512x512 minimum)
- Leave 10% padding for maskable icons
- Use high contrast colors
- Test on both light and dark backgrounds

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Configure environment variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all variables from `.env.local`

### Option 2: Netlify

1. **Build:**
   ```bash
   npm run build
   ```

2. **Deploy via Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

3. **Or drag & drop** the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)

### Option 3: GitHub Pages

1. **Install gh-pages:**
   ```bash
   npm install -D gh-pages
   ```

2. **Add to package.json scripts:**
   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

### Option 4: Render Static Site

1. **Push to GitHub**

2. **Create new Static Site on Render:**
   - Connect your GitHub repository
   - Build Command: `npm run build`
   - Publish Directory: `dist`

3. **Add environment variables in Render dashboard**

---

## Backend Connection

### Configure CORS on Render Backend

Your Render backend must allow requests from your frontend domain.

In your `server.ts`, update CORS configuration:

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-domain.com',
    'https://your-app.vercel.app',
    'https://your-app.netlify.app'
  ],
  credentials: true
}));
```

### Test Backend Connection

```bash
# Test API endpoint
curl https://your-backend-api.onrender.com/api/public/branches

# Should return JSON with branches
```

### Update API Base URL

In `.env.local`:
```env
VITE_API_BASE_URL=https://your-backend-api.onrender.com
```

---

## Supabase Integration

### Step 1: Database Schema

Run the Supabase schema migration:

```sql
-- In Supabase SQL Editor
-- Copy contents from supabase_schema.sql
```

### Step 2: Configure Row Level Security (RLS)

Enable RLS on your tables:

```sql
-- Example for students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own student data
CREATE POLICY "Users can view own student data"
  ON students
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Step 3: Test Supabase Connection

Create a test file `test-supabase.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Supabase Test</title>
</head>
<body>
  <h1>Supabase Connection Test</h1>
  <div id="result"></div>
  
  <script type="module">
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
    
    const supabase = createClient(
      'YOUR_SUPABASE_URL',
      'YOUR_SUPABASE_ANON_KEY'
    );
    
    const test = async () => {
      try {
        const { data, error } = await supabase.from('branches').select('*');
        if (error) throw error;
        document.getElementById('result').innerHTML = 
          '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
      } catch (e) {
        document.getElementById('result').innerHTML = 
          '<p style="color:red">Error: ' + e.message + '</p>';
      }
    };
    
    test();
  </script>
</body>
</html>
```

---

## Testing & Verification

### PWA Installation Test

1. **Open your deployed app** in Chrome/Edge

2. **Check for install prompt:**
   - Look for install icon in address bar
   - Or press `Ctrl+Shift+I` → Application → Manifest

3. **Install the app:**
   - Click "Install" or "Add to Home Screen"
   - App should appear in your applications

4. **Test offline mode:**
   - Open DevTools → Application → Service Workers
   - Check "Offline"
   - Refresh page - should still work

### Connection Tests

```bash
# 1. Test frontend loads
curl https://your-domain.com

# 2. Test API connection
curl https://your-backend-api.onrender.com/api/public/branches

# 3. Test Supabase
# Use the test HTML file above
```

### Browser DevTools Checklist

- [ ] **Application Tab:**
  - Manifest loaded without errors
  - Service Worker registered and active
  - Cache storage populated

- [ ] **Console:**
  - No CORS errors
  - Supabase connected successfully
  - API calls succeeding

- [ ] **Network:**
  - All API calls returning 200 OK
  - No mixed content warnings

---

## Troubleshooting

### Issue: PWA Not Installable

**Check:**
1. Manifest.json is accessible at `/manifest.json`
2. Icons exist at specified paths
3. Service worker is registered
4. Site is served over HTTPS

**Fix:**
```bash
# Verify manifest is accessible
curl https://your-domain.com/manifest.json

# Should return valid JSON
```

### Issue: API Calls Failing (CORS)

**Error:** `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Fix:**
1. Update CORS on Render backend:
   ```typescript
   app.use(cors({
     origin: ['https://your-frontend-domain.com'],
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

2. Ensure backend receives proper headers

### Issue: Supabase Connection Failed

**Error:** `Invalid API key` or `Connection refused`

**Fix:**
1. Verify keys in `.env.local`
2. Check Supabase project is active
3. Ensure RLS policies allow access
4. Check browser console for detailed error

### Issue: Service Worker Not Registering

**Check:**
1. `sw.js` exists at `/sw.js`
2. No errors in browser console
3. Site is HTTPS (or localhost)

**Fix:**
```javascript
// In main.tsx, check registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered:', reg))
    .catch(err => console.error('SW registration failed:', err));
}
```

### Issue: Build Fails

**Common fixes:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build

# Check Node version (should be 18+)
node --version

# Update dependencies
npm update
```

---

## Production Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] PWA icons generated and in place
- [ ] Backend CORS configured for production domain
- [ ] Supabase RLS policies configured
- [ ] HTTPS enabled on all services
- [ ] Tested offline functionality
- [ ] Tested on multiple devices/browsers
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Analytics configured
- [ ] Backup strategy implemented

---

## Quick Start Commands

```bash
# 1. Setup
cp .env.local.example .env.local
# Edit .env.local with your values

# 2. Generate PWA icons
npm run dev
# Open http://localhost:3000/generate-pwa-icons.html

# 3. Build
npm run build

# 4. Deploy to Vercel
vercel --prod

# 5. Test
# Open your deployed URL
# Check for install prompt
# Test offline mode
```

---

## Support & Resources

- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vite PWA Plugin:** https://vite-pwa-org.netlify.app/
- **MDN PWA Guide:** https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps

---

**Need Help?** Check the console logs and network tab in browser DevTools for detailed error messages.
