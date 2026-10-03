import { getPublicStorefrontRepository } from '@/adapters';
import {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
} from './types';

export async function getPublicWorkspaceQuery(
  workspaceSlug: string
): Promise<PublicWorkspaceProfile | null> {
  return getPublicStorefrontRepository().getPublicWorkspaceProfile(workspaceSlug);
}

export const getPublicWorkspaceProfileQuery = getPublicWorkspaceQuery;

export async function listPublicProgramsQuery(
  workspaceSlug: string,
  filter?: { search?: string; category?: string }
): Promise<PublicProgramCatalogItem[]> {
  const items = await getPublicStorefrontRepository().getPublicProgramCatalog(workspaceSlug);
  if (!filter) return items;

  return items.filter((item) => {
    if (filter.category && filter.category !== 'Semua') {
      const cat = ((item.presentation as any)?.category || '').toLowerCase();
      const title = item.program.title.toLowerCase();
      const matchCat = cat === filter.category.toLowerCase() || title.includes(filter.category.toLowerCase());
      if (!matchCat) return false;
    }
    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      const hay = `${item.program.title} ${item.program.subtitle ?? ''} ${item.presentation.heroEyebrow ?? ''} ${item.presentation.shortOutcome ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export const getPublicProgramCatalogQuery = listPublicProgramsQuery;

export async function getPublicProgramDetailQuery(
  workspaceSlug: string,
  programSlug: string
): Promise<PublicProgramDetail | null> {
  return getPublicStorefrontRepository().getPublicProgramDetail(workspaceSlug, programSlug);
}
