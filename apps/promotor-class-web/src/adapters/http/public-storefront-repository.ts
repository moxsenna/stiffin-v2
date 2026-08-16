import type {
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
} from '@promotor/contracts';
import { PublicStorefrontRepositoryPort } from '@/modules/public-storefront/ports';
import { PromotorClassContentApiClient } from '@promotor/api-client';

export class HttpPublicStorefrontRepository implements PublicStorefrontRepositoryPort {
  private client: PromotorClassContentApiClient;

  constructor(client: PromotorClassContentApiClient) {
    this.client = client;
  }

  async getPublicWorkspaceProfile(workspaceSlug: string): Promise<PublicWorkspaceProfile | null> {
    return this.client.getPublicWorkspaceProfile(workspaceSlug);
  }

  async getPublicProgramCatalog(workspaceSlug: string): Promise<PublicProgramCatalogItem[]> {
    return this.client.getPublicProgramCatalog(workspaceSlug);
  }

  async getPublicProgramDetail(workspaceSlug: string, programSlug: string): Promise<PublicProgramDetail | null> {
    return this.client.getPublicProgramDetail(workspaceSlug, programSlug);
  }

  async updatePublicWorkspaceProfile(
    _workspaceSlug: string,
    profile: Partial<PublicWorkspaceProfile>
  ): Promise<PublicWorkspaceProfile> {
    return this.client.updateWorkspaceProfile({
      displayName: profile.displayName,
      tagline: profile.tagline,
      headline: profile.headline,
      bio: profile.bio,
      city: profile.city,
      roleLabel: profile.roleLabel,
      heroProgramId: profile.heroProgramId,
      whatsappPhoneE164: profile.whatsappPhoneE164,
      avatarUrl: profile.avatarUrl,
      logoUrl: profile.logoUrl,
      stats: profile.stats
        ? {
            familiesHelped: profile.stats.familiesHelped,
            location: profile.stats.location,
          }
        : undefined,
    });
  }
}
