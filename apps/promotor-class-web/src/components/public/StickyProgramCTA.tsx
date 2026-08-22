'use client';

import React from 'react';

interface StickyProgramCTAProps {
  label?: string;
  targetId?: string;
  onClick?: () => void;
}

export function StickyProgramCTA({
  label = 'Mulai Belajar Sekarang',
  targetId = 'register',
  onClick,
}: StickyProgramCTAProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      aria-label="Aksi cepat pendaftaran"
      className="mobile-only"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-divider)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.06)',
      }}
    >
      <button
        onClick={handleClick}
        className="touch-target-primary"
        style={{
          width: '100%',
          minHeight: '48px',
          borderRadius: 'var(--border-radius-md)',
          backgroundColor: 'var(--color-primary)',
          color: '#FFFFFF',
          fontWeight: 780,
          fontSize: '14.5px',
          border: 0,
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {label}
      </button>
    </div>
  );
}
