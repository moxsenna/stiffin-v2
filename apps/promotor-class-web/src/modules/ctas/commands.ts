import { learnerRepository } from '@/adapters/mock/learner-repository';

export async function recordCtaClickCommand(enrollmentId: string, lessonId: string, ctaUrl: string) {
  return learnerRepository.recordCtaClick(enrollmentId, lessonId, ctaUrl);
}
