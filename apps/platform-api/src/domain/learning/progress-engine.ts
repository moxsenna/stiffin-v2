/**
 * Pure progress calculation engine.
 * No I/O, no DB dependencies.
 */

export interface LessonProgressItem {
  lessonId: string;
  isCompleted: boolean;
}

export interface ProgressCalculationResult {
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
  learningStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  isComplete: boolean;
  reached50: boolean;
  reached80: boolean;
  reached100: boolean;
}

/**
 * Calculates deterministic progress for a program.
 *
 * Formula:
 * - If total lessons == 0, progressPercent = 100
 * - Otherwise: min(100, round((completed / total) * 100))
 */
export function calculateProgramProgress(
  allLessonIds: string[],
  completedLessonIds: Set<string>
): ProgressCalculationResult {
  const total = allLessonIds.length;
  if (total === 0) {
    return {
      completedLessonsCount: 0,
      totalLessonsCount: 0,
      progressPercent: 100,
      learningStatus: 'COMPLETED',
      isComplete: true,
      reached50: true,
      reached80: true,
      reached100: true,
    };
  }

  let completed = 0;
  for (const lid of allLessonIds) {
    if (completedLessonIds.has(lid)) {
      completed++;
    }
  }

  const rawPercent = Math.round((completed / total) * 100);
  const progressPercent = Math.min(100, Math.max(0, rawPercent));

  let learningStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  if (progressPercent === 100) {
    learningStatus = 'COMPLETED';
  } else if (progressPercent > 0) {
    learningStatus = 'IN_PROGRESS';
  } else {
    learningStatus = 'NOT_STARTED';
  }

  return {
    completedLessonsCount: completed,
    totalLessonsCount: total,
    progressPercent,
    learningStatus,
    isComplete: progressPercent === 100,
    reached50: progressPercent >= 50,
    reached80: progressPercent >= 80,
    reached100: progressPercent === 100,
  };
}
