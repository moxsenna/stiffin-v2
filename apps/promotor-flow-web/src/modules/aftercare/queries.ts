import { AftercareOutcomeOption } from './ports';

export const AFTERCARE_OPTIONS: AftercareOutcomeOption[] = [
  {
    outcome: 'NO_FURTHER_NEED',
    label: 'Tidak perlu tindak lanjut',
    description: 'Klien sudah memahami hasil tes dengan baik dan tidak ada pertanyaan tambahan.',
  },
  {
    outcome: 'HAS_QUESTION',
    label: 'Ada pertanyaan',
    description: 'Klien masih butuh penjelasan tambahan tentang penerapan hasil tes.',
  },
  {
    outcome: 'NEEDS_FOLLOW_ON_SESSION',
    label: 'Butuh sesi lanjutan',
    description: 'Klien ingin mengambil sesi konsultasi parenting lanjutan atau tes keluarga.',
  },
  {
    outcome: 'CONTACT_LATER',
    label: 'Hubungi lagi nanti',
    description: 'Klien minta dihubungi kembali dalam beberapa minggu/bulan.',
  },
];

export function createAftercareQueries() {
  return {
    getAftercareOptions(): AftercareOutcomeOption[] {
      return AFTERCARE_OPTIONS;
    },
  };
}
