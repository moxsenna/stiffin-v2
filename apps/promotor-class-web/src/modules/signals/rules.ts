import { MinatStatus } from '@promotor/contracts';

export interface SignalEvaluationResult {
  minatStatus: MinatStatus;
  primaryReason: string;
  intentScoreNumeric: number;
}

export function evaluateSignalRules(
  progressPercent: number,
  hasCompletedProgram: boolean,
  hasClickedCta: boolean,
  lastReflectionText?: string
): SignalEvaluationResult {
  if (hasCompletedProgram || hasClickedCta) {
    return {
      minatStatus: 'Minat tinggi',
      primaryReason: hasClickedCta ? 'CTA sesi diklik' : 'Program selesai',
      intentScoreNumeric: 95,
    };
  }

  if (lastReflectionText && lastReflectionText.toLowerCase().includes('hp')) {
    return {
      minatStatus: 'Minat sedang',
      primaryReason: 'Refleksi menyebut konflik penggunaan HP',
      intentScoreNumeric: 75,
    };
  }

  if (progressPercent >= 50) {
    return {
      minatStatus: 'Minat sedang',
      primaryReason: `Menyelesaikan ${progressPercent}% materi`,
      intentScoreNumeric: 65,
    };
  }

  return {
    minatStatus: 'Minat rendah',
    primaryReason: 'Belum tes & baru memulai',
    intentScoreNumeric: 35,
  };
}
