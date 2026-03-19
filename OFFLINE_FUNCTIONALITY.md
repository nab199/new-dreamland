# Offline Functionality Documentation

## Overview

Dreamland College Management System now includes comprehensive offline support, allowing users to access cached content and queue actions when internet connectivity is unavailable.

## Features Implemented

### 1. Service Worker (`/public/sw.js`)

The service worker implements a **network-first, cache-fallback** strategy:

- **Static Assets**: Cache-first strategy for CSS, JS, images, and fonts
- **API Requests**: Network-first with cache fallback for GET requests
- **HTML Pages**: Network-first with offline page fallback
- **Background Sync**: Queued actions sync when back online

#### Caching Strategies

| Resource Type | Strategy | Cache Name |
|--------------|----------|------------|
| Static Assets | Cache First | `dreamland-static-v1` |
| API Requests | Network First | `dreamland-dynamic-v1` |
| HTML Pages | Network First | `dreamland-dynamic-v1` |

### 2. PWA Manifest (`/public/manifest.json`)

Enables installability as a Progressive Web App with:
- App name and short name
- Theme colors
- Icons for home screen
- Shortcut links to Dashboard and Login

### 3. Offline Detection (`src/hooks/useOffline.ts`)

React hooks for connection status:

```typescript
// Basic usage
const { isOnline, isOffline, wasOffline, reconnected } = useOffline();

// With callbacks
useOffline({
  onOnline: () => console.log('Back online!'),
  onOffline: () => console.log('Gone offline!')
});

// Queue actions for later sync
const { addToQueue, queueLength } = useOfflineQueue();
```

### 4. Offline Indicator Components (`src/components/OfflineIndicator.tsx`)

#### OfflineIndicator
Shows connection status banner at top of app:
- Amber banner when offline
- Green banner when reconnected
- Auto-dismisses when connection restored

#### OfflineBanner
Inline banner for forms:
```tsx
<OfflineBanner />
```

#### OfflineButton
Button wrapper that disables online-required actions:
```tsx
<OfflineButton requiresOnline={true} onClick={handleSubmit}>
  Submit Form
</OfflineButton>
```

### 5. Offline Storage (`src/lib/offlineStorage.ts`)

IndexedDB-based storage for offline data:

```typescript
// Store data
await storeOfflineData('student', studentData);

// Get data
const students = await getOfflineData('student');

// Queue action for sync
await addPendingAction('create', '/api/students', 'POST', data);

// Get stats
const stats = await getStorageStats();
```

### 6. Service Worker Utilities (`src/lib/serviceWorker.ts`)

```typescript
// Register service worker
registerServiceWorker({
  onSuccess: (reg) => console.log('SW registered'),
  onUpdate: (reg) => console.log('Update available')
});

// Cache management
await clearAllCaches();
const stats = await getCacheStats();
await precacheUrls(['/dashboard', '/students']);

// Check if URL is cached
const isCached = await isUrlCached('/api/students');
```

## Files Added/Modified

### New Files
- `/public/manifest.json` - PWA manifest
- `/public/sw.js` - Service worker
- `/public/offline.html` - Offline fallback page
- `/src/hooks/useOffline.ts` - Offline detection hooks
- `/src/components/OfflineIndicator.tsx` - UI components
- `/src/lib/serviceWorker.ts` - SW utilities
- `/src/lib/offlineStorage.ts` - IndexedDB storage

### Modified Files
- `/index.html` - Added manifest link and PWA meta tags
- `/src/main.tsx` - Service worker registration
- `/src/App.tsx` - Added OfflineIndicator component

## How It Works

### Installation Flow

1. User visits the app in production mode
2. Service worker automatically registers
3. Static assets are cached immediately
4. App is available for offline use

### Offline Detection

1. App listens to `online`/`offline` browser events
2. Connection checked every 30 seconds
3. UI updates automatically when status changes

### Data Sync Flow

1. User performs action while offline
2. Action is queued in IndexedDB
3. When back online, queued actions sync automatically
4. Failed syncs retry with exponential backoff

## Usage Examples

### Check Connection Status

