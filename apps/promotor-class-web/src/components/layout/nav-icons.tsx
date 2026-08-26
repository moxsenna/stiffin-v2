import React from 'react';

export interface NavIconProps {
  size?: number;
  className?: string;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function BerandaIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" />
    </svg>
  );
}

export function ProgramIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v13H5.5A1.5 1.5 0 0 0 4 18.5z" />
      <path d="M4 18.5A1.5 1.5 0 0 0 5.5 20H19" />
      <line x1="8.5" y1="8.5" x2="14.5" y2="8.5" />
    </svg>
  );
}

export function LearnerIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14z" />
      <path d="M6.5 11.5v4.2c0 1.2 2.5 2.3 5.5 2.3s5.5-1.1 5.5-2.3v-4.2" />
      <path d="M21.5 9.5v5" />
    </svg>
  );
}

export function LainnyaIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function KatalogIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" />
      <rect x="4" y="13" width="7" height="7" />
      <rect x="13" y="13" width="7" height="7" />
    </svg>
  );
}

export function BelajarIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 6.5c-1.8-1.6-4.4-2-7-2v13c2.6 0 5.2.4 7 2 1.8-1.6 4.4-2 7-2v-13c-2.6 0-5.2.4-7 2z" />
      <line x1="12" y1="6.5" x2="12" y2="19.5" />
    </svg>
  );
}

export function ProfilIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
