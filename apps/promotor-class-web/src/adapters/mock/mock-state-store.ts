import {
  Program,
  Enrollment,
  Contact,
  Reflection,
  LearningEvent,
  LearningSignal,
  IntegrationOutboxItem,
  FlowNextActionRef,
  ProductEntitlements,
  IntegrationHealth,
} from '@promotor/contracts';
import {
  SEED_ORGANIZATION,
  SEED_CONTACTS,
  SEED_PROGRAMS,
  SEED_ENROLLMENTS,
  SEED_REFLECTIONS,
  SEED_LEARNING_EVENTS,
  SEED_SIGNALS,
} from '@promotor/promotor-class-fixtures';

import { PublicWorkspaceProfile } from '@/modules/public-storefront/types';

const LOCAL_STORAGE_KEY = 'promotor_class_mock_state_v2';

export const INITIAL_RINA_PROFILE: PublicWorkspaceProfile = {
  workspaceSlug: 'rina',
  displayName: 'Rina Prameswari',
  tagline: 'Ruang belajar untuk orang tua',
  headline: 'Belajar memahami anak, tanpa membuat rumah jadi ruang kelas.',
  bio: 'Saya membantu orang tua menerjemahkan hasil tes menjadi kebiasaan yang lebih manusiawi di rumah. Anda tidak harus menghafal banyak teori. Yang penting adalah memahami pola, mencoba satu perubahan kecil, lalu melihat apa yang bekerja untuk keluarga Anda.',
  city: 'Surabaya',
  roleLabel: 'Promotor STIFIn',
  heroProgramId: 'prog_7_hari_belajar',
  whatsappPhoneE164: '+6281234567890',
  stats: {
    programCount: '3 Program Aktif',
    location: 'Surabaya',
  },
};

export interface ClassMockState {
  organization: typeof SEED_ORGANIZATION;
  contacts: Contact[];
  programs: Program[];
  enrollments: Enrollment[];
  reflections: Reflection[];
  learningEvents: LearningEvent[];       // Canonical Class domain history
  learningSignals: LearningSignal[];
  integrationOutbox: IntegrationOutboxItem[]; // Cross-product transport queue
  flowNextActionRefs: FlowNextActionRef[];
  currentLearnerAccess: {
    contactId: string | null;
    workspaceSlug?: string | null;
  };
  entitlements: ProductEntitlements;
  integrationHealth: IntegrationHealth;
  workspaceProfiles: Record<string, PublicWorkspaceProfile>;
  // NOTE: nextActions[] IS INTENTIONALLY FORBIDDEN IN CLASS MOCK STORE.
  // PromotorFlow is the sole canonical owner of nextActions.
}

const DEFAULT_STATE: ClassMockState = {
  organization: SEED_ORGANIZATION,
  contacts: SEED_CONTACTS,
  programs: SEED_PROGRAMS,
  enrollments: SEED_ENROLLMENTS,
  reflections: SEED_REFLECTIONS,
  learningEvents: SEED_LEARNING_EVENTS,
  learningSignals: SEED_SIGNALS,
  integrationOutbox: [],
  flowNextActionRefs: [],
  currentLearnerAccess: {
    contactId: null,
    workspaceSlug: null,
  },
  entitlements: {
    promotorClass: true,
    promotorFlow: true,
  },
  integrationHealth: {
    promotorFlow: 'AVAILABLE',
  },
  workspaceProfiles: {
    rina: INITIAL_RINA_PROFILE,
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
