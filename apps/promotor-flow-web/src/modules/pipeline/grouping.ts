import { ContactLifecycleStage } from '@promotor/contracts';

export const PIPELINE_STAGES: ContactLifecycleStage[] = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'FOLLOW_UP',
  'BOOKED',
  'COMPLETED',
  'LOST',
];

export const STAGE_LABELS: Record<ContactLifecycleStage, string> = {
  NEW: 'Lead Baru',
  CONTACTED: 'Terhubung',
  INTERESTED: 'Tertarik',
  FOLLOW_UP: 'Follow-up',
  BOOKED: 'Jadwal Dibuat',
  COMPLETED: 'Tes Selesai',
  LOST: 'Lost',
};

export function groupContactsByStage<T extends { stage: ContactLifecycleStage }>(
  contacts: T[]
): Record<ContactLifecycleStage, T[]> {
  const grouped = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, []])) as unknown as Record<
    ContactLifecycleStage,
    T[]
  >;
  for (const c of contacts) {
    if (grouped[c.stage]) {
      grouped[c.stage].push(c);
    }
  }
  return grouped;
}
