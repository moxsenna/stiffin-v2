import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomBytes, createHash } from 'node:crypto';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { DomainError } from '../../core/errors';
import { createOrganizationRepository } from '../../repositories/organization-repository';
import { createProgramRepository } from '../../repositories/program-repository';
import { createContactRepository } from '../../repositories/contact-repository';
import { createEnrollmentRepository, EnrollmentRepository } from '../../repositories/enrollment-repository';
import { createLearnerAccessRepository, LearnerAccessRepository } from '../../repositories/learner-access-repository';
import { createLearningEventRepository, LearningEventRepository } from '../../repositories/learning-event-repository';
import { EnrollmentRow } from '../../db/schema/enrollments';

export interface PublicRegistrationInput {
  slug: string;
  programSlug: string;
  name: string;
  phoneRaw: string;
  email?: string | null;
}

export interface PublicRegistrationResult {
  enrollmentId: string;
  contactId: string;
  organizationId: string;
  programId: string;
  programTitle: string;
  status: string;
  accessToken: string;
  isNewContact: boolean;
}

export interface ManualEnrollmentInput {
  organizationId: string;
  programId: string;
  contactId: string;
}

export interface EnrollmentServiceOptions {
  clock?: () => Date;
  tokenExpiryDays?: number;
  orgRepo?: ReturnType<typeof createOrganizationRepository>;
  programRepo?: ReturnType<typeof createProgramRepository>;
  contactRepo?: ReturnType<typeof createContactRepository>;
  enrollmentRepo?: EnrollmentRepository;
  learnerAccessRepo?: LearnerAccessRepository;
  learningEventRepo?: LearningEventRepository;
}

export interface EnrollmentService {
  registerPublicLearner(input: PublicRegistrationInput): Promise<PublicRegistrationResult>;
  enrollContact(input: ManualEnrollmentInput): Promise<EnrollmentRow>;
  redeemLearnerToken(tokenRaw: string): Promise<{ contactId: string; organizationId: string }>;
  getEnrollmentById(organizationId: string, enrollmentId: string): Promise<EnrollmentRow | null>;
  listEnrollmentsByOrg(organizationId: string, filter?: { programId?: string; contactId?: string }): Promise<EnrollmentRow[]>;
  getLearnerPrograms(contactId: string, organizationId: string): Promise<Array<EnrollmentRow & { programTitle: string; programSlug: string }>>;
}

