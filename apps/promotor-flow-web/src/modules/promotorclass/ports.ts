import { ProductEntitlements } from '@promotor/contracts';

export type DemoScenarioPreset = 'FLOW_ONLY' | 'BUNDLE_AVAILABLE' | 'BUNDLE_CLASS_UNAVAILABLE';

export type FlowIntegrationHealth = {
  promotorClass: 'AVAILABLE' | 'UNAVAILABLE';
};

export type FlowLearningContext = {
  contactId: string;
  activeEnrollments: Array<{
    enrollmentId: string;
    programId: string;
    programTitle: string;
    progressPercent: number;
    learningStatus: string;
    intentLabel: 'cold' | 'warm' | 'hot';
    lastActivityAt: string | null;
  }>;
  recentSignals: Array<{
    type: string;
    reason: string;
    priority: number;
    createdAt: string;
  }>;
};

export interface PromotorClassAdapterPort {
  getEntitlementsAndHealth(): Promise<{
    entitlements: ProductEntitlements;
    integrationHealth: FlowIntegrationHealth;
    scenarioPreset: DemoScenarioPreset;
  }>;
  setDemoScenario(preset: DemoScenarioPreset): Promise<void>;
  getLearningContext(contactId: string): Promise<FlowLearningContext | null>;
  enrollContact(contactId: string, programId: string): Promise<{ enrollmentId: string }>;
}
