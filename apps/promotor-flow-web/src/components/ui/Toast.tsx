'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="hv-toast-container"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
          pointerEvents: 'none',
          maxWidth: '90vw',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`hv-toast hv-toast-${t.type}`}
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              background: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#059669' : '#1e293b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'hvFadeInDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: 'auto',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
