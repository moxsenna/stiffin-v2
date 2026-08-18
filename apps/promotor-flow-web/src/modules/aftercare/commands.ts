import { AftercareRepositoryPort, AftercareOutcome } from './ports';
import { NextActionRepositoryPort } from '../next-actions/ports';
import { ActivityRepositoryPort } from '../activities/ports';
import { AFTERCARE_OPTIONS } from './queries';
import { ClockPort } from '../clock/ports';

export function createAftercareCommands(
  aftercareRepo: AftercareRepositoryPort,
  actionRepo: NextActionRepositoryPort,
  activityRepo: ActivityRepositoryPort,
  clock: ClockPort
) {
  return {
    async completeAftercare(
      actionId: string,
      outcome: AftercareOutcome,
      notes?: string,
      contactId?: string,
      organizationId?: string
    ): Promise<void> {
      // Direct single call to repository port (HTTP mode makes 1 atomic POST /api/v1/flow/next-actions/:id/aftercare-complete)
      await aftercareRepo.completeAftercare({
        actionId,
        outcome,
        notes,
        contactId,
        organizationId,
      });

      // In mock dev/demo mode, simulate client-side follow-ons and activity logging
      if (process.env.NEXT_PUBLIC_API_MODE !== 'http' && contactId && organizationId) {
        const outcomeObj = AFTERCARE_OPTIONS.find((o) => o.outcome === outcome);
        const outcomeLabel = outcomeObj ? outcomeObj.label : outcome;

        if (outcome === 'CONTACT_LATER') {
          const due30 = clock.addDays(clock.now(), 30).toISOString();
          await actionRepo.createNextAction({
            organizationId,
            contactId,
            actionType: 'FOLLOW_UP',
            title: 'Follow-up berkala aftercare (30 Hari)',
            subtitle: 'Klien minta dihubungi kembali',
            dueAt: due30,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
          });
        } else if (outcome === 'NEEDS_FOLLOW_ON_SESSION') {
          const due3 = clock.addDays(clock.now(), 3).toISOString();
          await actionRepo.createNextAction({
            organizationId,
            contactId,
            actionType: 'FOLLOW_UP',
            title: 'Tawarkan sesi konsultasi / program lanjutan',
            subtitle: 'Klien tertarik sesi lanjutan',
            dueAt: due3,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
          });
        }

        await activityRepo.appendActivity({
          organizationId,
          contactId,
          title: `Aftercare selesai: ${outcomeLabel}`,
          detail: notes ? `Catatan: ${notes}` : undefined,
          timestamp: clock.nowIso(),
          type: 'AFTERCARE_COMPLETED',
        });
      }
    },
  };
}
