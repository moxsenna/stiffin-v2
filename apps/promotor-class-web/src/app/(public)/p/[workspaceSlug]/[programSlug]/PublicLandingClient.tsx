'use client';

import React from 'react';
import Link from 'next/link';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { ProgramHero } from '@/components/public/ProgramHero';
import { LearningOutcomes } from '@/components/public/LearningOutcomes';
import { CurriculumPreview } from '@/components/public/CurriculumPreview';
import { PromoterProfile } from '@/components/public/PromoterProfile';
import { RegistrationSection } from '@/components/public/RegistrationSection';
import { LearnerTabBar } from '@/components/layout/LearnerTabBar';

interface PublicLandingClientProps {
  detail: PublicProgramDetail;
}

export function PublicLandingClient({ detail }: PublicLandingClientProps) {
  const { promoter, presentation } = detail;

  const scrollToRegister = () => {
    const el = document.getElementById('register');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="page-wrapper-with-bottom-nav"
      style={{
        backgroundColor: 'var(--color-surface-muted)',
        minHeight: '100vh',
        color: 'var(--color-text-main)',
      }}
    >
      <PublicHeader
        workspaceSlug={promoter.workspaceSlug}
        displayName={promoter.displayName}
        tagline={promoter.tagline}
        onPrimaryClick={scrollToRegister}
      />

      <main>
        {/* Back Link */}
        <div className="container" style={{ paddingTop: '24px' }}>
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
        <CurriculumPreview modules={detail.program.modules} />

        {/* Promoter Profile */}
        <PromoterProfile profile={promoter} />

        {/* Registration Section */}
        <RegistrationSection detail={detail} />
      </main>

      <PublicFooter displayName={promoter.displayName.split(' ')[0]} />

      {/* Universal Bottom Navigation Bar with integrated program action */}
      <LearnerTabBar
        ctaLabel={detail.isRegistrationAllowed ? 'Mulai Belajar' : 'Informasi'}
        ctaTargetId="register"
        workspaceSlug={promoter.workspaceSlug}
        onCtaClick={scrollToRegister}
      />
    </div>
  );
}
