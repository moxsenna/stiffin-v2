import {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
} from '@promotor/contracts';
import { DomainError } from '../core/errors';
import type { PublicContentRepository } from '../repositories/public-content-repository';

export interface PublicContentService {
  getPublicWorkspaceProfile(workspaceSlug: string): Promise<PublicWorkspaceProfile>;
  getPublicProgramCatalog(workspaceSlug: string): Promise<PublicProgramCatalogItem[]>;
  getPublicProgramDetail(workspaceSlug: string, programSlug: string): Promise<PublicProgramDetail>;
}

export function createPublicContentService(publicRepo: PublicContentRepository): PublicContentService {
  return {
    async getPublicWorkspaceProfile(workspaceSlug: string) {
      const profile = await publicRepo.getPublicWorkspaceProfile(workspaceSlug);
      if (!profile) {
        throw new DomainError('NOT_FOUND', `Workspace "${workspaceSlug}" not found`);
      }
      return profile;
    },

    async getPublicProgramCatalog(workspaceSlug: string) {
      return publicRepo.getPublicProgramCatalog(workspaceSlug);
    },

    async getPublicProgramDetail(workspaceSlug: string, programSlug: string) {
      const detail = await publicRepo.getPublicProgramDetail(workspaceSlug, programSlug);
      if (!detail) {
        throw new DomainError('NOT_FOUND', `Program "${programSlug}" not found in workspace "${workspaceSlug}"`);
      }
      return detail;
    },
  };
}
