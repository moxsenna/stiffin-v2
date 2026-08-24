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

export function TodayIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6.5" />
      <line x1="16" y1="3" x2="16" y2="6.5" />
      <rect x="7.5" y="12.5" width="4" height="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function KontakIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
      <path d="M15.5 5.8a3.2 3.2 0 0 1 0 5.9" />
      <path d="M17.5 14.9c1.9.7 3 2.2 3 4.6" />
    </svg>
  );
}

export function KalenderIcon({ size = 22, className }: NavIconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6.5" />
      <line x1="16" y1="3" x2="16" y2="6.5" />
      <line x1="7.5" y1="13" x2="10" y2="13" />
      <line x1="14" y1="13" x2="16.5" y2="13" />
      <line x1="7.5" y1="16.5" x2="10" y2="16.5" />
      <line x1="14" y1="16.5" x2="16.5" y2="16.5" />
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