export function createEnrollmentService(
  db: NodePgDatabase,
  options?: EnrollmentServiceOptions
): EnrollmentService {
  const clock = options?.clock ?? (() => new Date());
  const tokenExpiryDays = options?.tokenExpiryDays ?? 30;

  const orgRepo = options?.orgRepo ?? createOrganizationRepository(db);
  const programRepo = options?.programRepo ?? createProgramRepository(db);
  const contactRepo = options?.contactRepo ?? createContactRepository(db, normalizePhone, normalizeEmail);
  const enrollmentRepo = options?.enrollmentRepo ?? createEnrollmentRepository(db);
  const learnerAccessRepo = options?.learnerAccessRepo ?? createLearnerAccessRepository(db);
  const learningEventRepo = options?.learningEventRepo ?? createLearningEventRepository(db);

  return {
    async registerPublicLearner(input: PublicRegistrationInput): Promise<PublicRegistrationResult> {
      const now = clock();
      const nowIso = now.toISOString();

      if (!input.slug?.trim()) {
        throw new DomainError('VALIDATION_ERROR', 'Slug workspace wajib diisi');
      }
      if (!input.programSlug?.trim()) {
        throw new DomainError('VALIDATION_ERROR', 'Slug program wajib diisi');
      }
      if (!input.name?.trim()) {
        throw new DomainError('VALIDATION_ERROR', 'Nama lengkap wajib diisi');
      }
      if (!input.phoneRaw?.trim()) {
        throw new DomainError('VALIDATION_ERROR', 'Nomor telepon wajib diisi');
      }

      // 1. Resolve Organization by Slug
      const org = await orgRepo.findBySlug(input.slug.trim());
      if (!org) {
        throw new DomainError('NOT_FOUND', 'Workspace promotor tidak ditemukan');
      }

      // 2. Resolve Program by Org & Slug
      const program = await programRepo.findBySlug({ organizationId: org.id }, input.programSlug.trim());
      if (!program) {
        throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
      }

      // 3. Validate Program Access & Publication status
      if (program.status !== 'published') {
        throw new DomainError('FORBIDDEN', 'Program edukasi belum dipublikasikan');
      }
      if (program.accessType !== 'public') {
        throw new DomainError('FORBIDDEN', 'Program ini tidak terbuka untuk pendaftaran publik langsung');
      }
      if (program.pricing === 'one_time') {
        throw new DomainError(
          'PAYMENT_REQUIRED',
          'Program edukasi ini berbayar dan memerlukan pembelian melalui alur checkout',
          {
            programId: program.id,
            pricing: program.pricing,
            priceAmount: program.priceAmount,
          }
        );
      }

      // 4. Check whether contact already exists before matchOrCreate
      const phoneNorm = normalizePhone(input.phoneRaw.trim());
      const existingContact = await contactRepo.findByPhone({ organizationId: org.id }, phoneNorm);
      const isNewContact = !existingContact;

      let contact;
      try {
        contact = await contactRepo.matchOrCreate({
          context: { organizationId: org.id },
          phoneRaw: input.phoneRaw.trim(),
          name: input.name.trim(),
          email: input.email?.trim() || undefined,
        });
      } catch (err: any) {
        throw new DomainError('VALIDATION_ERROR', err?.message || 'Format data kontak tidak valid');
      }

      // 5. Idempotently create or retrieve existing Enrollment
      let isNewEnrollment = false;
      let enrollment = await enrollmentRepo.findByProgramAndContact(org.id, program.id, contact.id);
      if (!enrollment) {
        isNewEnrollment = true;
        enrollment = await enrollmentRepo.create({
          organizationId: org.id,
          programId: program.id,
          contactId: contact.id,
          status: 'ENROLLED',
          enrolledAt: nowIso,
          progressPercent: 0,
          intentScore: 10,
          intentLabel: 'COLD',
          learningStatus: 'NOT_STARTED',
        });
      }

      // 6. Emit canonical events (§16)
      if (isNewContact) {
        await learningEventRepo.create({
          organizationId: org.id,
          enrollmentId: enrollment.id,
          contactId: contact.id,
          eventType: 'learner.registered',
          payload: { programId: program.id, programSlug: program.programSlug },
          occurredAt: nowIso,
        });
      }

      if (isNewEnrollment) {
        await learningEventRepo.create({
          organizationId: org.id,
          enrollmentId: enrollment.id,
          contactId: contact.id,
          eventType: 'learner.enrolled',
          payload: { programId: program.id, programSlug: program.programSlug },
          occurredAt: nowIso,
        });
      }

      // 7. Generate Opaque High-Entropy Learner Access Token
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(now.getTime() + tokenExpiryDays * 24 * 60 * 60 * 1000).toISOString();

      await learnerAccessRepo.createToken({
        organizationId: org.id,
        contactId: contact.id,
        tokenHash,
        expiresAt,
      });

      return {
        enrollmentId: enrollment.id,
        contactId: contact.id,
        organizationId: org.id,
        programId: program.id,
        programTitle: program.title,
        status: enrollment.status,
        accessToken: rawToken,
        isNewContact,
      };
    },

    async enrollContact(input: ManualEnrollmentInput): Promise<EnrollmentRow> {
      const nowIso = clock().toISOString();

      // 1. Verify Contact belongs to organization
      const contact = await contactRepo.findById({ organizationId: input.organizationId }, input.contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Kontak tidak ditemukan pada organisasi ini');
      }

      // 2. Verify Program belongs to organization
      const program = await programRepo.findById({ organizationId: input.organizationId }, input.programId);
      if (!program) {
        throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
      }

      // 3. Idempotently create or reuse Enrollment
      const existing = await enrollmentRepo.findByProgramAndContact(
        input.organizationId,
        input.programId,
        input.contactId
      );
      if (existing) {
        return existing;
      }

      const created = await enrollmentRepo.create({
        organizationId: input.organizationId,
        programId: input.programId,
        contactId: input.contactId,
        status: 'ENROLLED',
        enrolledAt: nowIso,
        progressPercent: 0,
        intentScore: 10,
        intentLabel: 'COLD',
        learningStatus: 'NOT_STARTED',
      });

      // Emit canonical learner.enrolled event (§16)
      await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: created.id,
        contactId: input.contactId,
        eventType: 'learner.enrolled',
        payload: { programId: program.id, manual: true },
        occurredAt: nowIso,
      });

      return created;
    },

    async redeemLearnerToken(tokenRaw: string): Promise<{ contactId: string; organizationId: string }> {
      if (!tokenRaw?.trim()) {
        throw new DomainError('UNAUTHORIZED', 'Token akses learner wajib diisi');
      }

      const tokenHash = createHash('sha256').update(tokenRaw.trim()).digest('hex');
      const nowIso = clock().toISOString();

      const validToken = await learnerAccessRepo.findValidByHash(tokenHash, nowIso);
      if (!validToken) {
        throw new DomainError('UNAUTHORIZED', 'Token akses learner tidak valid atau telah kedaluwarsa');
      }

      await learnerAccessRepo.markRedeemed(validToken.id, nowIso);

      return {
        contactId: validToken.contactId,
        organizationId: validToken.organizationId,
      };
    },

    async getEnrollmentById(organizationId: string, enrollmentId: string): Promise<EnrollmentRow | null> {
      return await enrollmentRepo.getById(organizationId, enrollmentId);
    },

    async listEnrollmentsByOrg(organizationId: string, filter?: { programId?: string; contactId?: string }): Promise<EnrollmentRow[]> {
      return await enrollmentRepo.listByOrg(organizationId, filter);
    },

    async getLearnerPrograms(contactId: string, organizationId: string): Promise<Array<EnrollmentRow & { programTitle: string; programSlug: string }>> {
      const enrs = await enrollmentRepo.listByContact(organizationId, contactId);
      const results: Array<EnrollmentRow & { programTitle: string; programSlug: string }> = [];

      for (const e of enrs) {
        const p = await programRepo.findById({ organizationId }, e.programId);
        if (p) {
          results.push({
            ...e,
            programTitle: p.title,
            programSlug: p.programSlug,
          });
        }
      }

      return results;
    },
  };
}
