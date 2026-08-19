import { getLearningRepository } from '@/adapters';
import type { LearningEventType } from '@promotor/contracts';

export async function completeLessonCommand(enrollmentId: string, lessonId: string) {
  const repo = getLearningRepository();
  return repo.completeLesson(enrollmentId, lessonId);
}

export async function submitReflectionCommand(
  enrollmentId: string,
  lessonId: string,
  data: { responseText?: string | null; selectedOptions?: unknown }
) {
  const repo = getLearningRepository();
  return repo.submitReflection(enrollmentId, lessonId, data);
}

export async function recordLearningEventCommand(
  enrollmentId: string,
  data: { eventType: LearningEventType; payload?: Record<string, unknown> }
) {
  const repo = getLearningRepository();
  return repo.recordEvent(enrollmentId, data);
}

export async function updateSignalStatusCommand(
  signalId: string,
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'
) {
  const repo = getLearningRepository();
  return repo.updateSignalStatus(signalId, status);
}
