import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getPublicWorkspaceQuery, listPublicProgramsQuery } from '@/modules/public-storefront/queries';
import { StorefrontClient } from './StorefrontClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { workspaceSlug: string };
}

export default async function PublicStorefrontPage({ params }: PageProps) {
  const profile = await getPublicWorkspaceQuery(params.workspaceSlug);
  if (!profile) {
    notFound();
    return null;
  }

  const catalog = await listPublicProgramsQuery(params.workspaceSlug);

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Memuat Storefront...</div>}>
      <StorefrontClient profile={profile} catalog={catalog} />
    </Suspense>
  );
}
