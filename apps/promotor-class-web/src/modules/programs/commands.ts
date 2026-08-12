import { programRepository } from '@/adapters/mock/program-repository';
import { Lesson } from '@promotor/contracts';

export async function createProgramCommand(
  title: string,
  subtitle: string,
  description: string,
  priceType: 'free' | 'paid'
) {
  return programRepository.createProgram(title, subtitle, description, priceType);
}

export async function reorderModulesCommand(programId: string, moduleIdsOrder: string[]) {
  return programRepository.reorderModules(programId, moduleIdsOrder);
}

export async function saveLessonCommand(programId: string, moduleId: string, lesson: Lesson) {
  return programRepository.saveLesson(programId, moduleId, lesson);
}
