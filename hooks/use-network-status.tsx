'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function useNetworkStatus() {
  const [status, setStatus] = useState<{
    isOnline: boolean;
    connectionQuality: 'good' | 'poor' | 'offline';
  }>({
    isOnline: true,
    connectionQuality: 'good',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateStatus = () => {
      const isOnline = navigator.onLine;
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      let quality: 'good' | 'poor' | 'offline' = 'good';
      if (!isOnline) {
        quality = 'offline';
      } else if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
        quality = 'poor';
      }

      setStatus({ isOnline, connectionQuality: quality });
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateStatus);
    }

    updateStatus();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}

export function NetworkStatusIndicator() {
  const { isOnline, connectionQuality } = useNetworkStatus();

  if (isOnline && connectionQuality === 'good') {
    return null;
  }

  const isOffline = !isOnline;
  const isPoor = connectionQuality === 'poor';

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg border text-sm flex items-center gap-2",
      isOffline
        ? "bg-red-50 border-red-200 text-red-700"
        : "bg-amber-50 border-amber-200 text-amber-700"
    )}>
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="font-medium">Offline</span>
          <span className="text-xs opacity-75">— Some features may be limited</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Poor connection</span>
          <span className="text-xs opacity-75">— Data may be delayed</span>
        </>
      )}
    </div>
  );
}
