import { getPublicStorefrontRepository } from '@/adapters';
import { PublicWorkspaceProfile } from './types';

export async function updateWorkspaceProfileCommand(
  workspaceSlug: string,
  profile: Partial<PublicWorkspaceProfile>
) {
  return getPublicStorefrontRepository().updatePublicWorkspaceProfile(workspaceSlug, profile);
}
