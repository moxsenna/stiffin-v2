'use client';

import React, { useState, useEffect } from 'react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      style={{
        width: '100%',
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: 600,
        textAlign: 'center',
        background: isOffline ? '#ef4444' : '#10b981',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        zIndex: 50,
        transition: 'background 0.3s ease',
      }}
    >
      <span>{isOffline ? '⚡ Anda sedang offline. Fitur PWA tetap dapat diakses.' : '✓ Koneksi internet kembali normal.'}</span>
    </div>
  );
};
