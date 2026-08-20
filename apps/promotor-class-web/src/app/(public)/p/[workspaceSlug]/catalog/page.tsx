import { notFound } from 'next/navigation';
import { getPublicWorkspaceQuery, listPublicProgramsQuery } from '@/modules/public-storefront/queries';
import { CatalogClient } from './CatalogClient';

interface CatalogPageProps {
  params: Promise<{ workspaceSlug: string }> | { workspaceSlug: string };
}

export default async function CatalogPage({ params }: CatalogPageProps) {
  const resolvedParams = await params;
  const { workspaceSlug } = resolvedParams;

  const profile = await getPublicWorkspaceQuery(workspaceSlug);
  if (!profile) {
    return notFound();
  }

  const catalog = await listPublicProgramsQuery(workspaceSlug);

  return <CatalogClient profile={profile} catalog={catalog} />;
}
