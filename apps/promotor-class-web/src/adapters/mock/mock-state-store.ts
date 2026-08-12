import {
  Program,
  Enrollment,
  Contact,
  Reflection,
  LearningSignal,
  IntegrationEventEnvelope,
  FlowNextActionRef,
  ProductEntitlements,
  IntegrationHealth,
} from '@promotor/contracts';
import {
  SEED_ORGANIZATION,
  SEED_PROMOTOR_USER,
  SEED_CONTACTS,
  SEED_PROGRAMS,
  SEED_ENROLLMENTS,
  SEED_REFLECTIONS,
  SEED_SIGNALS,
} from '@promotor/promotor-class-fixtures';

const LOCAL_STORAGE_KEY = 'promotor_class_mock_state_v1';

export interface ClassMockState {
  organization: typeof SEED_ORGANIZATION;
  user: typeof SEED_PROMOTOR_USER;
  contacts: Contact[];
  programs: Program[];
  enrollments: Enrollment[];
  reflections: Reflection[];
  learningSignals: LearningSignal[];
  integrationOutbox: IntegrationEventEnvelope[];
  flowNextActionRefs: FlowNextActionRef[];
  entitlements: ProductEntitlements;
  integrationHealth: IntegrationHealth;
  // NOTE: nextActions[] IS INTENTIONALLY FORBIDDEN IN CLASS MOCK STORE.
  // PromotorFlow is the sole canonical owner of nextActions.
}

const DEFAULT_STATE: ClassMockState = {
  organization: SEED_ORGANIZATION,
  user: SEED_PROMOTOR_USER,
  contacts: SEED_CONTACTS,
  programs: SEED_PROGRAMS,
  enrollments: SEED_ENROLLMENTS,
  reflections: SEED_REFLECTIONS,
  learningSignals: SEED_SIGNALS,
  integrationOutbox: [],
  flowNextActionRefs: [],
  entitlements: {
    hasPromotorClass: true,
    hasPromotorFlow: true,
    integrationMode: 'BUNDLE_AVAILABLE',
  },
  integrationHealth: {
    status: 'healthy',
    lastSyncedAt: new Date().toISOString(),
    pendingOutboxCount: 0,
  },
};

class MockStateStoreManager {
  private state: ClassMockState;

  constructor() {
    this.state = this.loadStateFromStorage();
  }

  private loadStateFromStorage(): ClassMockState {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      const parsed = JSON.parse(raw);
      // Verify schema guardrail: ensure no canonical nextActions collection is present
      if ('nextActions' in parsed) {
        delete parsed.nextActions;
      }
      return { ...DEFAULT_STATE, ...parsed };
    } catch {
      return DEFAULT_STATE;
    }
  }

  private saveStateToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.error('Failed to save mock state to LocalStorage:', err);
    }
  }

  public getState(): ClassMockState {
    return this.state;
  }

  public updateState(updater: (currentState: ClassMockState) => ClassMockState): ClassMockState {
    this.state = updater(this.state);
    // Hard guardrail check
    if ('nextActions' in (this.state as unknown as Record<string, unknown>)) {
      throw new Error('FORBIDDEN: PromotorClass MockStateStore cannot contain canonical nextActions collection!');
    }
    this.saveStateToStorage();
    return this.state;
  }

  public resetDemo(): void {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveStateToStorage();
  }
}

export const MockStateStore = new MockStateStoreManager();
