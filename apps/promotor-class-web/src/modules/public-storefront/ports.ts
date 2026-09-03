import {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
  StorefrontTheme,
  UpdateStorefrontThemeRequest,
} from './types';

export interface PublicStorefrontRepositoryPort {
  getPublicWorkspaceProfile(workspaceSlug: string): Promise<PublicWorkspaceProfile | null>;
  getPublicProgramCatalog(workspaceSlug: string): Promise<PublicProgramCatalogItem[]>;
  getPublicProgramDetail(
    workspaceSlug: string,
    programSlug: string
  ): Promise<PublicProgramDetail | null>;
  updatePublicWorkspaceProfile(
    workspaceSlug: string,
    profile: Partial<PublicWorkspaceProfile>
  ): Promise<PublicWorkspaceProfile>;
  getStorefrontProfile(): Promise<PublicWorkspaceProfile | null>;
  updateStorefrontProfile(
    profile: Partial<PublicWorkspaceProfile>
  ): Promise<PublicWorkspaceProfile>;
  getStorefrontTheme(): Promise<StorefrontTheme>;
  updateStorefrontTheme(theme: UpdateStorefrontThemeRequest): Promise<StorefrontTheme>;
  resetStorefrontTheme(): Promise<StorefrontTheme>;
  presignWorkspaceAsset(
    kind: 'avatar' | 'logo',
    params: { fileName: string; contentType: string; contentLength: number }
  ): Promise<{ key: string; uploadUrl: string; publicUrl: string; contentType: string; contentLength: number; expiresAt: string; maxBytes: number }>;
}
