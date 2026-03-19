import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { registerServiceWorker } from './lib/serviceWorker';

// Register service worker for offline functionality
if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: (registration) => {
      console.log('✅ Service Worker registered successfully. App is available offline.');
    },
    onUpdate: (registration) => {
      console.log('🔄 New version available. Refresh to update.');
      // Optionally show update notification to user
      if (window.confirm('A new version is available! Would you like to refresh?')) {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
      }
    },
    onError: (error) => {
      console.error('❌ Service Worker registration failed:', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
