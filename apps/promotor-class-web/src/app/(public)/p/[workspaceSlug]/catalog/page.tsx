import { notFound } from 'next/navigation';
import { getPublicWorkspaceQuery, listPublicProgramsQuery } from '@/modules/public-storefront/queries';
import { CatalogClient } from './CatalogClient';

interface CatalogPageProps {
  params: {
    workspaceSlug: string;
  };
}

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { workspaceSlug } = params;

  const profile = await getPublicWorkspaceQuery(workspaceSlug);
  if (!profile) {
    notFound();
  }

  const catalog = await listPublicProgramsQuery(workspaceSlug);

  return <CatalogClient profile={profile} catalog={catalog} />;
}
