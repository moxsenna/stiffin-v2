import { publicStorefrontRepository } from '@/adapters/mock/public-storefront-repository';
import {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
} from './types';

export async function getPublicWorkspaceQuery(
  workspaceSlug: string
): Promise<PublicWorkspaceProfile | null> {
  return publicStorefrontRepository.getPublicWorkspaceProfile(workspaceSlug);
}

export const getPublicWorkspaceProfileQuery = getPublicWorkspaceQuery;

export async function listPublicProgramsQuery(
  workspaceSlug: string
): Promise<PublicProgramCatalogItem[]> {
  return publicStorefrontRepository.getPublicProgramCatalog(workspaceSlug);
}

export const getPublicProgramCatalogQuery = listPublicProgramsQuery;

export async function getPublicProgramDetailQuery(
  workspaceSlug: string,
  programSlug: string
): Promise<PublicProgramDetail | null> {
  return publicStorefrontRepository.getPublicProgramDetail(workspaceSlug, programSlug);
}
