import React, { useEffect, useState } from 'react';
import { useOffline } from '../hooks/useOffline';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineIndicatorProps {
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right';
}

/**
 * Offline indicator component that shows connection status
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showDetails = false,
  position = 'top',
}) => {
  const { isOnline, isOffline, reconnected } = useOffline({
    onOnline: () => {
      console.log('🟢 Back online!');
    },
    onOffline: () => {
      console.log('🔴 Gone offline!');
    },
  });

  const [cachedCount, setCachedCount] = useState<number>(0);

  useEffect(() => {
    // Get cached resources count
    if ('caches' in window) {
      caches.keys()
        .then((names) => Promise.all(names.map((name) => caches.open(name))))
        .then((cacheInstances) => Promise.all(cacheInstances.map((cache) => cache.keys())))
        .then((keysArrays) => {
          const total = keysArrays.reduce((sum, keys) => sum + keys.length, 0);
          setCachedCount(total);
        })
        .catch(() => setCachedCount(0));
    }
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-0 left-0 right-0 rounded-none';
      case 'bottom':
        return 'bottom-0 left-0 right-0 rounded-none';
      case 'top-right':
        return 'top-4 right-4 rounded-full';
      case 'bottom-right':
        return 'bottom-4 right-4 rounded-full';
      default:
        return 'top-0 left-0 right-0 rounded-none';
    }
  };

  if (isOnline && !reconnected && !showDetails) {
    return null;
  }

  return (
    <AnimatePresence>
      {(isOffline || reconnected || showDetails) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed z-[9999] ${getPositionClasses()} ${
            isOffline
              ? 'bg-amber-500'
              : reconnected
              ? 'bg-emerald-500'
              : 'bg-stone-800'
          } text-white shadow-lg`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isOffline ? (
                  <WifiOff className="w-5 h-5" />
                ) : reconnected ? (
                  <Wifi className="w-5 h-5" />
                ) : (
                  <Database className="w-5 h-5" />
                )}
                
                <div>
                  <p className="font-semibold text-sm">
                    {isOffline
                      ? "You're Offline"
                      : reconnected
                      ? "Back Online!"
                      : 'Offline Mode Available'}
                  </p>
                  {isOffline && (
                    <p className="text-xs text-amber-100">
                      Some features may be limited. Changes will sync when reconnected.
                    </p>
                  )}
                  {reconnected && (
                    <p className="text-xs text-emerald-100">
                      Syncing your data...
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {showDetails && (
                  <div className="hidden sm:flex items-center gap-2 text-xs bg-white/20 px-3 py-1.5 rounded-full">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>{cachedCount} cached items</span>
                  </div>
                )}
                
                {isOffline && (
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg text-sm font-bold hover:bg-amber-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Offline banner for forms and actions
 */
export const OfflineBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm ${className}`}
    >
      <CloudOff className="w-4 h-4 flex-shrink-0" />
      <span>You're offline. Changes will be saved locally and synced when reconnected.</span>
    </motion.div>
  );
};

/**
 * Button wrapper that handles offline state
 */
export const OfflineButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  requiresOnline?: boolean;
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, requiresOnline = false, className = '', disabled = false }) => {
  const { isOffline } = useOffline();

  const isDisabled = disabled || (requiresOnline && isOffline);

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isDisabled ? 'This action requires an internet connection' : undefined}
    >
      {children}
      {isDisabled && requiresOnline && (
        <span className="ml-2 text-xs">(Offline)</span>
      )}
    </button>
  );
};

export default OfflineIndicator;
