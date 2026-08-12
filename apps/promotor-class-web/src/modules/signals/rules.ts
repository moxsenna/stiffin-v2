import { LearningEvent, LearningSignal, SignalStatus } from '@promotor/contracts';

export interface ScoreEvaluationResult {
  intentScore: number;
  signalLevel: 'Minat tinggi' | 'Minat sedang' | 'Minat rendah';
  primaryReason: string;
}

/**
 * Calculates deterministic intent score (0 - 100) based strictly on canonical LearningEvent history.
 *
 * Scoring Rules:
 * - learner.enrolled          : +10
 * - 1st lesson.completed      : +10
 * - program.progress_50       : +20
 * - program.progress_80       : +20
 * - program.completed         : +20
 * - cta.clicked               : +20
 */
export function evaluateIntentFromEvents(
  events: LearningEvent[],
  latestReflectionQuote?: string
): ScoreEvaluationResult {
  let score = 0;
  const eventTypes = new Set(events.map(e => e.eventType));

  if (eventTypes.has('learner.enrolled')) score += 10;
  if (eventTypes.has('lesson.completed')) score += 10;
  if (eventTypes.has('program.progress_50')) score += 20;
  if (eventTypes.has('program.progress_80')) score += 20;
  if (eventTypes.has('program.completed')) score += 20;
  if (eventTypes.has('cta.clicked')) score += 20;

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(0, score));

  // Determine signal level
  let signalLevel: 'Minat tinggi' | 'Minat sedang' | 'Minat rendah' = 'Minat rendah';
  if (score >= 60) {
    signalLevel = 'Minat tinggi';
  } else if (score >= 30) {
    signalLevel = 'Minat sedang';
  }

  // Determine primary reason
  let primaryReason = 'Baru mendaftar program';
  if (eventTypes.has('program.completed')) {
    primaryReason = 'Program selesai';
  } else if (eventTypes.has('cta.clicked')) {
    primaryReason = 'Mengklik tombol Call-to-Action';
  } else if (eventTypes.has('program.progress_80')) {
    primaryReason = 'Mencapai progres 80%';
  } else if (eventTypes.has('program.progress_50')) {
    primaryReason = 'Mencapai progres 50%';
  } else if (latestReflectionQuote && /HP|gadget|gawai/i.test(latestReflectionQuote)) {
    primaryReason = 'Refleksi menyebut kendala penggunaan HP';
  } else if (eventTypes.has('lesson.completed')) {
    primaryReason = 'Aktif menyelesaikan sesi pelajaran';
  }

  return { intentScore: score, signalLevel, primaryReason };
}
