// Offline Manager for Promotor Class PWA using CacheStorage & LocalStorage

const OFFLINE_CACHE_NAME = 'ralivo-class-offline-modules-v1';
const OFFLINE_INDEX_KEY = 'ralivo_offline_lesson_index';

export interface OfflineLessonRecord {
  lessonId: string;
  enrollmentId: string;
  title: string;
  textContent: string | null;
  videoUrl: string | null;
  downloadedAt: string;
  sizeBytes?: number;
}

function getIndex(): Record<string, OfflineLessonRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OFFLINE_INDEX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveIndex(idx: Record<string, OfflineLessonRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_INDEX_KEY, JSON.stringify(idx));
  } catch (err) {
    console.warn('[OfflineManager] Failed to save offline index:', err);
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('[OfflineManager] Service worker registration failed:', err);
    return null;
  }
}

export async function downloadLessonForOffline(
  enrollmentId: string,
  lessonId: string,
  lessonData?: Partial<OfflineLessonRecord>
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const record: OfflineLessonRecord = {
    lessonId,
    enrollmentId,
    title: lessonData?.title || `Materi ${lessonId}`,
    textContent: lessonData?.textContent || null,
    videoUrl: lessonData?.videoUrl || null,
    downloadedAt: new Date().toISOString(),
  };

  try {
    // 1. Save metadata into index
    const idx = getIndex();
    idx[lessonId] = record;
    saveIndex(idx);

    // 2. Cache in CacheStorage if available
    if ('caches' in window) {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const url = `/offline/lessons/${lessonId}`;
      const response = new Response(JSON.stringify(record), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(url, response);
    }

    return true;
  } catch (err) {
    console.error('[OfflineManager] downloadLessonForOffline failed:', err);
    return false;
  }
}

export async function isLessonAvailableOffline(lessonId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const idx = getIndex();
  if (Boolean(idx[lessonId])) return true;

  if ('caches' in window) {
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const res = await cache.match(`/offline/lessons/${lessonId}`);
      return Boolean(res);
    } catch {
      return false;
    }
  }

  return false;
}

export async function getOfflineLesson(lessonId: string): Promise<OfflineLessonRecord | null> {
  if (typeof window === 'undefined') return null;
  const idx = getIndex();
  if (idx[lessonId]) return idx[lessonId];

  if ('caches' in window) {
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const res = await cache.match(`/offline/lessons/${lessonId}`);
      if (res) {
        return (await res.json()) as OfflineLessonRecord;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function removeOfflineLesson(lessonId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const idx = getIndex();
  delete idx[lessonId];
  saveIndex(idx);

  if ('caches' in window) {
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      await cache.delete(`/offline/lessons/${lessonId}`);
    } catch (err) {
      console.warn('[OfflineManager] removeOfflineLesson error:', err);
    }
  }
}
