import { notFound } from 'next/navigation';
import { getPublicProgramDetailQuery } from '@/modules/public-storefront/queries';
import { PublicLandingClient } from './PublicLandingClient';

export function generateStaticParams() {
  return [
    { workspaceSlug: 'rina', programSlug: '7-hari-mengenal-cara-belajar-anak' },
    { workspaceSlug: 'rina', programSlug: '30-hari-setelah-tes' },
    { workspaceSlug: 'rina', programSlug: 'parenting-growth' },
  ];
}

interface PageProps {
  params: { workspaceSlug: string; programSlug: string };
}

export default async function PublicProgramLandingPage({ params }: PageProps) {
  const detail = await getPublicProgramDetailQuery(params.workspaceSlug, params.programSlug);
  if (!detail) {
    notFound();
    return null;
  }

  return <PublicLandingClient detail={detail} />;
}
