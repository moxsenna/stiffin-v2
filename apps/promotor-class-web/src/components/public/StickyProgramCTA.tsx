'use client';

import React from 'react';

interface StickyProgramCTAProps {
  label?: string;
  targetId?: string;
  onClick?: () =>void;
}

export function StickyProgramCTA({
  label = 'Mulai belajar gratis',
  targetId = 'register',
  onClick,
}: StickyProgramCTAProps) {
  const handleClick = () =>{
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
      className="mobile-only-cta"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        padding: '10px 14px calc(10px + env(safe-area-inset-bottom))',
        backgroundColor: 'rgba(247, 247, 245, 0.96)',
        borderTop: '1px solid var(--color-divider)',
      }}
    >
     <button
        onClick={handleClick}
        className="touch-target-primary"
        style={{
          width: '100%',
          minHeight: '50px',
          borderRadius: '0px',
          backgroundColor: 'var(--accent-dark)',
          color: '#FFFFFF',
          fontWeight: 780,
          fontSize: '15px',
          border: 0,
          cursor: 'pointer',
        }}
      >
       {label}
      </button>
   </div>
 );
}
