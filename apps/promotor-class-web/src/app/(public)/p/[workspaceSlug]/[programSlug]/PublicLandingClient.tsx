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
import { StickyProgramCTA } from '@/components/public/StickyProgramCTA';

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
    <div style={{ backgroundColor: 'var(--color-surface-muted)', minHeight: '100vh', color: 'var(--color-text-main)' }}>
      <PublicHeader
        workspaceSlug={promoter.workspaceSlug}
        displayName={promoter.displayName}
        tagline={promoter.tagline}
        onPrimaryClick={scrollToRegister}
      />

      <main>
        {/* Back Link */}
        <div className="container" style={{ paddingTop: '20px' }}>
          <Link
            href={`/p/${promoter.workspaceSlug}`}
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '13px',
              textDecoration: 'none',
              fontWeight: 650,
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

      <StickyProgramCTA
        label={detail.isRegistrationAllowed ? 'Mulai belajar gratis' : 'Informasi Pendaftaran'}
        targetId="register"
      />
    </div>
  );
}
