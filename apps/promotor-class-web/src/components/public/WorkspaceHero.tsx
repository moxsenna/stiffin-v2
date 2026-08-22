'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import Link from 'next/link';
import { PublicWorkspaceProfile, PublicProgramCatalogItem } from '@/modules/public-storefront/types';

interface WorkspaceHeroProps {
  profile: PublicWorkspaceProfile;
  featuredItem?: PublicProgramCatalogItem;
}

export function WorkspaceHero({ profile, featuredItem }: WorkspaceHeroProps) {
  return (
    <section className="container" style={{ paddingTop: '40px', paddingBottom: '36px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '36px',
          alignItems: 'center',
        }}
      >
        {/* Left Headline Column */}
        <div>
          <h1
            style={{
              fontSize: 'clamp(32px, 4.2vw, 52px)',
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              marginBottom: '18px',
              fontWeight: 850,
              color: 'var(--color-text-main)',
            }}
          >
            {profile.headline}
          </h1>

          <p
            style={{
              fontSize: '16px',
              lineHeight: 1.65,
              color: 'var(--color-text-body)',
              maxWidth: '600px',
              marginBottom: '28px',
            }}
          >
            Materi singkat dan terstruktur untuk membantu orang tua mengenali potensi genetik anak, mengurangi konflik komunikasi di rumah, dan mendampingi tumbuh kembang dengan tenang.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <a
              href="#programs"
              className="touch-target-primary"
              style={{
                borderRadius: 'var(--border-radius-md)',
                padding: '0 22px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '14.5px',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Lihat Program Edukasi
            </a>
            <a
              href="#about"
              className="touch-target-primary"
              style={{
                borderRadius: 'var(--border-radius-md)',
                padding: '0 20px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-main)',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              Profil {profile.displayName.split(' ')[0]}
            </a>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '18px',
              flexWrap: 'wrap',
              color: 'var(--color-text-muted)',
              fontSize: '12.5px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Materi praktis & aplikatif
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Akses fleksibel kapan saja
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Tersedia modul gratis
            </span>
          </div>
        </div>

        {/* Right Featured Art Card */}
        {featuredItem && (
          <Link
            href={`/p/${profile.workspaceSlug}/${featuredItem.program.programSlug}`}
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <div
              style={{
                minHeight: '360px',
                position: 'relative',
                borderRadius: 'var(--border-radius-xl)',
                overflow: 'hidden',
                border: '1px solid var(--color-divider)',
                boxShadow: 'var(--shadow-md)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <img
                src="/images/program_cover_7hari.webp"
                alt={featuredItem.program.title}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(15,20,17,0.72) 0%, rgba(15,20,17,0.3) 45%, rgba(15,20,17,0.88) 100%)',
                  zIndex: 1,
                }}
              />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 780,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    padding: '5px 12px',
                    borderRadius: 'var(--border-radius-full)',
                    marginBottom: '14px',
                    color: 'var(--color-primary)',
                  }}
                >
                  Program Pilihan
                </span>

                <div
                  style={{
                    fontSize: '28px',
                    lineHeight: 1.1,
                    letterSpacing: '-0.03em',
                    fontWeight: 850,
                    color: '#FFFFFF',
                    marginBottom: '10px',
                    textShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  }}
                >
                  {featuredItem.program.title}
                </div>

                <p
                  style={{
                    fontSize: '13.5px',
                    color: '#E6EFE9',
                    maxWidth: '320px',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {featuredItem.presentation.shortOutcome}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  zIndex: 2,
                  position: 'relative',
                  paddingTop: '20px',
                }}
              >
                <img
                  src={profile.avatarUrl || "/images/promoter_profile_rina.webp"}
                  alt={profile.displayName}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #FFFFFF',
                  }}
                />
                <span>oleh {profile.displayName}</span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
