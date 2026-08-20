'use client';

import React from 'react';
import { BottomNav } from './BottomNav';

export interface AppShellProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, showBottomNav = true }) => {
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('promotor_session_token');
      if (!existingToken) {
        localStorage.setItem('promotor_session_token', 'staging-promotor-session-token-demo');
      }
    }
  }, []);
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F7F7F5',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          minHeight: '100vh',
          backgroundColor: '#F7F7F5',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 0 20px rgba(0,0,0,0.03)',
        }}
      >
        <main
          style={{
            flex: 1,
            paddingBottom: showBottomNav ? '70px' : '20px',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
};
