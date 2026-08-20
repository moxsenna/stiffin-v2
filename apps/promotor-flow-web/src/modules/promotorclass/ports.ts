import {
  ProductEntitlements,
  LearningContext,
  EnrollContactInput,
  EnrollmentRef,
  ProgramSummary,
  EligibleProgramsInput,
  EnrollmentStatus,
  PromotorClassAdapter,
} from '@promotor/contracts';

export type DemoScenarioPreset = 'FLOW_ONLY' | 'BUNDLE_AVAILABLE' | 'BUNDLE_CLASS_UNAVAILABLE';

export type FlowIntegrationHealth = {
  promotorClass: 'AVAILABLE' | 'UNAVAILABLE';
};

export interface PromotorClassAdapterPort extends PromotorClassAdapter {
  getEntitlementsAndHealth(): Promise<{
    entitlements: ProductEntitlements;
    integrationHealth: FlowIntegrationHealth;
    scenarioPreset?: DemoScenarioPreset;
  }>;
  setDemoScenario?(preset: DemoScenarioPreset): Promise<void>;
}
