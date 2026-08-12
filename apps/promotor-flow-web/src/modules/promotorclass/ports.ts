import {
  ProductEntitlements,
  LearningContext,
  EnrollContactInput,
  EnrollmentRef,
  ProgramSummary,
  EligibleProgramsInput,
} from '@promotor/contracts';

export type DemoScenarioPreset = 'FLOW_ONLY' | 'BUNDLE_AVAILABLE' | 'BUNDLE_CLASS_UNAVAILABLE';

export type FlowIntegrationHealth = {
  promotorClass: 'AVAILABLE' | 'UNAVAILABLE';
};

export interface PromotorClassAdapterPort {
  getEntitlementsAndHealth(): Promise<{
    entitlements: ProductEntitlements;
    integrationHealth: FlowIntegrationHealth;
    scenarioPreset: DemoScenarioPreset;
  }>;
  setDemoScenario(preset: DemoScenarioPreset): Promise<void>;
  getLearningContext(contactId: string): Promise<LearningContext | null>;
  listEligiblePrograms(input: EligibleProgramsInput): Promise<ProgramSummary[]>;
  enrollContact(input: EnrollContactInput): Promise<EnrollmentRef>;
}
