import { getPublicStorefrontRepository } from '@/adapters';
import {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
  StorefrontTheme,
  UpdateStorefrontThemeRequest,
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

export async function getStorefrontThemeQuery(): Promise<StorefrontTheme> {
  return getPublicStorefrontRepository().getStorefrontTheme();
}

export async function updateStorefrontThemeMutation(
  theme: UpdateStorefrontThemeRequest
): Promise<StorefrontTheme> {
  return getPublicStorefrontRepository().updateStorefrontTheme(theme);
}

export async function resetStorefrontThemeMutation(): Promise<StorefrontTheme> {
  return getPublicStorefrontRepository().resetStorefrontTheme();
}

export async function presignWorkspaceAssetCommand(
  kind: 'avatar' | 'logo',
  params: { fileName: string; contentType: string; contentLength: number }
) {
  return getPublicStorefrontRepository().presignWorkspaceAsset(kind, params);
}

