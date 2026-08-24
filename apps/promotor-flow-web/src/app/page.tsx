'use client';

import React from 'react';
import { FlowLandingHeader } from '@/components/landing/FlowLandingHeader';
import { FlowHero } from '@/components/landing/FlowHero';
import { FrictionVsFlow } from '@/components/landing/FrictionVsFlow';
import { LivePipelineDemo } from '@/components/landing/LivePipelineDemo';
import { FlowFeatureGrid } from '@/components/landing/FlowFeatureGrid';
import { FlowRoiCalculator } from '@/components/landing/FlowRoiCalculator';
import { FlowTestimonials } from '@/components/landing/FlowTestimonials';
import { FlowPricingSection } from '@/components/landing/FlowPricingSection';
import { FlowFaqSection } from '@/components/landing/FlowFaqSection';
import { FlowFinalCta } from '@/components/landing/FlowFinalCta';
import { FlowLandingFooter } from '@/components/landing/FlowLandingFooter';

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: 'var(--color-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <FlowLandingHeader />
      <main style={{ flex: 1 }}>
        <FlowHero />
        <FrictionVsFlow />
        <LivePipelineDemo />
        <FlowFeatureGrid />
        <FlowRoiCalculator />
        <FlowTestimonials />
        <FlowPricingSection />
        <FlowFaqSection />
        <FlowFinalCta />
      </main>
      <FlowLandingFooter />
    </div>
  );
}
