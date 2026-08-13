'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { ProgramHero } from '@/components/public/ProgramHero';
import { LearningOutcomes } from '@/components/public/LearningOutcomes';
import { CurriculumPreview } from '@/components/public/CurriculumPreview';
import { PromoterProfile } from '@/components/public/PromoterProfile';
import { RegistrationSection } from '@/components/public/RegistrationSection';
import { LearnerTabBar } from '@/components/layout/LearnerTabBar';
import { MobileAppHeader } from '@/components/layout/MobileAppHeader';
import { setLastPublicWorkspaceSlug } from '@/lib/session';
import { capturePrototypeReferralCode } from '@/lib/referral-capture';

interface PublicLandingClientProps {
  detail: PublicProgramDetail;
}

export function PublicLandingClient({ detail }: PublicLandingClientProps) {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const { promoter, presentation, program, isRegistrationAllowed } = detail;

  useEffect(() => {
    if (promoter.workspaceSlug) {
      setLastPublicWorkspaceSlug(promoter.workspaceSlug);
    }
    if (refCode) {
      capturePrototypeReferralCode(refCode);
    }
  }, [promoter.workspaceSlug, refCode]);

  const scrollToRegister = () => {
    const el = document.getElementById('register');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="page-wrapper-with-bottom-nav-and-cta"
      style={{
        backgroundColor: 'var(--color-surface-muted)',
        minHeight: '100vh',
        color: 'var(--color-text-main)',
      }}
    >
      {/* Mobile Top App Header */}
      <MobileAppHeader
        title={program.title}
        showBack={true}
        backHref={`/p/${promoter.workspaceSlug}`}
        showProfile={true}
        workspaceSlug={promoter.workspaceSlug}
      />

      {/* Desktop Header */}
      <div className="desktop-only">
        <PublicHeader
          workspaceSlug={promoter.workspaceSlug}
          displayName={promoter.displayName}
          tagline={promoter.tagline}
          onPrimaryClick={scrollToRegister}
        />
      </div>

      <main>
        {/* Back Link for Desktop */}
        <div className="container desktop-only" style={{ paddingTop: '24px' }}>
          <Link
            href={`/p/${promoter.workspaceSlug}`}
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '13px',
              textDecoration: 'none',
              fontWeight: 650,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Kembali ke ruang belajar
          </Link>
        </div>

        {/* Hero */}
        <ProgramHero detail={detail} onStartClick={scrollToRegister} />

        {/* Learning Outcomes */}
        <LearningOutcomes outcomes={presentation.learningOutcomes} />

        {/* Curriculum Preview */}
        <CurriculumPreview modules={program.modules} />

        {/* Promoter Profile */}
        <PromoterProfile profile={promoter} />

        {/* Registration Section */}
        <RegistrationSection detail={detail} />
      </main>

      <PublicFooter displayName={promoter.displayName.split(' ')[0]} />

      {/* Mobile Sticky Program CTA Bar (FLOATS ABOVE BOTTOM NAVIGATION) */}
      <div
        className="mobile-only"
        style={{
          position: 'fixed',
          bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          left: 0,
          right: 0,
          zIndex: 950,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--color-divider)',
          padding: '8px 16px',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {isRegistrationAllowed ? (
            <button
              onClick={scrollToRegister}
              className="touch-target-primary"
              style={{
                width: '100%',
                minHeight: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '14px',
                border: 0,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Mulai Belajar Gratis →
            </button>
          ) : program.programType === 'aftersales' ? (
            <button
              onClick={scrollToRegister}
              style={{
                width: '100%',
                minHeight: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-status-warning-bg)',
                color: 'var(--color-status-warning)',
                fontWeight: 750,
                fontSize: '13px',
                border: '1px solid #FCD34D',
                cursor: 'pointer',
              }}
            >
              Khusus Peserta Tes STIFIn — Lihat Akses
            </button>
          ) : (program.priceAmount && program.priceAmount > 0) ? (
            <button
              onClick={scrollToRegister}
              style={{
                width: '100%',
                minHeight: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontWeight: 750,
                fontSize: '13px',
                border: '1px solid var(--color-primary-border)',
                cursor: 'pointer',
              }}
            >
              Rp {(program.priceAmount || 0).toLocaleString('id-ID')} — Hubungi Promotor
            </button>
          ) : null}
        </div>
      </div>

      {/* Universal Permanent 4-Tab Bottom Navigation Bar */}
      <LearnerTabBar workspaceSlug={promoter.workspaceSlug} />
    </div>
  );
}
