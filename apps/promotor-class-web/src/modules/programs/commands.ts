import { programRepository } from '@/adapters/mock/program-repository';
import { Lesson } from '@promotor/contracts';
import { CreateProgramDetailedInput } from './ports';

export async function createProgramCommand(
  title: string,
  subtitle: string,
  description: string,
  priceType: 'free' | 'paid'
) {
  return programRepository.createProgram(title, subtitle, description, priceType);
}

export async function createProgramDetailedCommand(input: CreateProgramDetailedInput) {
  return programRepository.createProgramDetailed(input);
}

export async function toggleProgramStatusCommand(programId: string) {
  return programRepository.toggleProgramStatus(programId);
}

export async function addModuleCommand(programId: string, title: string) {
  return programRepository.addModule(programId, title);
}

export async function deleteModuleCommand(programId: string, moduleId: string) {
  return programRepository.deleteModule(programId, moduleId);
}

export async function addLessonCommand(programId: string, moduleId: string, lessonTitle: string, videoUrl?: string) {
  return programRepository.addLesson(programId, moduleId, lessonTitle, videoUrl);
}

export async function deleteLessonCommand(programId: string, moduleId: string, lessonId: string) {
  return programRepository.deleteLesson(programId, moduleId, lessonId);
}

export async function reorderModulesCommand(programId: string, moduleIdsOrder: string[]) {
  return programRepository.reorderModules(programId, moduleIdsOrder);
}

export async function saveLessonCommand(programId: string, moduleId: string, lesson: Lesson) {
  return programRepository.saveLesson(programId, moduleId, lesson);
}
