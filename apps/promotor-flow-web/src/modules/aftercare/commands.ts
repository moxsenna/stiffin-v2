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
      organizationId: string,
      contactId: string,
      actionId: string,
      outcome: AftercareOutcome,
      notes?: string
    ): Promise<void> {
      await aftercareRepo.recordOutcome(contactId, outcome, notes);

      // Complete current aftercare action
      await actionRepo.updateNextAction(actionId, {
        status: 'COMPLETED',
        completedAt: clock.nowIso(),
      });

      const outcomeObj = AFTERCARE_OPTIONS.find((o) => o.outcome === outcome);
      const outcomeLabel = outcomeObj ? outcomeObj.label : outcome;

      // Handle follow-on schedules based on outcome
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

      // Log activity
      await activityRepo.appendActivity({
        organizationId,
        contactId,
        title: `Aftercare D+7 Selesai (${outcomeLabel})`,
        detail: notes ? `Catatan: ${notes}` : undefined,
        timestamp: clock.nowIso(),
        type: 'AFTERCARE_COMPLETED',
      });
    },
  };
}
