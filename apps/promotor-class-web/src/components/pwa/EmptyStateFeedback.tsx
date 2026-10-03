'use client';

import React from 'react';
import Link from 'next/link';

export interface EmptyStateCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  style,
}: EmptyStateCardProps) {
  return (
    <div
      className="pwa-card pwa-card-pad"
      style={{
        textAlign: 'center',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...style,
      }}
    >
      {icon ? (
        <div style={{ fontSize: 32, marginBottom: 4 }}>{icon}</div>
      ) : (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#EFF6FF',
            color: 'var(--pwa-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 4,
          }}
        >
          📂
        </div>
      )}
      <strong style={{ fontSize: 15, fontWeight: 800, color: 'var(--pwa-navy)' }}>{title}</strong>
      <p className="pwa-muted" style={{ fontSize: 13, margin: 0, maxWidth: 320, lineHeight: 1.45 }}>
        {description}
      </p>
      {actionLabel && (actionHref || onAction) && (
        <div style={{ marginTop: 8 }}>
          {actionHref ? (
            <Link href={actionHref} className="pwa-cta" style={{ textDecoration: 'none', padding: '8px 18px', fontSize: 13 }}>
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="pwa-cta"
              style={{ width: 'auto', padding: '8px 18px', fontSize: 13 }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface SkeletonCardProps {
  lines?: number;
  hasThumbnail?: boolean;
  style?: React.CSSProperties;
}

export function SkeletonCard({ lines = 2, hasThumbnail = false, style }: SkeletonCardProps) {
  return (
    <div
      className="pwa-card pwa-card-pad"
      style={{
        padding: '16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        ...style,
      }}
    >
      {hasThumbnail && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#E2E8F0',
            flexShrink: 0,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            width: '65%',
            height: 14,
            borderRadius: 4,
            background: '#E2E8F0',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            style={{
              width: idx === lines - 1 ? '40%' : '90%',
              height: 10,
              borderRadius: 4,
              background: '#F1F5F9',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    </div>
  );
}
