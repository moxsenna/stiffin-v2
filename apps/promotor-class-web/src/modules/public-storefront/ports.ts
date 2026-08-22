import {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
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
}
