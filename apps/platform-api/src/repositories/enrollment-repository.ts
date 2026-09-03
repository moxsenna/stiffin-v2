import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import { enrollments, EnrollmentRow, NewEnrollmentRow } from '../db/schema/enrollments';

export type CreateEnrollmentInput = {
  organizationId: string;
  programId: string;
  contactId: string;
  status?: 'ENROLLED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  enrolledAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  lastActivityAt?: string | null;
  progressPercent?: number;
  intentScore?: number;
  intentLabel?: 'COLD' | 'WARM' | 'HOT';
  learningStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK' | 'ACTIVE' | 'INACTIVE';
};

export type UpdateEnrollmentInput = Partial<{
  status: 'ENROLLED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  progressPercent: number;
  intentScore: number;
  intentLabel: 'COLD' | 'WARM' | 'HOT';
  learningStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK' | 'ACTIVE' | 'INACTIVE';
}>;

export interface EnrollmentRepository {
  findByProgramAndContact(
    organizationId: string,
    programId: string,
    contactId: string
  ): Promise<EnrollmentRow | null>;
  getById(organizationId: string, id: string): Promise<EnrollmentRow | null>;
  findByIdGlobal(id: string): Promise<EnrollmentRow | null>;
  listByContact(organizationId: string, contactId: string): Promise<EnrollmentRow[]>;
  listByProgram(organizationId: string, programId: string): Promise<EnrollmentRow[]>;
  listByOrg(organizationId: string, filter?: { programId?: string; contactId?: string }): Promise<EnrollmentRow[]>;
  create(input: CreateEnrollmentInput): Promise<EnrollmentRow>;
  createIdempotent(input: CreateEnrollmentInput): Promise<{ enrollment: EnrollmentRow; isNew: boolean }>;
  update(organizationId: string, id: string, input: UpdateEnrollmentInput): Promise<EnrollmentRow | null>;
  updateProgress(organizationId: string, id: string, input: UpdateEnrollmentInput): Promise<EnrollmentRow | null>;
}

export function createEnrollmentRepository(db: NodePgDatabase): EnrollmentRepository {
  return {
    async findByProgramAndContact(organizationId: string, programId: string, contactId: string) {
      const rows = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.organizationId, organizationId),
            eq(enrollments.programId, programId),
            eq(enrollments.contactId, contactId)
          )
        );
      return rows[0] ?? null;
    },

    async getById(organizationId: string, id: string) {
      const rows = await db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.organizationId, organizationId), eq(enrollments.id, id)));
      return rows[0] ?? null;
    },

    async findByIdGlobal(id: string) {
      const rows = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.id, id));
      return rows[0] ?? null;
    },

    async listByContact(organizationId: string, contactId: string) {
      return await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.organizationId, organizationId),
            eq(enrollments.contactId, contactId)
          )
        );
    },

    async listByProgram(organizationId: string, programId: string) {
      return await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.organizationId, organizationId),
            eq(enrollments.programId, programId)
          )
        );
    },

    async listByOrg(organizationId: string, filter?: { programId?: string; contactId?: string }) {
      const conds = [eq(enrollments.organizationId, organizationId)];
      if (filter?.programId) conds.push(eq(enrollments.programId, filter.programId));
      if (filter?.contactId) conds.push(eq(enrollments.contactId, filter.contactId));
      return await db
        .select()
        .from(enrollments)
        .where(and(...conds));
    },

    async create(input: CreateEnrollmentInput) {
      const [created] = await db
        .insert(enrollments)
        .values({
          organizationId: input.organizationId,
          programId: input.programId,
          contactId: input.contactId,
          status: input.status ?? 'ENROLLED',
          enrolledAt: input.enrolledAt,
          startedAt: input.startedAt,
          completedAt: input.completedAt,
          lastActivityAt: input.lastActivityAt,
          progressPercent: input.progressPercent ?? 0,
          intentScore: input.intentScore ?? 0,
          intentLabel: input.intentLabel ?? 'COLD',
          learningStatus: input.learningStatus ?? 'NOT_STARTED',
        })
        .returning();
      return created;
    },

    async createIdempotent(input: CreateEnrollmentInput): Promise<{ enrollment: EnrollmentRow; isNew: boolean }> {
      const [inserted] = await db
        .insert(enrollments)
        .values({
          organizationId: input.organizationId,
          programId: input.programId,
          contactId: input.contactId,
          status: input.status ?? 'ENROLLED',
          enrolledAt: input.enrolledAt,
          startedAt: input.startedAt,
          completedAt: input.completedAt,
          lastActivityAt: input.lastActivityAt,
          progressPercent: input.progressPercent ?? 0,
          intentScore: input.intentScore ?? 0,
          intentLabel: input.intentLabel ?? 'COLD',
          learningStatus: input.learningStatus ?? 'NOT_STARTED',
        })
        .onConflictDoNothing({
          target: [enrollments.organizationId, enrollments.programId, enrollments.contactId],
        })
        .returning();

      if (inserted) {
        return { enrollment: inserted, isNew: true };
      }

      const existing = await this.findByProgramAndContact(
        input.organizationId,
        input.programId,
        input.contactId
      );
      if (!existing) {
        throw new Error('Enrollment race resolution failed');
      }
      return { enrollment: existing, isNew: false };
    },

    async update(organizationId: string, id: string, input: UpdateEnrollmentInput) {
      const [updated] = await db
        .update(enrollments)
        .set({
          ...input,
          updatedAt: sql`now()`,
        })
        .where(and(eq(enrollments.organizationId, organizationId), eq(enrollments.id, id)))
        .returning();
      return updated ?? null;
    },

    async updateProgress(organizationId: string, id: string, input: UpdateEnrollmentInput) {
      return this.update(organizationId, id, input);
    },
  };
}

