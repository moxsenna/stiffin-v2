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
    <section className="container" style={{ padding: '64px 0 28px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '54px',
          alignItems: 'center',
        }}
      >
        {/* Left Headline Column */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 820,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              marginBottom: '18px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
              }}
            />
            Ruang belajar {profile.displayName.split(' ')[0]}
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 60px)',
              lineHeight: 1.02,
              letterSpacing: '-0.04em',
              marginBottom: '22px',
              fontWeight: 800,
            }}
          >
            {profile.headline}
          </h1>

          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.7,
              color: '#4f4e4a',
              maxWidth: '650px',
              marginBottom: '28px',
            }}
          >
            Materi singkat untuk membantu orang tua mengenali cara belajar anak, mengurangi konflik sehari-hari, dan mendampingi dengan lebih tenang.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="#programs"
              style={{
                minHeight: '48px',
                borderRadius: '13px',
                padding: '0 22px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Lihat program
            </a>
            <a
              href="#about"
              style={{
                minHeight: '48px',
                borderRadius: '13px',
                padding: '0 22px',
                border: '1px solid var(--color-divider)',
                backgroundColor: '#FFFFFF',
                color: '#191918',
                fontWeight: 760,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Kenal {profile.displayName.split(' ')[0]}
            </a>
          </div>

          <div
            style={{
              marginTop: '24px',
              display: 'flex',
              gap: '18px',
              flexWrap: 'wrap',
              color: 'var(--color-text-muted)',
              fontSize: '13px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <i style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#aaa79f', display: 'inline-block' }} />
              Materi praktis
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <i style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#aaa79f', display: 'inline-block' }} />
              Bisa dipelajari kapan saja
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <i style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#aaa79f', display: 'inline-block' }} />
              Mulai dari program gratis
            </span>
          </div>
        </div>

        {/* Right Featured Art Card with Generated WebP Photo */}
        {featuredItem && (
          <Link
            href={`/p/${profile.workspaceSlug}/${featuredItem.program.programSlug}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                minHeight: '440px',
                position: 'relative',
                borderRadius: '30px',
                overflow: 'hidden',
                border: '1px solid #dbe5dd',
                boxShadow: 'var(--shadow-md)',
                padding: '34px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
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
                    'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 45%, rgba(0,0,0,0.85) 100%)',
                  zIndex: 1,
                }}
              />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 820,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    padding: '7px 14px',
                    borderRadius: '999px',
                    marginBottom: '18px',
                    color: 'var(--color-primary)',
                  }}
                >
                  Program Pilihan
                </span>

                <div
                  style={{
                    fontSize: '40px',
                    lineHeight: 0.98,
                    letterSpacing: '-0.045em',
                    fontWeight: 850,
                    color: '#FFFFFF',
                    marginBottom: '16px',
                    textShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  }}
                >
                  {featuredItem.program.title}
                </div>

                <p
                  style={{
                    fontSize: '14px',
                    color: '#e2ece5',
                    maxWidth: '320px',
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {featuredItem.presentation.shortOutcome}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  zIndex: 2,
                  position: 'relative',
                }}
              >
                <img
                  src="/images/promoter_profile_rina.webp"
                  alt={profile.displayName}
                  style={{
                    width: '36px',
                    height: '36px',
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
