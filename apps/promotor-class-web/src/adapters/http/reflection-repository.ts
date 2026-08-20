import { PromotorApiClient } from '@promotor/api-client';
import { Reflection } from '@promotor/contracts';
import { ReflectionRepositoryPort } from '@/modules/reflections/ports';

export class HttpReflectionRepository implements ReflectionRepositoryPort {
  constructor(private readonly client: PromotorApiClient) {}

  async getReflections(): Promise<Reflection[]> {
    const res = await this.client.listClassReflections();
    return res.reflections as unknown as Reflection[];
  }

  async getReflectionById(id: string): Promise<Reflection | undefined> {
    const reflections = await this.getReflections();
    return reflections.find((r) => r.id === id);
  }

  async getReflectionsByEnrollmentId(enrollmentId: string): Promise<Reflection[]> {
    const reflections = await this.getReflections();
    return reflections.filter((r) => r.enrollmentId === enrollmentId);
  }

  async createReflection(
    organizationId: string,
    enrollmentId: string,
    lessonId: string,
    contactId: string,
    answerText: string
  ): Promise<Reflection> {
    const res = await this.client.submitLearnerReflection(enrollmentId, lessonId, {
      responseText: answerText,
    });
    return {
      id: crypto.randomUUID(),
      organizationId,
      enrollmentId,
      lessonId,
      contactId,
      reflectionType: 'long_text',
      answerText: res.responseText || answerText,
      submittedAt: res.submittedAt,
    };
  }
}
