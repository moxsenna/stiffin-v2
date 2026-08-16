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
  workspaceSlug: string
): Promise<PublicProgramCatalogItem[]> {
  return getPublicStorefrontRepository().getPublicProgramCatalog(workspaceSlug);
}

export const getPublicProgramCatalogQuery = listPublicProgramsQuery;

export async function getPublicProgramDetailQuery(
  workspaceSlug: string,
  programSlug: string
): Promise<PublicProgramDetail | null> {
  return getPublicStorefrontRepository().getPublicProgramDetail(workspaceSlug, programSlug);
}
