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
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpPromotorClassAdapter implements PromotorClassAdapterPort {
  private scenarioPreset: DemoScenarioPreset = 'BUNDLE_AVAILABLE';

  constructor(private api: PromotorFlowApiClient) {}

  async getEntitlementsAndHealth(): Promise<{
    entitlements: ProductEntitlements;
    integrationHealth: FlowIntegrationHealth;
    scenarioPreset: DemoScenarioPreset;
  }> {
    return {
      entitlements: { promotorFlow: true, promotorClass: true },
      integrationHealth: { promotorClass: 'AVAILABLE' },
      scenarioPreset: this.scenarioPreset,
    };
  }

  async setDemoScenario(preset: DemoScenarioPreset): Promise<void> {
    this.scenarioPreset = preset;
  }

  async getLearningContext(contactId: string): Promise<LearningContext> {
    try {
      const res = await this.api.getContactLearningContext(contactId);
      return {
        contactId,
        activeEnrollments: (res.activeEnrollments || []).map((e) => ({
          enrollmentId: e.enrollmentId,
          programId: e.programId,
          programTitle: e.programTitle,
          progressPercent: e.progressPercent,
          learningStatus: e.learningStatus,
          intentLabel: (e.intentLabel?.toLowerCase() as 'cold' | 'warm' | 'hot') || 'cold',
          lastActivityAt: null,
        })),
        recentSignals: (res.recentSignals || []).map((s) => ({
          type: 'LEARNING_SIGNAL',
          reason: s.reason,
          priority: 50,
          createdAt: s.createdAt,
        })),
      };
    } catch {
      return {
        contactId,
        activeEnrollments: [],
        recentSignals: [],
      };
    }
  }

  async listEligiblePrograms(input: EligibleProgramsInput): Promise<ProgramSummary[]> {
    try {
      const res = await this.api.listEligiblePrograms(input?.category);
      return (res.programs || []).map((p) => ({
        programId: p.id,
        title: p.title,
        programType: (p.programType as any) || 'course',
        pricing: (p.pricing as any) || 'free',
        priceAmount: p.priceAmount,
      }));
    } catch {
      return [];
    }
  }

  async enrollContact(input: EnrollContactInput): Promise<EnrollmentRef> {
    const res = await this.api.createManualEnrollment({
      programId: input.programId,
      contactId: input.contactId,
    });
    return {
      enrollmentId: res.enrollment.id,
      programId: res.enrollment.programId,
      contactId: res.enrollment.contactId,
      status: res.enrollment.status,
      enrolledAt: res.enrollment.enrolledAt,
    };
  }

  async getEnrollmentStatus(contactId: string, programId: string): Promise<EnrollmentStatus | null> {
    try {
      const res = await this.api.listClassEnrollments({ contactId, programId });
      const enr = res.enrollments?.[0];
      if (!enr) return null;
      return {
        enrollmentId: enr.id,
        status: enr.status === 'COMPLETED' ? 'selesai' : enr.status === 'CANCELLED' ? 'dibatalkan' : 'aktif',
        progressPercent: enr.progressPercent,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt ?? undefined,
      };
    } catch {
      return null;
    }
  }
}

