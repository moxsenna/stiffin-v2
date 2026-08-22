'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';

interface ProgramCoverProps {
  title: string;
  publicLabel?: string | null;
  variant?: 'cover-a' | 'cover-b' | 'cover-c';
  imageUrl?: string | null;
  aspectRatio?: string;
}

export function ProgramCover({
  title,
  variant = 'cover-a',
  imageUrl,
  aspectRatio = '16 / 10',
}: ProgramCoverProps) {
  const imageMap = {
    'cover-a': '/images/program_cover_7hari.webp',
    'cover-b': '/images/program_cover_30hari.webp',
    'cover-c': '/images/program_cover_parenting.webp',
  };

  const bgColors = {
    'cover-a': '#286344',
    'cover-b': '#8A622A',
    'cover-c': '#2C446E',
  };

  const activeImage = imageUrl || imageMap[variant] || imageMap['cover-a'];

  return (
    <div
      style={{
        aspectRatio,
        borderRadius: 'var(--border-radius-md)',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '14px',
        border: '1px solid var(--color-divider)',
        backgroundColor: bgColors[variant] || bgColors['cover-a'],
      }}
    >
      {/* Background Cover Image */}
      {activeImage && (
        <img
          src={activeImage}
          alt={title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      )}

      {/* Gradient Overlay for Text Readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,20,17,0.7) 0%, rgba(15,20,17,0.2) 40%, rgba(15,20,17,0.85) 100%)',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: '18px',
          bottom: '16px',
          right: '18px',
          fontSize: '20px',
          lineHeight: 1.15,
          letterSpacing: '-0.025em',
          fontWeight: 850,
          color: '#FFFFFF',
          zIndex: 2,
          textShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}
      >
        {title}
      </div>
    </div>
  );
}
