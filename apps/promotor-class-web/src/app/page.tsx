'use client';

import React from 'react';
import { PlatformHeader } from '@/components/platform/PlatformHeader';
import { PlatformHero } from '@/components/platform/PlatformHero';
import { InteractiveEngineDemo } from '@/components/platform/InteractiveEngineDemo';
import { ProblemVsSolution } from '@/components/platform/ProblemVsSolution';
import { FeatureGrid } from '@/components/platform/FeatureGrid';
import { RoiCalculator } from '@/components/platform/RoiCalculator';
import { LiveStorefrontShowcase } from '@/components/platform/LiveStorefrontShowcase';
import { PricingSection } from '@/components/platform/PricingSection';
import { FaqSection } from '@/components/platform/FaqSection';
import { FinalCtaBanner } from '@/components/platform/FinalCtaBanner';
import { PlatformFooter } from '@/components/platform/PlatformFooter';

export default function RootLandingPage() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-canvas)',
        minHeight: '100vh',
        color: 'var(--color-text-main)',
      }}
    >
      {/* 
        THESIS: Client Education OS converting learning activities into actionable WhatsApp follow-ups, refusing generic LMS dashboard clutter and cold broadcast spam.
        OWN-WORLD: Emerald (#286344) authority accent, warm canvas (#F7F7F5), precise typography with editorial serif accents, structured asymmetric feature pillars.
        STORY: Promoter understands the disconnect between distributing materials and closing clients, sees the 3-step live engine, calculates conversion uplift, and launches their space.
        FIRST VIEWPORT: Focused editorial hero with primary direct-response CTA cluster, proof metrics strip, and zero-distraction navigation.
        FORM: Direct-Response SaaS & Quiet Utility Craft.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
      */}

      <PlatformHeader />

      <main>
        <PlatformHero />
        <InteractiveEngineDemo />
        <ProblemVsSolution />
        <FeatureGrid />
        <RoiCalculator />
        <LiveStorefrontShowcase />
        <PricingSection />
        <FaqSection />
        <FinalCtaBanner />
      </main>

      <PlatformFooter />
    </div>
  );
}
