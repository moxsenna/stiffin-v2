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
  publicLabel = '',
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
    'cover-a': '#dce9de',
    'cover-b': '#ede3d1',
    'cover-c': '#e1e5ee',
  };

  const activeImage = imageUrl || imageMap[variant] || imageMap['cover-a'];

  return (
    <div
      style={{
        aspectRatio,
        borderRadius: '0px',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '16px',
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
            'rgba(32,30,29,0.55)',
          zIndex: 1,
        }}
      />

     <div
        style={{
          position: 'absolute',
          left: '20px',
          top: '20px',
          right: '20px',
          fontSize: '26px',
          lineHeight: 1.05,
          letterSpacing: '-0.035em',
          fontWeight: 850,
          color: '#FFFFFF',
          zIndex: 2,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
       <small
          style={{
            display: 'block',
            fontSize: '11px',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            marginBottom: '8px',
            color: '#e2f0e6',
            fontWeight: 800,
          }}
        >
         {publicLabel}
        </small>
       {title}
      </div>
   </div>
 );
}
