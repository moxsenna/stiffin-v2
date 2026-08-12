import { LifecycleRepositoryPort } from './ports';
import { LifecycleStage } from '@promotor/promotor-flow-fixtures';
import { ActivityRepositoryPort } from '../activities/ports';

export function createLifecycleCommands(
  lifecycleRepo: LifecycleRepositoryPort,
  activityRepo: ActivityRepositoryPort
) {
  return {
    async changeStage(contactId: string, stage: LifecycleStage, lostReason?: string): Promise<void> {
      if (stage === 'LOST') {
        if (!lostReason || !lostReason.trim()) {
          throw new Error('Alasan tidak lanjut (lost reason) wajib diisi.');
        }
        await lifecycleRepo.updateStage(contactId, 'LOST', lostReason.trim());
        
        // Cancel active actions without deleting them
        await lifecycleRepo.cancelActiveActionsForContact(contactId, `Contact marked LOST: ${lostReason.trim()}`);
        
        // Append activity
        await activityRepo.appendActivity({
          organizationId: 'org_rina_stifin',
          contactId,
          title: 'Kontak ditandai Tidak Lanjut',
          detail: `Alasan: ${lostReason.trim()}`,
          timestamp: new Date().toISOString(),
          type: 'STAGE_CHANGED',
        });
        return;
      }

      await lifecycleRepo.updateStage(contactId, stage);
      await activityRepo.appendActivity({
        organizationId: 'org_rina_stifin',
        contactId,
        title: `Tahap kontak diperbarui ke ${stage}`,
        timestamp: new Date().toISOString(),
        type: 'STAGE_CHANGED',
      });
    },
  };
}