```tsx
import { useOffline } from './hooks/useOffline';

function MyComponent() {
  const { isOnline, isOffline } = useOffline();
  
  return (
    <div>
      {isOffline && <p>You're offline. Some features limited.</p>}
    </div>
  );
}
```

### Queue Form Submission

```tsx
import { useOfflineQueue } from './hooks/useOffline';
import { addPendingAction } from './lib/offlineStorage';

function RegistrationForm() {
  const { addToQueue } = useOfflineQueue();
  
  const handleSubmit = async (data) => {
    if (!navigator.onLine) {
      // Queue for later
      await addPendingAction('register', '/api/students', 'POST', data);
      alert('Saved locally. Will sync when online.');
    } else {
      // Submit now
      await api.post('/api/students', data);
    }
  };
}
```

### Pre-cache Important Pages

```tsx
import { precacheUrls } from './lib/serviceWorker';

// In dashboard or settings
await precacheUrls([
  '/dashboard',
  '/api/students',
  '/api/branches',
  '/api/programs'
]);
```

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome/Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full (iOS 11.3+) |
| Opera | ✅ Full |

## Testing Offline Mode

### Chrome DevTools

1. Open DevTools (F12)
2. Go to Application tab
3. Service Workers → Check "Offline"
4. Refresh page to test offline functionality

### Testing Scenarios

1. **Initial Load Online**: Verify SW registers and caches
2. **Go Offline**: Verify offline banner appears
3. **Navigate Pages**: Verify cached pages load
4. **Submit Forms**: Verify actions queue
5. **Go Back Online**: Verify sync occurs

## Troubleshooting

### Service Worker Not Registering

- Ensure app is served over HTTPS (or localhost)
- Check browser console for errors
- Verify `/sw.js` is accessible

### Cache Not Updating

- Service worker updates on page reload
- Force update: `registration.update()`
- Clear cache in DevTools Application tab

### Offline Storage Issues

- Check IndexedDB in DevTools Application tab
- Verify browser supports IndexedDB
- Check storage quota not exceeded

## Security Considerations

- Sensitive data encrypted before storage
- Offline data cleared on logout
- Token expiry checked before cached API use
- CORS headers respected for cached responses

## Performance Impact

- **Initial Load**: +50-100KB (service worker)
- **Cached Size**: ~2-5MB (depends on usage)
- **Offline Pages**: Instant load from cache
- **API Calls**: No delay (network first)

## Future Enhancements

- [ ] Background sync API for automatic form submission
- [ ] Push notifications for announcements
- [ ] Selective cache clearing per module
- [ ] Compression for large cached responses
- [ ] Cache versioning and migration

## API Reference

### useOffline Hook

```typescript
useOffline(options?: {
  onOnline?: () => void;
  onOffline?: () => void;
}): {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  reconnected: boolean;
}
```

### useOfflineQueue Hook

```typescript
useOfflineQueue(): {
  addToQueue: (action: () => Promise<void>) => Promise<void>;
  queueLength: number;
  isProcessing: boolean;
}
```

### Offline Storage Functions

```typescript
// Data operations
storeOfflineData(type, data, key?): Promise<number>
getOfflineData(type): Promise<OfflineData[]>
getAllOfflineData(): Promise<OfflineData[]>
deleteOfflineData(key): Promise<void>
clearOfflineData(): Promise<void>

// Action queue
addPendingAction(action, endpoint, method, payload): Promise<number>
getPendingActions(): Promise<PendingAction[]>
getUnsyncedActions(): Promise<PendingAction[]>
markActionAsSynced(id): Promise<void>
deletePendingAction(id): Promise<void>
clearPendingActions(): Promise<void>

// Utilities
getStorageStats(): Promise<StorageStats>
```

### Service Worker Functions

```typescript
registerServiceWorker(config): Promise<Registration | null>
unregisterServiceWorker(): Promise<boolean>
clearAllCaches(): Promise<void>
getCacheStats(): Promise<CacheStats>
precacheUrls(urls): Promise<void>
isUrlCached(url): Promise<boolean>
checkForUpdates(): Promise<boolean>
```

## Support

For issues or questions about offline functionality:
1. Check browser console for errors
2. Verify service worker status in DevTools
3. Clear cache and reload if needed
4. Contact technical support with error details
