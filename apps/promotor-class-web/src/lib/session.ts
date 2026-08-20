export interface LearnerSessionContext {
  contactId: string;
  workspaceSlug: string;
}

const SESSION_KEY_V2 = 'promotor_class_learner_session_v2';
const LAST_PUBLIC_WORKSPACE_KEY = 'promotor_class_last_public_workspace';

// In-memory fallback for non-browser/test environments
let inMemoryLearnerSession: LearnerSessionContext | null = null;

// Helper to safely get active session without tenant guessing
export function getActiveLearnerSession(): LearnerSessionContext | null {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SESSION_KEY_V2);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.contactId === 'string' && typeof parsed.workspaceSlug === 'string' && parsed.workspaceSlug.trim()) {
          return {
            contactId: parsed.contactId.trim(),
            workspaceSlug: parsed.workspaceSlug.trim(),
          };
        }
      }

      // Legacy contactId migration: ONLY migrate if explicit last public workspace exists
      const legacyId = localStorage.getItem('promotor_class_learner_session_v1');
      const lastPublic = localStorage.getItem(LAST_PUBLIC_WORKSPACE_KEY);
      if (legacyId && lastPublic && lastPublic.trim()) {
        const migrated: LearnerSessionContext = { contactId: legacyId.trim(), workspaceSlug: lastPublic.trim() };
        localStorage.setItem(SESSION_KEY_V2, JSON.stringify(migrated));
        return migrated;
      }
    } catch {
      // Fallback on parse error
    }
  }

  return inMemoryLearnerSession;
}

export function getActiveLearnerContactId(): string | null {
  return getActiveLearnerSession()?.contactId || null;
}

export function getActiveLearnerWorkspaceSlug(): string | null {
  return getActiveLearnerSession()?.workspaceSlug || null;
}

export function setActiveLearnerSession(session: LearnerSessionContext): void {
  if (!session.contactId || !session.workspaceSlug) return;

  const sanitized: LearnerSessionContext = {
    contactId: session.contactId.trim(),
    workspaceSlug: session.workspaceSlug.trim(),
  };

  inMemoryLearnerSession = sanitized;

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY_V2, JSON.stringify(sanitized));
    localStorage.setItem(LAST_PUBLIC_WORKSPACE_KEY, sanitized.workspaceSlug);
  }
}

export function clearActiveLearnerSession(): void {
  inMemoryLearnerSession = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY_V2);
    localStorage.removeItem('promotor_class_learner_session_v1');
  }
}

export function setLastPublicWorkspaceSlug(slug: string): void {
  if (typeof window !== 'undefined' && slug && slug.trim()) {
    localStorage.setItem(LAST_PUBLIC_WORKSPACE_KEY, slug.trim());
  }
}

export function getLastPublicWorkspaceSlug(): string | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LAST_PUBLIC_WORKSPACE_KEY);
    return stored && stored.trim() ? stored.trim() : null;
  }
  return null;
}

/**
 * Navigation workspace priority:
 * 1. explicit route workspaceSlug
 * 2. active learner session workspaceSlug
 * 3. last public workspaceSlug
 * 4. null (no workspace, DO NOT guess/invent default)
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
