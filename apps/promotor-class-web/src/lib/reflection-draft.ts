const KEY_PREFIX = 'reflection_draft:';

export function buildReflectionDraftKey(enrollmentId: string, lessonId: string): string {
  return `${KEY_PREFIX}${enrollmentId}:${lessonId}`;
}

export function saveReflectionDraft(key: string, text: string): void {
  try {
    if (text.trim().length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, text);
    }
  } catch {
    // storage penuh / private mode — draft hilang itu ok, jangan ganggu belajar
  }
}

export function loadReflectionDraft(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function clearReflectionDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // abaikan
  }
}
