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
    <section className="container" style={{ paddingTop: '48px', paddingBottom: '32px' }}>
     <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
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
              color: 'var(--accent-dark)',
              marginBottom: '16px',
            }}
          >
           <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '0px',
                backgroundColor: 'var(--accent-dark)',
              }}
            />
           Ruang belajar {profile.displayName.split(' ')[0]}
          </div>

         <h1
            style={{
              fontSize: 'clamp(32px, 4.5vw, 56px)',
              lineHeight: 1.04,
              letterSpacing: '-0.04em',
              marginBottom: '18px',
              fontWeight: 800,
            }}
          >
           {profile.headline}
          </h1>

         <p
            style={{
              fontSize: '16px',
              lineHeight: 1.65,
              color: '#4f4e4a',
              maxWidth: '650px',
              marginBottom: '24px',
            }}
          >
           Materi singkat untuk membantu orang tua mengenali cara belajar anak, mengurangi konflik sehari-hari, dan mendampingi dengan lebih tenang.
          </p>

         <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
           <a
              href="#programs"
              style={{
                minHeight: '46px',
                borderRadius: '0px',
                padding: '0 20px',
                backgroundColor: 'var(--accent-dark)',
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
                minHeight: '46px',
                borderRadius: '0px',
                padding: '0 20px',
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
              marginTop: '20px',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              color: 'var(--color-text-muted)',
              fontSize: '12px',
            }}
          >
           <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
             <i style={{ width: '5px', height: '5px', borderRadius: '0px', backgroundColor: '#aaa79f', display: 'inline-block' }} />
             Materi praktis
            </span>
           <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
             <i style={{ width: '5px', height: '5px', borderRadius: '0px', backgroundColor: '#aaa79f', display: 'inline-block' }} />
             Bisa dipelajari kapan saja
            </span>
           <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
             <i style={{ width: '5px', height: '5px', borderRadius: '0px', backgroundColor: '#aaa79f', display: 'inline-block' }} />
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
