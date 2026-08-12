'use client';

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
              fontSize: 'clamp(38px, 5vw, 64px)',
              lineHeight: 0.98,
              letterSpacing: '-0.045em',
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

        {/* Right Featured Art Card */}
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
                backgroundColor: '#e8eee8',
                border: '1px solid #dbe5dd',
                boxShadow: 'var(--shadow)',
                padding: '34px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 820,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #dfe5e0',
                    padding: '7px 12px',
                    borderRadius: '999px',
                    marginBottom: '18px',
                    color: 'var(--color-primary)',
                  }}
                >
                  Program Pilihan
                </span>

                <div
                  style={{
                    fontSize: '44px',
                    lineHeight: 0.96,
                    letterSpacing: '-0.05em',
                    fontWeight: 850,
                    color: '#191918',
                    marginBottom: '16px',
                  }}
                >
                  {featuredItem.program.title}
                </div>

                <p
                  style={{
                    fontSize: '14px',
                    color: '#53605a',
                    maxWidth: '320px',
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {featuredItem.presentation.shortOutcome}
                </p>
              </div>

              {/* Decorative shapes */}
              <div
                style={{
                  position: 'absolute',
                  right: '-55px',
                  bottom: '-42px',
                  width: '280px',
                  height: '280px',
                  borderRadius: '44% 56% 48% 52%',
                  backgroundColor: 'var(--color-primary)',
                  transform: 'rotate(-12deg)',
                  opacity: 0.9,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '60px',
                  bottom: '24px',
                  width: '130px',
                  height: '190px',
                  borderRadius: '90px 90px 28px 28px',
                  backgroundColor: '#f7d6b6',
                  transform: 'rotate(9deg)',
                  border: '10px solid rgba(255,255,255,0.44)',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#33443a',
                  zIndex: 3,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #d9e1db',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                  }}
                >
                  {profile.displayName.charAt(0)}
                </div>
                <span>oleh {profile.displayName}</span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
