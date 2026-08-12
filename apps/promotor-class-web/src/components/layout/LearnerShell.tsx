'use client';

import React from 'react';
import { LearnerTabBar } from './LearnerTabBar';
import { MobileAppHeader } from './MobileAppHeader';

interface LearnerShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  workspaceSlug?: string;
}

export function LearnerShell({
  children,
  title = 'Program Saya',
  subtitle,
  showBack = false,
  backHref,
  workspaceSlug,
}: LearnerShellProps) {
  return (
    <div className="page-wrapper-with-bottom-nav" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-canvas)' }}>
      {/* Mobile Top App Header */}
      <MobileAppHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        backHref={backHref}
        showProfile={true}
        workspaceSlug={workspaceSlug}
      />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {children}
      </main>

      {/* Mobile Sticky Tab Bar */}
      <LearnerTabBar workspaceSlug={workspaceSlug} />
    </div>
  );
}
