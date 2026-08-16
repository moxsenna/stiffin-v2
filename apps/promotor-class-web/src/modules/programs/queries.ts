import { getProgramRepository } from '@/adapters';

export async function getProgramsQuery() {
  return getProgramRepository().getPrograms();
}

export async function getProgramByIdQuery(id: string) {
  return getProgramRepository().getProgramById(id);
}

export async function getProgramBySlugsQuery(workspaceSlug: string, programSlug: string) {
  return getProgramRepository().getProgramBySlugs(workspaceSlug, programSlug);
}
