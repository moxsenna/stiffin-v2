import { learnerRepository } from '@/adapters/mock/learner-repository';

export async function completeLessonCommand(enrollmentId: string, lessonId: string, reflectionAnswer: string) {
  return learnerRepository.completeLesson(enrollmentId, lessonId, reflectionAnswer);
}
