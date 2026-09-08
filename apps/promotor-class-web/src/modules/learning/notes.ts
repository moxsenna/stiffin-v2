import { getPlatformApiClient, getApiMode } from '@/adapters';
import type { LessonNoteDto } from '@promotor/contracts';

const mockNotesStore = new Map<string, { body: string; updatedAt: string }>();

export async function getLessonNoteQuery(enrollmentId: string, lessonId: string): Promise<LessonNoteDto | null> {
  if (getApiMode() === 'mock') {
    const key = `${enrollmentId}:${lessonId}`;
    return mockNotesStore.get(key) ?? null;
  }
  const api = getPlatformApiClient();
  const res = await api.getLessonNote(enrollmentId, lessonId);
  return res.note ?? null;
}

export async function saveLessonNoteCommand(
  enrollmentId: string,
  lessonId: string,
  body: string
): Promise<LessonNoteDto> {
  if (getApiMode() === 'mock') {
    const key = `${enrollmentId}:${lessonId}`;
    const note: LessonNoteDto = { body, updatedAt: new Date().toISOString() };
    mockNotesStore.set(key, note);
    return note;
  }
  const api = getPlatformApiClient();
  const res = await api.saveLessonNote(enrollmentId, lessonId, { body });
  return res.note;
}
