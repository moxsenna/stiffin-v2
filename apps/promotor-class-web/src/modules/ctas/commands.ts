import { getLearningRepository } from '@/adapters';

export async function recordCtaClickCommand(enrollmentId: string, lessonId: string, ctaUrl: string) {
  const learningRepo = getLearningRepository() as any;
  if (typeof learningRepo.recordCtaClick === 'function') {
    return learningRepo.recordCtaClick(enrollmentId, lessonId, ctaUrl);
  }
}
