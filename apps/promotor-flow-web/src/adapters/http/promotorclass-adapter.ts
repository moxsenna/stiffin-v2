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
  private integrationHealth: FlowIntegrationHealth = { promotorClass: 'AVAILABLE' };
  private entitlements: ProductEntitlements = { promotorFlow: true, promotorClass: true };

  constructor(private api: PromotorFlowApiClient) {}

  async getEntitlementsAndHealth(): Promise<{
    entitlements: ProductEntitlements;
    integrationHealth: FlowIntegrationHealth;
    scenarioPreset: DemoScenarioPreset;
  }> {
    if (this.scenarioPreset === 'FLOW_ONLY') {
      return {
        entitlements: { promotorFlow: true, promotorClass: false },
        integrationHealth: { promotorClass: 'AVAILABLE' },
        scenarioPreset: this.scenarioPreset,
      };
    }

    if (this.scenarioPreset === 'BUNDLE_CLASS_UNAVAILABLE') {
      return {
        entitlements: { promotorFlow: true, promotorClass: true },
        integrationHealth: { promotorClass: 'UNAVAILABLE' },
        scenarioPreset: this.scenarioPreset,
      };
    }

    return {
      entitlements: this.entitlements,
      integrationHealth: this.integrationHealth,
      scenarioPreset: this.scenarioPreset,
    };
  }

  async setDemoScenario(preset: DemoScenarioPreset): Promise<void> {
    this.scenarioPreset = preset;
    if (preset === 'FLOW_ONLY') {
      this.entitlements.promotorClass = false;
      this.integrationHealth.promotorClass = 'AVAILABLE';
    } else if (preset === 'BUNDLE_CLASS_UNAVAILABLE') {
      this.entitlements.promotorClass = true;
      this.integrationHealth.promotorClass = 'UNAVAILABLE';
    } else {
      this.entitlements.promotorClass = true;
      this.integrationHealth.promotorClass = 'AVAILABLE';
    }
  }

  async getLearningContext(contactId: string): Promise<LearningContext> {
    const { entitlements, integrationHealth } = await this.getEntitlementsAndHealth();

    if (!entitlements.promotorClass) {
      return {
        contactId,
        activeEnrollments: [],
        recentSignals: [],
      };
    }

    if (integrationHealth.promotorClass === 'UNAVAILABLE') {
      throw new Error('PromotorClass service is currently unavailable.');
    }

    try {
      const res = await this.api.getContactLearningContext(contactId);
      this.integrationHealth.promotorClass = 'AVAILABLE';
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
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      // 404 means no learning record for contact
      if (status === 404) {
        return {
          contactId,
          activeEnrollments: [],
          recentSignals: [],
        };
      }
      if (status === 403) {
        this.entitlements.promotorClass = false;
        return {
          contactId,
          activeEnrollments: [],
          recentSignals: [],
        };
      }
      // Outage/5xx/Network failure: update health and throw
      this.integrationHealth.promotorClass = 'UNAVAILABLE';
      throw new Error(`PromotorClass service is currently unavailable: ${err?.message || String(err)}`);
    }
  }

  async listEligiblePrograms(input: EligibleProgramsInput): Promise<ProgramSummary[]> {
    const { entitlements, integrationHealth } = await this.getEntitlementsAndHealth();

    if (!entitlements.promotorClass) {
      return [];
    }

    if (integrationHealth.promotorClass === 'UNAVAILABLE') {
      throw new Error('PromotorClass service is currently unavailable.');
    }

    try {
      const res = await this.api.listEligiblePrograms(input?.category);
      this.integrationHealth.promotorClass = 'AVAILABLE';
      return (res.programs || []).map((p) => ({
        programId: p.id,
        title: p.title,
        programType: (p.programType as any) || 'course',
        pricing: (p.pricing as any) || 'free',
        priceAmount: p.priceAmount,
      }));
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 403) {
        this.entitlements.promotorClass = false;
        return [];
      }
      this.integrationHealth.promotorClass = 'UNAVAILABLE';
      throw new Error(`PromotorClass service is currently unavailable: ${err?.message || String(err)}`);
    }
  }

  async enrollContact(input: EnrollContactInput): Promise<EnrollmentRef> {
    const { entitlements, integrationHealth } = await this.getEntitlementsAndHealth();

    if (!entitlements.promotorClass || integrationHealth.promotorClass === 'UNAVAILABLE') {
      throw new Error('PromotorClass service is currently unavailable.');
    }

    try {
      const res = await this.api.createManualEnrollment({
        programId: input.programId,
        contactId: input.contactId,
      });
      this.integrationHealth.promotorClass = 'AVAILABLE';
      return {
        enrollmentId: res.enrollment.id,
        programId: res.enrollment.programId,
        contactId: res.enrollment.contactId,
        status: res.enrollment.status,
        enrolledAt: res.enrollment.enrolledAt,
      };
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 403) {
        this.entitlements.promotorClass = false;
      } else if (!status || status >= 500) {
        this.integrationHealth.promotorClass = 'UNAVAILABLE';
      }
      throw err;
    }
  }

  async getEnrollmentStatus(contactId: string, programId: string): Promise<EnrollmentStatus | null> {
    const { entitlements, integrationHealth } = await this.getEntitlementsAndHealth();

    if (!entitlements.promotorClass) {
      return null;
    }

    if (integrationHealth.promotorClass === 'UNAVAILABLE') {
      throw new Error('PromotorClass service is currently unavailable.');
    }

    try {
      const res = await this.api.listClassEnrollments({ contactId, programId });
      this.integrationHealth.promotorClass = 'AVAILABLE';
      const enr = res.enrollments?.[0];
      if (!enr) return null;
      return {
        enrollmentId: enr.id,
        status: enr.status === 'COMPLETED' ? 'selesai' : enr.status === 'CANCELLED' ? 'dibatalkan' : 'aktif',
        progressPercent: enr.progressPercent,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt ?? undefined,
      };
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 404) return null;
      if (status === 403) {
        this.entitlements.promotorClass = false;
        return null;
      }
      this.integrationHealth.promotorClass = 'UNAVAILABLE';
      throw new Error(`PromotorClass service is currently unavailable: ${err?.message || String(err)}`);
    }
  }
}
