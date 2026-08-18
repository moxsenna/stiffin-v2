/**
 * Pure progress calculation engine.
 * No I/O, no DB dependencies.
 */

export interface LessonProgressItem {
  lessonId: string;
  isRequired?: boolean;
  isCompleted: boolean;
}

export interface ProgressCalculationResult {
  completedLessonsCount: number;
  totalLessonsCount: number;
  completedRequiredLessonsCount: number;
  totalRequiredLessonsCount: number;
  progressPercent: number;
  learningStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  isComplete: boolean;
  reached50: boolean;
  reached80: boolean;
  reached100: boolean;
}

/**
 * Calculates deterministic progress for a program based on REQUIRED lessons.
 *
 * Canonical Rules:
 * - Progress = (completed REQUIRED lessons / total REQUIRED lessons) * 100
 * - Optional lessons (isRequired: false) may be completed, but do NOT block completion.
 * - If total required lessons == 0, progressPercent = 0, isComplete = false (fail-safe).
 */
export function calculateProgramProgress(
  lessons: Array<{ lessonId: string; isRequired?: boolean }>,
  completedLessonIds: Set<string>
): ProgressCalculationResult {
  const totalLessonsCount = lessons.length;
  let completedLessonsCount = 0;
  let totalRequired = 0;
  let completedRequired = 0;

  for (const l of lessons) {
    const isReq = l.isRequired !== false; // Default to true if undefined
    if (isReq) {
      totalRequired++;
    }
    if (completedLessonIds.has(l.lessonId)) {
      completedLessonsCount++;
      if (isReq) {
        completedRequired++;
      }
    }
  }

  // Zero required lessons fail-safe (§9):
  // Opening a program with zero required lessons does NOT auto-complete to 100%.
  if (totalRequired === 0) {
    return {
      completedLessonsCount,
      totalLessonsCount,
      completedRequiredLessonsCount: 0,
      totalRequiredLessonsCount: 0,
      progressPercent: 0,
      learningStatus: completedLessonsCount > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      isComplete: false,
      reached50: false,
      reached80: false,
      reached100: false,
    };
  }

  const rawPercent = Math.round((completedRequired / totalRequired) * 100);
  const progressPercent = Math.min(100, Math.max(0, rawPercent));

  let learningStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  if (progressPercent === 100) {
    learningStatus = 'COMPLETED';
  } else if (progressPercent > 0 || completedLessonsCount > 0) {
    learningStatus = 'IN_PROGRESS';
  } else {
    learningStatus = 'NOT_STARTED';
  }

  return {
    completedLessonsCount,
    totalLessonsCount,
    completedRequiredLessonsCount: completedRequired,
    totalRequiredLessonsCount: totalRequired,
    progressPercent,
    learningStatus,
    isComplete: progressPercent === 100,
    reached50: progressPercent >= 50,
    reached80: progressPercent >= 80,
    reached100: progressPercent === 100,
  };
}
