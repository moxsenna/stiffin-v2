import { Enrollment } from '@promotor/contracts';

export interface LearningModulePort {
  completeLesson(enrollmentId: string, lessonId: string, reflectionAnswer: string): Promise<Enrollment>;
}
