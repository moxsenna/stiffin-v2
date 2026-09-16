'use client';

import React from 'react';
import { PwaAppHeader, PwaDock } from '@/components/pwa/pwa';

interface LearnerShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  workspaceSlug?: string;
}

/** Learner shell di atas sistem PWA: App Header + konten 480px + dock liquid-glass. */
export function LearnerShell({
  children,
  title = 'Program Saya',
  subtitle,
  showBack = false,
  backHref,
  workspaceSlug,
}: LearnerShellProps) {
  return (
    <div className="pwa-screen">
      <PwaAppHeader
        title={title}
        subtitle={subtitle ?? 'Learning Platform PWA'}
        showBack={showBack}
        backHref={backHref}
        showCart={false}
        workspaceSlug={workspaceSlug}
      />
      <main className="pwa-wrap pwa-screen-pad-dock" style={{ maxWidth: 480 }}>
        {children}
      </main>
      <PwaDock workspaceSlug={workspaceSlug} />
    </div>
  );
}
