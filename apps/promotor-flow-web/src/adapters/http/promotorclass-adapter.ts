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
    const res = await this.api.getContactAssessmentStatus(contactId);
    return {
      contactId,
      activeEnrollments: [],
      recentSignals:
        res.status !== 'NOT_STARTED'
          ? [
              {
                type: 'ASSESSMENT_STATUS',
                reason: `Status Assessment: ${res.status}`,
                priority: 50,
                createdAt: new Date().toISOString(),
              } as any,
            ]
          : [],
    };
  }

  async listEligiblePrograms(_input: EligibleProgramsInput): Promise<ProgramSummary[]> {
    return [];
  }

  async enrollContact(_input: EnrollContactInput): Promise<EnrollmentRef> {
    return {
      enrollmentId: `enr_${Date.now()}`,
      programId: _input.programId,
      contactId: _input.contactId,
      status: 'aktif',
      enrolledAt: new Date().toISOString(),
    };
  }

  async getEnrollmentStatus(_contactId: string, _programId: string): Promise<EnrollmentStatus | null> {
    return null;
  }
}
