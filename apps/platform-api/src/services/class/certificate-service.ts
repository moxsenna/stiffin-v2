import * as crypto from 'node:crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { DomainError } from '../../core/errors';
import { enrollments } from '../../db/schema/enrollments';
import { contacts } from '../../db/schema/contacts';
import { programs } from '../../db/schema/programs';
import { workspaceProfiles } from '../../db/schema/workspace-profiles';
import { createCertificateRepository, type CertificateRepository } from '../../repositories/certificate-repository';
import type { NewCertificateRow } from '../../db/schema/certificates';

export interface OwnedEnrollmentSnapshot {
  id: string;
  organizationId: string;
  contactId: string;
  progressPercent: number;
  status: string;
  contactName: string;
  programTitle: string;
  promoterName: string;
}

export interface CertificateDto {
  serial: string;
  recipientName: string;
  programTitle: string;
  promoterName: string;
  issuedAt: string;
}

export interface CertificateServiceDeps {
  clock?: () => Date;
  certRepo?: Pick<CertificateRepository, 'findByEnrollment' | 'findBySerial' | 'create'>;
  enrollmentFinder?: {
    findOwnedEnrollment(
      organizationId: string,
      enrollmentId: string,
      contactId: string
    ): Promise<OwnedEnrollmentSnapshot | null>;
  };
}

export function createDefaultEnrollmentFinder(db: NodePgDatabase) {
  return {
    async findOwnedEnrollment(
      organizationId: string,
      enrollmentId: string,
      contactId: string
    ): Promise<OwnedEnrollmentSnapshot | null> {
      const rows = await db
        .select({
          id: enrollments.id,
          organizationId: enrollments.organizationId,
          contactId: enrollments.contactId,
          progressPercent: enrollments.progressPercent,
          status: enrollments.status,
          contactName: contacts.name,
          programTitle: programs.title,
          promoterName: workspaceProfiles.displayName,
        })
        .from(enrollments)
        .innerJoin(contacts, eq(contacts.id, enrollments.contactId))
        .innerJoin(programs, eq(programs.id, enrollments.programId))
        .leftJoin(workspaceProfiles, eq(workspaceProfiles.organizationId, enrollments.organizationId))
        .where(
          and(
            eq(enrollments.organizationId, organizationId),
            eq(enrollments.id, enrollmentId),
            eq(enrollments.contactId, contactId)
          )
        );
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        organizationId: row.organizationId,
        contactId: row.contactId,
        progressPercent: row.progressPercent,
        status: row.status,
        contactName: row.contactName,
        programTitle: row.programTitle,
        promoterName: row.promoterName ?? row.programTitle,
      };
    },
  };
}

function toDto(row: {
  serial: string;
  recipientName: string;
  programTitle: string;
  promoterName: string;
  issuedAt: Date | string;
}): CertificateDto {
  return {
    serial: row.serial,
    recipientName: row.recipientName,
    programTitle: row.programTitle,
    promoterName: row.promoterName,
    issuedAt: new Date(row.issuedAt).toISOString(),
  };
}

export function createCertificateService(db: any, deps: CertificateServiceDeps = {}) {
  const getNow = deps.clock ?? (() => new Date());
  const certRepo =
    deps.certRepo ?? (db ? createCertificateRepository(db as NodePgDatabase) : null);
  if (!certRepo) throw new Error('CertificateService membutuhkan db atau certRepo');
  const enrollmentFinder =
    deps.enrollmentFinder ?? (db ? createDefaultEnrollmentFinder(db as NodePgDatabase) : null);
  if (!enrollmentFinder) throw new Error('CertificateService membutuhkan db atau enrollmentFinder');

  const generateSerial = () => {
    const yy = String(getNow().getFullYear()).slice(-2);
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `RAL-${yy}-${rand}`;
  };

  return {
    async issueForEnrollment(input: {
      organizationId: string;
      enrollmentId: string;
      authenticatedContactId: string;
    }): Promise<CertificateDto> {
      const enrollment = await enrollmentFinder.findOwnedEnrollment(
        input.organizationId,
        input.enrollmentId,
        input.authenticatedContactId
      );
      if (!enrollment) throw new DomainError('NOT_FOUND', 'Enrollment tidak ditemukan');
      if (enrollment.progressPercent < 100 || enrollment.status !== 'COMPLETED') {
        throw new DomainError(
          'PROGRAM_NOT_COMPLETED',
          'Selesaikan semua modul untuk mendapatkan sertifikat.'
        );
      }

      const existing = await certRepo.findByEnrollment(input.enrollmentId);
      if (existing) return toDto(existing);

      const payload: NewCertificateRow = {
        organizationId: enrollment.organizationId,
        enrollmentId: enrollment.id,
        serial: generateSerial(),
        recipientName: enrollment.contactName,
        programTitle: enrollment.programTitle,
        promoterName: enrollment.promoterName,
        issuedAt: getNow(),
      };
      const row = await certRepo.create(payload);
      if (!row) {
        const winner = await certRepo.findByEnrollment(input.enrollmentId);
        if (winner) return toDto(winner);
        throw new DomainError('NOT_FOUND', 'Enrollment tidak ditemukan');
      }
      return toDto(row);
    },

    async verifyBySerial(serial: string): Promise<CertificateDto | null> {
      const row = await certRepo.findBySerial(serial);
      return row ? toDto(row) : null;
    },
  };
}
