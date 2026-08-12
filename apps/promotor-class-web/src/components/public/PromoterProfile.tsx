'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { PublicWorkspaceProfile } from '@/modules/public-storefront/types';

interface PromoterProfileProps {
  profile: PublicWorkspaceProfile;
}

export function PromoterProfile({ profile }: PromoterProfileProps) {
  const waCleanPhone = profile.whatsappPhoneE164 ? profile.whatsappPhoneE164.replace(/[^0-9]/g, '') : '6281234567890';
  const waText = encodeURIComponent(`Halo ${profile.displayName}, saya ingin konsultasi mengenai program pendampingan STIFIn.`);
  const waUrl = `https://wa.me/${waCleanPhone}?text=${waText}`;

  return (
    <section id="about" className="container" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '40px',
          alignItems: 'center',
        }}
      >
        {/* Portrait Container with Generated WebP Image */}
        <div
          style={{
            maxWidth: '340px',
            width: '100%',
            aspectRatio: '4 / 5',
            borderRadius: '24px',
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
              left: '14px',
              bottom: '14px',
              right: '14px',
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
              marginBottom: '12px',
            }}
          >
            Tentang pembuat
          </div>

          <h2
            style={{
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              letterSpacing: '-0.04em',
              marginBottom: '16px',
              fontWeight: 750,
              lineHeight: 1.15,
            }}
          >
            {profile.headline || 'Saya membantu orang tua menerjemahkan hasil tes menjadi kebiasaan yang lebih manusiawi di rumah.'}
          </h2>

          <p
            style={{
              color: '#55544f',
              fontSize: '15px',
              lineHeight: 1.7,
              marginBottom: '20px',
            }}
          >
            {profile.bio}
          </p>

          <div style={{ marginBottom: '24px' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 20px',
                backgroundColor: '#25D366',
                color: '#FFF',
                borderRadius: '12px',
                fontWeight: 750,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span>💬</span> Hubungi {profile.displayName.split(' ')[0]} via WhatsApp
            </a>
          </div>

          {/* Neutral demonstrative facts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
              gap: '16px',
              paddingTop: '20px',
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
