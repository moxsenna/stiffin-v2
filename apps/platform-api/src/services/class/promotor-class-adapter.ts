import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { DomainError } from '../../core/errors';
import { createProgramRepository } from '../../repositories/program-repository';
import { createEnrollmentRepository } from '../../repositories/enrollment-repository';
import { createContactRepository } from '../../repositories/contact-repository';

import { createLearningSignalRepository } from '../../repositories/learning-signal-repository';

export interface LearningContextDTO {
  contactId: string;
  activeEnrollments: Array<{
    enrollmentId: string;
    programId: string;
    programTitle: string;
    progressPercent: number;
    learningStatus: string;
    intentLabel: string;
    enrolledAt: string;
  }>;
  overallProgressPercent: number;
  highestIntentLabel: 'COLD' | 'WARM' | 'HOT';
  recentSignals: Array<{ reason: string; createdAt: string }>;
}

export interface EligibleProgramDTO {
  id: string;
  title: string;
  slug: string;
  programType: string;
  accessType: string;
  pricing: string;
  priceAmount: number;
}

export interface PromotorClassAdapter {
  getLearningContext(organizationId: string, contactId: string): Promise<LearningContextDTO>;
  listEligiblePrograms(organizationId: string, accessType?: string): Promise<EligibleProgramDTO[]>;
  enrollContact(organizationId: string, programId: string, contactId: string): Promise<{ enrollmentId: string; status: string }>;
  getEnrollmentStatus(organizationId: string, contactId: string, programId: string): Promise<{
    enrollmentId: string;
    status: string;
    progressPercent: number;
    learningStatus: string;
    intentLabel: string;
  } | null>;
}

export function createPromotorClassAdapter(db: NodePgDatabase): PromotorClassAdapter {
  const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
  const programRepo = createProgramRepository(db);
  const enrollmentRepo = createEnrollmentRepository(db);
  const signalRepo = createLearningSignalRepository(db);

  return {
    async getLearningContext(organizationId: string, contactId: string): Promise<LearningContextDTO> {
      // Verify contact belongs to organization
      const contact = await contactRepo.findById({ organizationId }, contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Kontak tidak ditemukan pada organisasi ini');
      }

      const enrollments = await enrollmentRepo.listByContact(organizationId, contactId);
      const activeEnrollments: LearningContextDTO['activeEnrollments'] = [];

      let totalProgress = 0;
      let highestIntent: 'COLD' | 'WARM' | 'HOT' = 'COLD';

      for (const e of enrollments) {
        const prog = await programRepo.findById({ organizationId }, e.programId);
        if (prog) {
          activeEnrollments.push({
            enrollmentId: e.id,
            programId: e.programId,
            programTitle: prog.title,
            progressPercent: e.progressPercent,
            learningStatus: e.learningStatus,
            intentLabel: e.intentLabel,
            enrolledAt: e.enrolledAt,
          });

          totalProgress += e.progressPercent;
          if (e.intentLabel === 'HOT') {
            highestIntent = 'HOT';
          } else if (e.intentLabel === 'WARM' && highestIntent !== 'HOT') {
            highestIntent = 'WARM';
          }
        }
      }

      const avgProgress = activeEnrollments.length > 0
        ? Math.round(totalProgress / activeEnrollments.length)
        : 0;

      const rawSignals = await signalRepo.listByContact(organizationId, contactId);
      const recentSignals = rawSignals.slice(0, 10).map((s) => ({
        reason: s.reason,
        createdAt: s.createdAt.toISOString(),
      }));

      return {
        contactId,
        activeEnrollments,
        overallProgressPercent: avgProgress,
        highestIntentLabel: highestIntent,
        recentSignals,
      };
    },

    async listEligiblePrograms(organizationId: string, accessType?: string): Promise<EligibleProgramDTO[]> {
      const all = await programRepo.list({ organizationId });
      const published = all.filter((p) => p.status === 'published');
      const filtered = accessType ? published.filter((p) => p.accessType === accessType) : published;

      return filtered.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.programSlug,
        programType: p.programType,
        accessType: p.accessType,
        pricing: p.pricing,
        priceAmount: p.priceAmount,
      }));
    },

    async enrollContact(organizationId: string, programId: string, contactId: string) {
      const contact = await contactRepo.findById({ organizationId }, contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Kontak tidak ditemukan');
      }

      const program = await programRepo.findById({ organizationId }, programId);
      if (!program) {
        throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
      }

      const existing = await enrollmentRepo.findByProgramAndContact(organizationId, programId, contactId);
      if (existing) {
        return {
          enrollmentId: existing.id,
          status: existing.status,
        };
      }

      const created = await enrollmentRepo.create({
        organizationId,
        programId,
        contactId,
        status: 'ENROLLED',
        progressPercent: 0,
        intentScore: 0,
        intentLabel: 'COLD',
        learningStatus: 'NOT_STARTED',
      });

      return {
        enrollmentId: created.id,
        status: created.status,
      };
    },

    async getEnrollmentStatus(organizationId: string, contactId: string, programId: string) {
      const enrollment = await enrollmentRepo.findByProgramAndContact(organizationId, programId, contactId);
      if (!enrollment) {
        return null;
      }
      return {
        enrollmentId: enrollment.id,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        learningStatus: enrollment.learningStatus,
        intentLabel: enrollment.intentLabel as 'COLD' | 'WARM' | 'HOT',
      };
    },
  };
}
