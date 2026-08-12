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

import { PublicWorkspaceProfile, ProgramPublicPresentation } from '@/modules/public-storefront/types';

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
  programPresentations: Record<string, ProgramPublicPresentation>;
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
  programPresentations: {},
};

export class MockStateStore {
  private static state: ClassMockState = MockStateStore.loadInitialState();
  private static listeners: Array<() => void> = [];

  private static loadInitialState(): ClassMockState {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Clean any accidental nextActions if corrupt state was stored
        if (parsed && 'nextActions' in parsed) {
          delete parsed.nextActions;
        }
        return {
          ...DEFAULT_STATE,
          ...parsed,
          workspaceProfiles: {
            ...DEFAULT_STATE.workspaceProfiles,
            ...(parsed.workspaceProfiles || {}),
          },
          programPresentations: {
            ...DEFAULT_STATE.programPresentations,
            ...(parsed.programPresentations || {}),
          },
        };
      }
    } catch (e) {
      console.warn('Failed to parse localStorage mock state, resetting to default:', e);
    }
    return DEFAULT_STATE;
  }

  public static getState(): ClassMockState {
    return this.state;
  }

  public static updateState(updater: (current: ClassMockState) => ClassMockState): void {
    const nextState = updater(this.state);
    // Enforce strict architecture invariant: nextActions MUST NOT exist in Class Mock Store
    if ('nextActions' in nextState) {
      delete (nextState as Record<string, unknown>).nextActions;
    }
    this.state = nextState;
    this.saveState();
    this.notify();
  }

  private static saveState(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Failed to save mock state to localStorage:', e);
      }
    }
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(): void {
    this.listeners.forEach(l => l());
  }

  public static resetDemo(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem('promotor_class_learner_session_v1');
      localStorage.removeItem('promotor_class_learner_session_v2');
      localStorage.removeItem('promotor_class_last_public_workspace');
    }
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState();
    this.notify();
  }
}
