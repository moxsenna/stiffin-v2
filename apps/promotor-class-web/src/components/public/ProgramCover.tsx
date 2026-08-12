'use client';

import React from 'react';

interface ProgramCoverProps {
  title: string;
  publicLabel: string;
  variant?: 'cover-a' | 'cover-b' | 'cover-c';
  aspectRatio?: string;
}

export function ProgramCover({
  title,
  publicLabel,
  variant = 'cover-a',
  aspectRatio = '16 / 10',
}: ProgramCoverProps) {
  const bgColors = {
    'cover-a': '#dce9de',
    'cover-b': '#ede3d1',
    'cover-c': '#e1e5ee',
  };

  const bubbleColors = {
    'cover-a': 'var(--color-primary)',
    'cover-b': '#a56d43',
    'cover-c': '#495e8c',
  };

  return (
    <div
      style={{
        aspectRatio,
        borderRadius: '18px',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '16px',
        border: '1px solid var(--color-divider)',
        backgroundColor: bgColors[variant] || bgColors['cover-a'],
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '20px',
          top: '20px',
          right: '20px',
          fontSize: '28px',
          lineHeight: 0.98,
          letterSpacing: '-0.045em',
          fontWeight: 850,
          color: '#191918',
          zIndex: 2,
        }}
      >
        <small
          style={{
            display: 'block',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '8px',
            color: '#4c5b50',
            fontWeight: 800,
          }}
        >
          {publicLabel}
        </small>
        {title}
      </div>

      <div
        style={{
          position: 'absolute',
          right: '-24px',
          bottom: '-36px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          backgroundColor: bubbleColors[variant] || bubbleColors['cover-a'],
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '80px',
          bottom: '24px',
          width: '78px',
          height: '78px',
          borderRadius: '50%',
          backgroundColor: '#f4c49e',
          opacity: 0.9,
        }}
      />
    </div>
  );
}
