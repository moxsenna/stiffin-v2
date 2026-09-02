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
  const isCentered = profile.theme?.heroAlignment === 'CENTER';

  return (
    <section className="container" style={{ paddingTop: '48px', paddingBottom: '36px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCentered ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
          alignItems: 'center',
          textAlign: isCentered ? 'center' : 'left',
        }}
      >
        {/* Headline Column */}
        <div style={isCentered ? { maxWidth: '780px', margin: '0 auto' } : {}}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: isCentered ? 'center' : 'flex-start',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--brand-accent, var(--accent-dark))',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: 'var(--brand-radius-sm, 0px)',
                backgroundColor: 'var(--brand-accent, var(--accent-dark))',
              }}
            />
            {profile.theme?.brandName || `Ruang belajar ${profile.displayName.split(' ')[0]}`}
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
              marginBottom: '18px',
              fontWeight: 800,
              color: 'var(--brand-text, #111827)',
            }}
          >
            {profile.headline || profile.tagline || 'Ruang Belajar & Pendampingan Karakter'}
          </h1>

          <p
            style={{
              fontSize: '16px',
              lineHeight: 1.65,
              color: 'var(--brand-muted, #4f4e4a)',
              maxWidth: isCentered ? '700px' : '650px',
              margin: isCentered ? '0 auto 24px auto' : '0 0 24px 0',
            }}
          >
            {profile.bio || 'Materi singkat untuk membantu Anda mengenali potensi genetik, mengurangi hambatan komunikasi, dan bertumbuh dengan pendekatan yang terarah.'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: isCentered ? 'center' : 'flex-start',
            }}
          >
            <a
              href="#programs"
              style={{
                minHeight: '46px',
                borderRadius: 'var(--brand-radius, 0px)',
                padding: '0 22px',
                backgroundColor: 'var(--brand-primary, #201e1d)',
                color: 'var(--brand-primary-fg, #FFFFFF)',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.15s ease',
              }}
            >
              Lihat program
            </a>
            <a
              href="#about"
              style={{
                minHeight: '46px',
                borderRadius: 'var(--brand-radius, 0px)',
                padding: '0 22px',
                border: '1px solid var(--color-divider, #e5e7eb)',
                backgroundColor: 'var(--brand-surface, #FFFFFF)',
                color: 'var(--brand-text, #191918)',
                fontWeight: 650,
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
              marginTop: '22px',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              justifyContent: isCentered ? 'center' : 'flex-start',
              color: 'var(--brand-muted, #5a5954)',
              fontSize: '12px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: 'var(--brand-radius-sm, 0px)',
                  backgroundColor: 'var(--brand-muted, #aaa79f)',
                  display: 'inline-block',
                }}
              />
              Materi praktis
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: 'var(--brand-radius-sm, 0px)',
                  backgroundColor: 'var(--brand-muted, #aaa79f)',
                  display: 'inline-block',
                }}
              />
              Bisa dipelajari kapan saja
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: 'var(--brand-radius-sm, 0px)',
                  backgroundColor: 'var(--brand-muted, #aaa79f)',
                  display: 'inline-block',
                }}
              />
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
                minHeight: '380px',
                position: 'relative',
                borderRadius: '0px',
                overflow: 'hidden',
                border: '1px solid #dbe5dd',
                padding: '28px',
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
                    'rgba(32,30,29,0.55)',
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
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    padding: '6px 12px',
                    borderRadius: '0px',
                    marginBottom: '14px',
                    color: 'var(--accent-dark)',
                  }}
                >
                 Program Pilihan
                </span>

               <div
                  style={{
                    fontSize: '34px',
                    lineHeight: 1.02,
                    letterSpacing: '-0.04em',
                    fontWeight: 850,
                    color: '#FFFFFF',
                    marginBottom: '12px',
                    textShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  }}
                >
                 {featuredItem.program.title}
                </div>

               <p
                  style={{
                    fontSize: '13px',
                    color: '#e2ece5',
                    maxWidth: '300px',
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
                }}
              >
               <img
                  src={profile.avatarUrl || "/images/promoter_profile_rina.webp"}
                  alt={profile.displayName}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '0px',
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
