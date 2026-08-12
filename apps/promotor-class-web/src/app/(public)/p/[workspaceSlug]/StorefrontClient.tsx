'use client';

import React, { useEffect } from 'react';
import { PublicWorkspaceProfile, PublicProgramCatalogItem } from '@/modules/public-storefront/types';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { WorkspaceHero } from '@/components/public/WorkspaceHero';
import { ValueStrip } from '@/components/public/ValueStrip';
import { ProgramCatalog } from '@/components/public/ProgramCatalog';
import { PromoterProfile } from '@/components/public/PromoterProfile';
import { LearnerTabBar } from '@/components/layout/LearnerTabBar';
import { setLastPublicWorkspaceSlug } from '@/lib/session';

interface StorefrontClientProps {
  profile: PublicWorkspaceProfile;
  catalog: PublicProgramCatalogItem[];
}

export function StorefrontClient({ profile, catalog }: StorefrontClientProps) {
  const featuredItem = catalog.find(item => item.presentation.featured) || catalog[0];

  useEffect(() => {
    if (profile.workspaceSlug) {
      setLastPublicWorkspaceSlug(profile.workspaceSlug);
    }
  }, [profile.workspaceSlug]);

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
        workspaceSlug={profile.workspaceSlug}
        displayName={profile.displayName}
        tagline={profile.tagline}
      />

      <main>
        <WorkspaceHero profile={profile} featuredItem={featuredItem} />
        <ValueStrip />
        <ProgramCatalog items={catalog} workspaceSlug={profile.workspaceSlug} />
        <PromoterProfile profile={profile} />
      </main>

      <PublicFooter displayName={profile.displayName.split(' ')[0]} />

      <LearnerTabBar workspaceSlug={profile.workspaceSlug} />
    </div>
  );
}
