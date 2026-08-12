import { MockStateStore } from '@/adapters/mock/mock-state-store';

export interface LearnerSessionContext {
  contactId: string;
  workspaceSlug: string;
}

const SESSION_KEY_V2 = 'promotor_class_learner_session_v2';
const LAST_PUBLIC_WORKSPACE_KEY = 'promotor_class_last_public_workspace';

// Helper to safely get active session
export function getActiveLearnerSession(): LearnerSessionContext | null {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SESSION_KEY_V2);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.contactId === 'string' && typeof parsed.workspaceSlug === 'string') {
          return parsed;
        }
      }
      // Migrate legacy string contactId if present
      const legacyId = localStorage.getItem('promotor_class_learner_session_v1');
      if (legacyId) {
        const fallbackSlug = localStorage.getItem(LAST_PUBLIC_WORKSPACE_KEY) || 'rina';
        const migrated: LearnerSessionContext = { contactId: legacyId, workspaceSlug: fallbackSlug };
        localStorage.setItem(SESSION_KEY_V2, JSON.stringify(migrated));
        return migrated;
      }
    } catch {
      // Fallback on error
    }
  }

  const mockAccess = MockStateStore.getState().currentLearnerAccess;
  if (mockAccess.contactId) {
    return {
      contactId: mockAccess.contactId,
      workspaceSlug: 'rina',
    };
  }
  return null;
}

export function getActiveLearnerContactId(): string | null {
  return getActiveLearnerSession()?.contactId || null;
}

export function getActiveLearnerWorkspaceSlug(): string | null {
  return getActiveLearnerSession()?.workspaceSlug || null;
}

export function setActiveLearnerSession(session: LearnerSessionContext): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY_V2, JSON.stringify(session));
    localStorage.setItem(LAST_PUBLIC_WORKSPACE_KEY, session.workspaceSlug);
  }
  MockStateStore.updateState(curr => ({
    ...curr,
    currentLearnerAccess: { contactId: session.contactId },
  }));
}

export function clearActiveLearnerSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY_V2);
    localStorage.removeItem('promotor_class_learner_session_v1');
  }
  MockStateStore.updateState(curr => ({
    ...curr,
    currentLearnerAccess: { contactId: null },
  }));
}

export function setLastPublicWorkspaceSlug(slug: string): void {
  if (typeof window !== 'undefined' && slug) {
    localStorage.setItem(LAST_PUBLIC_WORKSPACE_KEY, slug);
  }
}

export function getLastPublicWorkspaceSlug(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(LAST_PUBLIC_WORKSPACE_KEY);
  }
  return null;
}

/**
 * Navigation workspace priority:
 * 1. explicit route workspaceSlug
 * 2. active learner session workspaceSlug
 * 3. last public workspaceSlug
 * 4. null (no workspace)
 */
export function resolveWorkspaceSlug(routeWorkspaceSlug?: string): string | null {
  if (routeWorkspaceSlug && routeWorkspaceSlug.trim()) {
    return routeWorkspaceSlug.trim();
  }
  const session = getActiveLearnerSession();
  if (session?.workspaceSlug) {
    return session.workspaceSlug;
  }
  const lastPublic = getLastPublicWorkspaceSlug();
  if (lastPublic) {
    return lastPublic;
  }
  return null;
}

