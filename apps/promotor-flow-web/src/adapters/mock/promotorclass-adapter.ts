import { PromotorClassAdapterPort, DemoScenarioPreset, FlowIntegrationHealth } from '@/modules/promotorclass/ports';
import {
  ProductEntitlements,
  LearningContext,
  EnrollContactInput,
  EnrollmentRef,
  EligibleProgramsInput,
  ProgramSummary,
  EnrollmentStatus,
} from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';

export class MockPromotorClassAdapter implements PromotorClassAdapterPort {
  private enrollments = new Map<string, EnrollmentRef>();

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

  async getLearningContext(contactId: string): Promise<LearningContext> {
    const { entitlements, integrationHealth } = await this.getEntitlementsAndHealth();

    // If Class is UNAVAILABLE, throw/degrade gracefully
    if (integrationHealth.promotorClass === 'UNAVAILABLE') {
      throw new Error('PromotorClass service is currently unavailable.');
    }

    if (contactId === 'contact_ayu' && entitlements.promotorClass) {
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

    if (contactId === 'contact_nina' && entitlements.promotorClass) {
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

    // Default empty LearningContext when contact has no learning activity or entitlement disabled
    return {
      contactId,
      activeEnrollments: [],
      recentSignals: [],
    };
  }

  async listEligiblePrograms(input: EligibleProgramsInput): Promise<ProgramSummary[]> {
    return [
      {
        programId: 'prog_30_hari_setelah_tes',
        title: '30 Hari Setelah Tes STIFIn',
        subtitle: 'Panduan Pendampingan Pasca Tes Biometrik',
        programType: 'aftersales',
        pricing: 'free',
      },
      {
        programId: 'prog_parenting_growth',
        title: 'Parenting Growth Program',
        subtitle: 'Program Pendampingan Orang Tua 3 Bulan',
        programType: 'paid',
        pricing: 'one_time',
        priceAmount: 450000,
      },
    ];
  }

  async enrollContact(input: EnrollContactInput): Promise<EnrollmentRef> {
    const key = input.idempotencyKey || `${input.organizationId}:${input.contactId}:${input.programId}`;
    
    if (this.enrollments.has(key)) {
      return this.enrollments.get(key)!;
    }

    const ref: EnrollmentRef = {
      enrollmentId: `enr_${input.contactId}_${input.programId.substring(0, 8)}`,
      contactId: input.contactId,
      programId: input.programId,
      status: 'aktif',
      enrolledAt: new Date().toISOString(),
    };

    this.enrollments.set(key, ref);
    return ref;
  }

  async getEnrollmentStatus(contactId: string, programId: string): Promise<EnrollmentStatus | null> {
    const key = Array.from(this.enrollments.values()).find(
      (e) => e.contactId === contactId && e.programId === programId
    );

    if (!key) {
      if (contactId === 'contact_ayu' && programId === 'prog_7_hari_belajar') {
        return {
          enrollmentId: 'enr_ayu_7hari',
          status: 'selesai',
          progressPercent: 100,
          enrolledAt: '2026-08-01T10:00:00Z',
          completedAt: '2026-08-08T10:00:00Z',
        };
      }
      return null;
    }

    return {
      enrollmentId: key.enrollmentId,
      status: key.status as any,
      progressPercent: 0,
      enrolledAt: key.enrolledAt,
    };
  }
}
