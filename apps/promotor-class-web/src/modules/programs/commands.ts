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

export async function presignCoverUploadCommand(params: {
  programId?: string;
  fileName: string;
  contentType: string;
  contentLength: number;
}) {
  return getProgramRepository().presignCoverUpload(params);
}

export async function confirmCoverUploadCommand(params: {
  programId: string;
  key: string;
  contentType: string;
  contentLength?: number;
}) {
  return getProgramRepository().confirmCoverUpload(params);
}

export async function deleteCoverImageCommand(programId: string) {
  return getProgramRepository().deleteCoverImage(programId);
}

export async function directUploadToR2(uploadUrl: string, file: File | Blob, contentType: string) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload langsung ke R2 gagal: ${res.status} ${res.statusText}`);
  }
  return true;
}
