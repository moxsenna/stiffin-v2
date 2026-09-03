'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PublicWorkspaceProfile, PublicProgramCatalogItem } from '@/modules/public-storefront/types';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { WorkspaceHero } from '@/components/public/WorkspaceHero';
import { ValueStrip } from '@/components/public/ValueStrip';
import { ProgramCatalog } from '@/components/public/ProgramCatalog';
import { PromoterProfile } from '@/components/public/PromoterProfile';
import { LearnerTabBar } from '@/components/layout/LearnerTabBar';
import { setLastPublicWorkspaceSlug } from '@/lib/session';
import { getPublicWorkspaceQuery, listPublicProgramsQuery } from '@/modules/public-storefront/queries';

import { capturePrototypeReferralCode } from '@/lib/referral-capture';

import { StorefrontThemeProvider } from '@/components/theme/StorefrontThemeProvider';

interface StorefrontClientProps {
  profile: PublicWorkspaceProfile;
  catalog: PublicProgramCatalogItem[];
}

export function StorefrontClient({ profile: initialProfile, catalog: initialCatalog }: StorefrontClientProps) {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const [profile, setProfile] = useState<PublicWorkspaceProfile>(initialProfile);
  const [catalog, setCatalog] = useState<PublicProgramCatalogItem[]>(initialCatalog);

  useEffect(() => {
    if (initialProfile.workspaceSlug) {
      setLastPublicWorkspaceSlug(initialProfile.workspaceSlug);

      // Re-fetch client state from LocalStorage/API if customized
      getPublicWorkspaceQuery(initialProfile.workspaceSlug).then(p => {
        if (p) setProfile(p);
      });

      listPublicProgramsQuery(initialProfile.workspaceSlug).then(c => {
        if (c && c.length > 0) setCatalog(c);
      });
    }

    if (refCode) {
      capturePrototypeReferralCode(refCode);
    }
  }, [initialProfile.workspaceSlug, refCode]);

  const featuredItem = catalog.find(item => item.presentation.featured) || catalog[0];

  return (
    <StorefrontThemeProvider theme={profile.theme}>
      <div className="page-wrapper-with-bottom-nav">
        <PublicHeader
          workspaceSlug={profile.workspaceSlug}
          displayName={profile.theme?.brandName || profile.displayName}
          tagline={profile.theme?.tagline || profile.tagline}
          logoUrl={profile.theme?.logoUrl || profile.logoUrl}
        />

        <main>
          <WorkspaceHero profile={profile} featuredItem={featuredItem} />
          <ValueStrip />
          <ProgramCatalog items={catalog} workspaceSlug={profile.workspaceSlug} />
          <PromoterProfile profile={profile} />
        </main>

        <PublicFooter displayName={(profile.theme?.brandName || profile.displayName).split(' ')[0]} />

        <LearnerTabBar workspaceSlug={profile.workspaceSlug} />
      </div>
    </StorefrontThemeProvider>
  );
}
