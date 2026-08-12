import { PromotorClassAdapterPort, DemoScenarioPreset, FlowIntegrationHealth, FlowLearningContext } from '@/modules/promotorclass/ports';
import { ProductEntitlements } from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';

export class MockPromotorClassAdapter implements PromotorClassAdapterPort {
  constructor(private store: MockStateStore) {}

  async getEntitlementsAndHealth(): Promise<{
    entitlements: ProductEntitlements;
    integrationHealth: FlowIntegrationHealth;
    scenarioPreset: DemoScenarioPreset;
  }> {
    const preset = this.store.getScenarioPreset();

    if (preset === 'FLOW_ONLY') {
      return {
        entitlements: { promotorFlow: true, promotorClass: false },
        integrationHealth: { promotorClass: 'AVAILABLE' },
        scenarioPreset: preset,
      };
    }

    if (preset === 'BUNDLE_CLASS_UNAVAILABLE') {
      return {
        entitlements: { promotorFlow: true, promotorClass: true },
        integrationHealth: { promotorClass: 'UNAVAILABLE' },
        scenarioPreset: preset,
      };
    }

    // BUNDLE_AVAILABLE default
    return {
      entitlements: { promotorFlow: true, promotorClass: true },
      integrationHealth: { promotorClass: 'AVAILABLE' },
      scenarioPreset: preset,
    };
  }

  async setDemoScenario(preset: DemoScenarioPreset): Promise<void> {
    this.store.setScenarioPreset(preset);
  }

  async getLearningContext(contactId: string): Promise<FlowLearningContext | null> {
    const { entitlements, integrationHealth } = await this.getEntitlementsAndHealth();

    // If Class entitlement not active, return null
    if (!entitlements.promotorClass) {
      return null;
    }

    // If Class is UNAVAILABLE, throw/degrade gracefully
    if (integrationHealth.promotorClass === 'UNAVAILABLE') {
      throw new Error('PromotorClass service is currently unavailable.');
    }

    if (contactId === 'contact_ayu') {
      return {
        contactId,
        activeEnrollments: [
          {
            enrollmentId: 'enr_ayu_7hari',
            programId: 'prog_7_hari_belajar',
            programTitle: '7 Hari Mengenal Cara Belajar Anak',
            progressPercent: 100,
            learningStatus: 'selesai',
            intentLabel: 'hot',
            lastActivityAt: '2026-08-12T10:00:00Z',
          },
        ],
        recentSignals: [
          {
            type: 'PROGRAM_COMPLETED',
            reason: 'Menyelesaikan seluruh materi 7 Hari Mengenal Cara Belajar Anak',
            priority: 1,
            createdAt: '2026-08-12T10:00:00Z',
          },
        ],
      };
    }

    if (contactId === 'contact_nina') {
      return {
        contactId,
        activeEnrollments: [
          {
            enrollmentId: 'enr_nina_7hari',
            programId: 'prog_7_hari_belajar',
            programTitle: '7 Hari Mengenal Cara Belajar Anak',
            progressPercent: 66,
            learningStatus: 'aktif',
            intentLabel: 'warm',
            lastActivityAt: '2026-08-12T08:30:00Z',
          },
        ],
        recentSignals: [
          {
            type: 'REFLECTIONS_SUBMITTED',
            reason: 'Refleksi menyebutkan konflik penggunaan HP saat jam belajar',
            priority: 2,
            createdAt: '2026-08-12T08:30:00Z',
          },
        ],
      };
    }

    return null;
  }

  async enrollContact(contactId: string, programId: string): Promise<{ enrollmentId: string }> {
    return {
      enrollmentId: `enr_${contactId}_${programId.substring(0, 8)}`,
    };
  }
}
