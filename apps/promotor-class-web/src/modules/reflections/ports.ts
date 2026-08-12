import { Reflection } from '@promotor/contracts';

export interface ReflectionRepositoryPort {
  getReflections(): Promise<Reflection[]>;
  getReflectionById(id: string): Promise<Reflection | undefined>;
  getReflectionsByEnrollmentId(enrollmentId: string): Promise<Reflection[]>;
  createReflection(
    organizationId: string,
    enrollmentId: string,
    lessonId: string,
    contactId: string,
    answerText: string
  ): Promise<Reflection>;
}
