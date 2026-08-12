import { publicStorefrontRepository } from '@/adapters/mock/public-storefront-repository';
import { PublicWorkspaceProfile } from './types';

export async function updateWorkspaceProfileCommand(
  workspaceSlug: string,
  profile: Partial<PublicWorkspaceProfile>
) {
  return publicStorefrontRepository.updatePublicWorkspaceProfile(workspaceSlug, profile);
}
