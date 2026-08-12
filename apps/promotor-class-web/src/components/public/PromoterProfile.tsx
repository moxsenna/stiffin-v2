'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { PublicWorkspaceProfile } from '@/modules/public-storefront/types';

interface PromoterProfileProps {
  profile: PublicWorkspaceProfile;
}

export function PromoterProfile({ profile }: PromoterProfileProps) {
  return (
    <section id="about" className="container" style={{ padding: '72px 0' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '50px',
          alignItems: 'center',
        }}
      >
        {/* Portrait Container with Generated WebP Image */}
        <div
          style={{
            maxWidth: '360px',
            width: '100%',
            aspectRatio: '4 / 5',
            borderRadius: '26px',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid var(--color-divider)',
            boxShadow: 'var(--shadow-md)',
            margin: '0 auto',
          }}
        >
          <img
            src="/images/promoter_profile_rina.webp"
            alt={profile.displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '18px',
              bottom: '18px',
              right: '18px',
              padding: '10px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--color-divider)',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: 750,
              color: '#191918',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {profile.displayName} · {profile.roleLabel}
          </div>
        </div>

        {/* Bio Copy */}
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 820,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              marginBottom: '14px',
            }}
          >
            Tentang pembuat
          </div>

          <h2
            style={{
              fontSize: '36px',
              letterSpacing: '-0.04em',
              marginBottom: '18px',
              fontWeight: 750,
              lineHeight: 1.15,
            }}
          >
            Saya membantu orang tua menerjemahkan hasil tes menjadi kebiasaan yang lebih manusiawi di rumah.
          </h2>

          <p
            style={{
              color: '#55544f',
              fontSize: '16px',
              lineHeight: 1.75,
              marginBottom: '24px',
            }}
          >
            {profile.bio}
          </p>

          {/* Neutral demonstrative facts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              paddingTop: '24px',
              borderTop: '1px solid var(--color-divider)',
            }}
          >
            <div>
              <strong style={{ fontSize: '18px', display: 'block', fontWeight: 800 }}>
                {profile.stats.programCount}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>ruang belajar aktif</span>
            </div>
            <div>
              <strong style={{ fontSize: '18px', display: 'block', fontWeight: 800 }}>
                STIFIn
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>metode pendampingan</span>
            </div>
            <div>
              <strong style={{ fontSize: '18px', display: 'block', fontWeight: 800 }}>
                {profile.stats.location}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>wilayah layanan</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
