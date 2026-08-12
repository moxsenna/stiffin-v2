'use client';

import React from 'react';
import Link from 'next/link';
import { LearnerTabBar } from './LearnerTabBar';

interface LearnerShellProps {
  children: React.ReactNode;
}

export function LearnerShell({ children }: LearnerShellProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-canvas)' }}>
      {/* Learner Top Header */}
      <header
        style={{
          height: '56px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 70,
        }}
      >
        <Link href="/learn" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
          PromotorClass
        </Link>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Mode Belajar
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          paddingBottom: '70px', // Clearance for learner bottom tab bar
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {children}
      </main>

      {/* Mobile Sticky Tab Bar */}
      <LearnerTabBar />
    </div>
  );
}
