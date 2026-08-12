import { LifecycleStage } from '@promotor/promotor-flow-fixtures';

export interface StageOption {
  stage: LifecycleStage;
  label: string;
  isTerminal: boolean;
}

export const STAGE_OPTIONS: StageOption[] = [
  { stage: 'NEW', label: 'Baru', isTerminal: false },
  { stage: 'CONTACTED', label: 'Sudah Dikontak', isTerminal: false },
  { stage: 'INTERESTED', label: 'Berminat', isTerminal: false },
  { stage: 'FOLLOW_UP', label: 'Follow-up', isTerminal: false },
  { stage: 'BOOKED', label: 'Sudah Booking', isTerminal: false },
  { stage: 'COMPLETED', label: 'Selesai Layanan', isTerminal: true },
  { stage: 'LOST', label: 'Tidak Lanjut (Lost)', isTerminal: true },
];

export function createLifecycleQueries() {
  return {
    getStageOptions(): StageOption[] {
      return STAGE_OPTIONS;
    },
    getStageLabel(stage: LifecycleStage): string {
      const match = STAGE_OPTIONS.find((s) => s.stage === stage);
      return match ? match.label : stage;
    },
  };
}
