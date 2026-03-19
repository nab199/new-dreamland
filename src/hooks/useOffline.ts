import { useState, useEffect, useCallback } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  reconnected: boolean;
}

interface UseOfflineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

/**
 * Hook to detect and handle offline/online status
 */
export function useOffline(options: UseOfflineOptions = {}): OfflineStatus {
  const { onOnline, onOffline } = options;
  
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [reconnected, setReconnected] = useState<boolean>(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setReconnected(true);
    
    if (wasOffline) {
      setWasOffline(false);
      onOnline?.();
      
      // Reset reconnected flag after animation
      setTimeout(() => setReconnected(false), 3000);
    }
  }, [wasOffline, onOnline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    setReconnected(false);
    onOffline?.();
  }, [onOffline]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Check connection periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentlyOnline = navigator.onLine;
      if (currentlyOnline !== isOnline) {
        if (currentlyOnline) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, handleOnline, handleOffline]);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    reconnected,
  };
}

/**
 * Hook to queue actions for when back online
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<Array<{ action: () => Promise<void>; resolve: () => void; reject: (err: Error) => void }>>([]);
  const { isOnline } = useOffline();

  const addToQueue = useCallback((action: () => Promise<void>): Promise<void> => {
    return new Promise((resolve, reject) => {
      setQueue((prev) => [...prev, { action, resolve, reject }]);
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;

    const currentQueue = [...queue];
    setQueue([]);

    for (const item of currentQueue) {
      try {
        await item.action();
        item.resolve();
      } catch (error) {
        item.reject(error as Error);
      }
    }
  }, [isOnline, queue]);

  // Process queue when back online
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  return {
    addToQueue,
    queueLength: queue.length,
    isProcessing: isOnline && queue.length > 0,
  };
}

export default useOffline;
