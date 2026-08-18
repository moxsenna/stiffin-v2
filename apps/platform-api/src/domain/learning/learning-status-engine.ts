/**
 * Pure learning status engine.
 * Computes canonical learning status (NOT_STARTED, IN_PROGRESS, COMPLETED, AT_RISK)
 * conforming to DB check constraint 'enrollments_learning_status_check'.
 */

export type CanonicalLearningStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK';
export type EnrollmentLifecycleStatus = 'ENROLLED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export interface LearningStatusInput {
  progressPercent: number;
  lifecycleStatus?: EnrollmentLifecycleStatus;
  lastActivityAt?: string | null;
  enrolledAt?: string;
  now?: Date;
}

export function calculateLearningStatus(input: LearningStatusInput): CanonicalLearningStatus {
  if (input.lifecycleStatus === 'COMPLETED' || input.progressPercent >= 100) {
    return 'COMPLETED';
  }

  if (input.progressPercent === 0 && (!input.lifecycleStatus || input.lifecycleStatus === 'ENROLLED')) {
    return 'NOT_STARTED';
  }

  const now = input.now ?? new Date();
  const refTimeStr = input.lastActivityAt ?? input.enrolledAt;

  if (refTimeStr) {
    const refTime = new Date(refTimeStr).getTime();
    const diffDays = (now.getTime() - refTime) / (1000 * 60 * 60 * 24);

    if (diffDays > 7 && input.progressPercent < 50) {
      return 'AT_RISK';
    }
  }

  return 'IN_PROGRESS';
}
