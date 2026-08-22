'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { PublicWorkspaceProfile } from '@/modules/public-storefront/types';

interface PromoterProfileProps {
  profile: PublicWorkspaceProfile;
}

export function PromoterProfile({ profile }: PromoterProfileProps) {
  const waCleanPhone = profile.whatsappPhoneE164 ? profile.whatsappPhoneE164.replace(/[^0-9]/g, '') : null;
  const waText = encodeURIComponent(`Halo ${profile.displayName}, saya ingin konsultasi mengenai program pendampingan STIFIn.`);
  const waUrl = waCleanPhone ? `https://wa.me/${waCleanPhone}?text=${waText}` : null;

  return (
    <section id="about" className="container" style={{ paddingTop: '54px', paddingBottom: '54px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
          alignItems: 'center',
        }}
      >
        {/* Portrait Container with Crisp Avatar Card */}
        <div
          style={{
            maxWidth: '320px',
            width: '100%',
            aspectRatio: '4 / 5',
            borderRadius: 'var(--border-radius-xl)',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid var(--color-divider)',
            boxShadow: 'var(--shadow-md)',
            margin: '0 auto',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <img
            src={profile.avatarUrl || "/images/promoter_profile_rina.webp"}
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
              left: '12px',
              bottom: '12px',
              right: '12px',
              padding: '10px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '13px',
              fontWeight: 780,
              color: 'var(--color-text-main)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {profile.displayName} · {profile.roleLabel}
          </div>
        </div>

        {/* Bio Copy */}
        <div>
          <h2
            style={{
              fontSize: 'clamp(24px, 3.2vw, 34px)',
              letterSpacing: '-0.03em',
              marginBottom: '16px',
              fontWeight: 850,
              lineHeight: 1.2,
              color: 'var(--color-text-main)',
            }}
          >
            {profile.headline || 'Membantu orang tua menerjemahkan hasil tes menjadi kebiasaan mendampingi yang lebih tenang di rumah.'}
          </h2>

          <p
            style={{
              color: 'var(--color-text-body)',
              fontSize: '15px',
              lineHeight: 1.7,
              marginBottom: '24px',
            }}
          >
            {profile.bio}
          </p>

          {waUrl && (
            <div style={{ marginBottom: '28px' }}>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 22px',
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  borderRadius: 'var(--border-radius-md)',
                  fontWeight: 780,
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.056-1.528-.276-1.157-.428-2.023-1.428-2.614-2.228-.06-.081-.462-.614-.462-1.17 0-.555.289-.828.391-.938.102-.11.222-.138.297-.138.074 0 .148.002.212.006.069.004.16.027.247.234.089.213.308.751.336.806.028.055.046.12.009.193-.036.073-.056.12-.11.184-.056.064-.117.142-.167.193-.056.055-.114.116-.049.227.065.111.288.475.617.768.424.377.781.493.892.548.111.055.176.046.241-.028.065-.074.278-.324.352-.435.074-.111.148-.093.247-.056.1.037.63.297.738.351.108.055.18.083.207.129.028.046.028.67-.116 1.075z" />
                </svg>
                Konsultasi WhatsApp
              </a>
            </div>
          )}

          {/* Factual Statistics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '16px',
              paddingTop: '20px',
              borderTop: '1px solid var(--color-divider)',
            }}
          >
            <div>
              <strong style={{ fontSize: '20px', display: 'block', fontWeight: 850, color: 'var(--color-text-main)' }} className="tabular-nums">
                {profile.stats.programCount}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>ruang belajar aktif</span>
            </div>
            <div>
              <strong style={{ fontSize: '20px', display: 'block', fontWeight: 850, color: 'var(--color-text-main)' }}>
                STIFIn
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>metode pendampingan</span>
            </div>
            <div>
              <strong style={{ fontSize: '20px', display: 'block', fontWeight: 850, color: 'var(--color-text-main)' }}>
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
