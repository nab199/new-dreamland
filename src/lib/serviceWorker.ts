/**
 * Service Worker Registration Utility
 * Handles registration, updates, and communication with the service worker
 */

export type ServiceWorkerConfig = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
};

/**
 * Register the service worker
 */
export function registerServiceWorker(config: ServiceWorkerConfig = {}): Promise<ServiceWorkerRegistration | null> {
  const { onSuccess, onUpdate, onError } = config;

  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return Promise.resolve(null);
  }

  return navigator.serviceWorker
    .register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    .then((registration) => {
      console.log('[SW] Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        console.log('[SW] New service worker installing...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New content available, please refresh');
            onUpdate?.(registration);
          }
        });
      });

      // Handle updates
      registration.addEventListener('update', () => {
        console.log('[SW] Service Worker updated');
      });

      // Success callback
      if (registration.active && !navigator.serviceWorker.controller) {
        console.log('[SW] Content is cached for offline use');
        onSuccess?.(registration);
      }

      return registration;
    })
    .catch((error) => {
      console.error('[SW] Service Worker registration failed:', error);
      onError?.(error);
      return null;
    });
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.log('[SW] Service Worker unregistered:', success);
    return success;
  } catch (error) {
    console.error('[SW] Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Send a message to the service worker
 */
export function sendMessageToSW(message: object): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('No service worker controller'));
      return;
    }

    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalCaches: number;
  totalItems: number;
  cacheNames: string[];
}> {
  if (!('caches' in window)) {
    return { totalCaches: 0, totalItems: 0, cacheNames: [] };
  }

  const cacheNames = await caches.keys();
  let totalItems = 0;

  await Promise.all(
    cacheNames.map(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      totalItems += keys.length;
    })
  );

  return {
    totalCaches: cacheNames.length,
    totalItems,
    cacheNames,
  };
}

/**
 * Pre-cache URLs for offline use
 */
export async function precacheUrls(urls: string[]): Promise<void> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'CACHE_URLS', urls });
    console.log('[SW] URLs queued for caching:', urls);
  } catch (error) {
    console.error('[SW] Failed to precache URLs:', error);
  }
}

/**
 * Check if a specific URL is cached
 */
export async function isUrlCached(url: string): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  const cacheNames = await caches.keys();
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const response = await cache.match(url);
    if (response) {
      return true;
    }
  }

  return false;
}

/**
 * Force service worker update check
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('[SW] Update check completed');
    return true;
  } catch (error) {
    console.error('[SW] Update check failed:', error);
    return false;
  }
}

/**
 * Listen for service worker messages
 */
export function onServiceWorkerMessage(callback: (data: any) => void): () => void {
  const handler = (event: MessageEvent) => {
    callback(event.data);
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  sendMessageToSW,
  clearAllCaches,
  getCacheStats,
  precacheUrls,
  isUrlCached,
  checkForUpdates,
  onServiceWorkerMessage,
};
