import { getProgramRepository } from '@/adapters';
import { Lesson } from '@promotor/contracts';
import { CreateProgramDetailedInput } from './ports';

export async function createProgramCommand(
  title: string,
  subtitle: string,
  description: string,
  priceType: 'free' | 'paid'
) {
  return getProgramRepository().createProgram(title, subtitle, description, priceType);
}

export async function createProgramDetailedCommand(input: CreateProgramDetailedInput) {
  return getProgramRepository().createProgramDetailed(input);
}

export async function toggleProgramStatusCommand(programId: string) {
  return getProgramRepository().toggleProgramStatus(programId);
}

export async function addModuleCommand(programId: string, title: string) {
  return getProgramRepository().addModule(programId, title);
}

export async function deleteModuleCommand(programId: string, moduleId: string) {
  return getProgramRepository().deleteModule(programId, moduleId);
}

export async function addLessonCommand(programId: string, moduleId: string, lessonTitle: string, videoUrl?: string) {
  return getProgramRepository().addLesson(programId, moduleId, lessonTitle, videoUrl);
}

export async function deleteLessonCommand(programId: string, moduleId: string, lessonId: string) {
  return getProgramRepository().deleteLesson(programId, moduleId, lessonId);
}

export async function reorderModulesCommand(programId: string, moduleIdsOrder: string[]) {
  return getProgramRepository().reorderModules(programId, moduleIdsOrder);
}

export async function saveLessonCommand(programId: string, moduleId: string, lesson: Lesson) {
  return getProgramRepository().saveLesson(programId, moduleId, lesson);
}
