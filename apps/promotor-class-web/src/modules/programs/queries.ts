import { programRepository } from '@/adapters/mock/program-repository';

export async function getProgramsQuery() {
  return programRepository.getPrograms();
}

export async function getProgramByIdQuery(id: string) {
  return programRepository.getProgramById(id);
}

export async function getProgramBySlugsQuery(workspaceSlug: string, programSlug: string) {
  return programRepository.getProgramBySlugs(workspaceSlug, programSlug);
}
