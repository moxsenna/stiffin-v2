import { PromotorClassAdapterPort, FlowIntegrationHealth } from '@/modules/promotorclass/ports';
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
import { getSession } from '@/lib/auth';

export class HttpPromotorClassAdapter implements PromotorClassAdapterPort {
  constructor(private api: PromotorFlowApiClient) {}

  async getEntitlementsAndHealth(): Promise<{
    entitlements: ProductEntitlements;
    integrationHealth: FlowIntegrationHealth;
  }> {
    const session = await getSession();
    const entitlements: ProductEntitlements = {
      promotorFlow: session?.entitlements?.promotorFlow ?? true,
      promotorClass: session?.entitlements?.promotorClass ?? false,
    };

    let integrationHealth: FlowIntegrationHealth = { promotorClass: 'UNAVAILABLE' };
    try {
      const health = await this.api.getIntegrationHealth();
      integrationHealth = {
        promotorClass: health.promotorClass === 'AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE',
      };
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 401 || status === 403) {
        throw err;
      }
      integrationHealth = { promotorClass: 'UNAVAILABLE' };
    }

    return {
      entitlements,
      integrationHealth,
    };
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
      return {
        contactId,
        activeEnrollments: (res.activeEnrollments || []).map((e) => ({
          enrollmentId: e.enrollmentId,
          programId: e.programId,
          programTitle: e.programTitle,
          progressPercent: e.progressPercent,
          learningStatus: e.learningStatus,
          intentLabel: (e.intentLabel?.toLowerCase() as 'cold' | 'warm' | 'hot') || null as any,
          lastActivityAt: null,
        })),
        recentSignals: (res.recentSignals || []).map((s) => ({
          type: 'LEARNING_SIGNAL',
          reason: s.reason,
          priority: (s as any).priority ?? null,
          createdAt: s.createdAt,
        })),
      };
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 404) {
        return {
          contactId,
          activeEnrollments: [],
          recentSignals: [],
        };
      }
      if (status === 401 || status === 403) {
        throw err;
      }
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
      return (res.programs || []).map((p) => ({
        programId: p.id,
        title: p.title,
        programType: p.programType as any,
        pricing: p.pricing as any,
        priceAmount: p.priceAmount,
      }));
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 401 || status === 403) {
        throw err;
      }
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
      return {
        enrollmentId: res.enrollment.id,
        programId: res.enrollment.programId,
        contactId: res.enrollment.contactId,
        status: res.enrollment.status,
        enrolledAt: res.enrollment.enrolledAt,
      };
    } catch (err: any) {
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
      if (status === 401 || status === 403) {
        throw err;
      }
      throw new Error(`PromotorClass service is currently unavailable: ${err?.message || String(err)}`);
    }
  }
}
