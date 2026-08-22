import { Reflection } from '@promotor/contracts';
import { ReflectionRepositoryPort } from '@/modules/reflections/ports';
import { MockStateStore } from './mock-state-store';

export class MockReflectionRepository implements ReflectionRepositoryPort {
  async getReflections(): Promise<Reflection[]> {
    return MockStateStore.getState().reflections;
  }

  async getReflectionById(id: string): Promise<Reflection | undefined> {
    return MockStateStore.getState().reflections.find((r) => r.id === id);
  }

  async getReflectionsByEnrollmentId(enrollmentId: string): Promise<Reflection[]> {
    return MockStateStore.getState().reflections.filter((r) => r.enrollmentId === enrollmentId);
  }

  async createReflection(
    organizationId: string,
    enrollmentId: string,
    lessonId: string,
    contactId: string,
    answerText: string
  ): Promise<Reflection> {
    const newRef: Reflection = {
      id: `ref-${Date.now()}`,
      organizationId,
      enrollmentId,
      lessonId,
      contactId,
      reflectionType: 'long_text',
      answerText,
      submittedAt: new Date().toISOString(),
    };
    MockStateStore.updateState((s) => ({
      ...s,
      reflections: [...s.reflections, newRef],
    }));
    return newRef;
  }
}
