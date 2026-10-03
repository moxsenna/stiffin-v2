import { getPlatformApiClient, getApiMode } from '@/adapters';
import type { LessonDiscussionItem } from '@promotor/contracts';

const mockDiscussionsStore = new Map<string, LessonDiscussionItem[]>();

export async function listLessonDiscussionsQuery(
  enrollmentId: string,
  lessonId: string
): Promise<LessonDiscussionItem[]> {
  if (getApiMode() === 'mock') {
    return mockDiscussionsStore.get(lessonId) ?? [];
  }
  try {
    const api = getPlatformApiClient();
    const res = await api.getLessonDiscussions(enrollmentId, lessonId);
    return res.discussions ?? [];
  } catch {
    return mockDiscussionsStore.get(lessonId) ?? [];
  }
}

export async function postLessonDiscussionCommand(
  enrollmentId: string,
  lessonId: string,
  message: string
): Promise<LessonDiscussionItem> {
  if (getApiMode() === 'mock') {
    const existing = mockDiscussionsStore.get(lessonId) ?? [];
    const item: LessonDiscussionItem = {
      id: `disc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      enrollmentId,
      lessonId,
      authorName: 'Peserta',
      authorRole: 'learner',
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };
    existing.push(item);
    mockDiscussionsStore.set(lessonId, existing);
    return item;
  }
  const api = getPlatformApiClient();
  const res = await api.postLessonDiscussion(enrollmentId, lessonId, { message });
  return res.discussion;
}
