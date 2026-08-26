import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getPublicProgramDetailQuery } from '@/modules/public-storefront/queries';
import { PublicLandingClient } from './PublicLandingClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ workspaceSlug: string; programSlug: string }>;
}

export default async function PublicProgramLandingPage({ params }: PageProps) {
  const { workspaceSlug, programSlug } = await params;
  const detail = await getPublicProgramDetailQuery(workspaceSlug, programSlug);
  if (!detail) {
    notFound();
    return null;
  }

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Memuat Landing Page...</div>}>
     <PublicLandingClient detail={detail} />
   </Suspense>
 );
}
