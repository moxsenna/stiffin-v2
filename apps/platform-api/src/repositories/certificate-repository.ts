import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq } from 'drizzle-orm';
import { certificates, type CertificateRow, type NewCertificateRow } from '../db/schema/certificates';
import { enrollments } from '../db/schema/enrollments';
import { isUniqueViolation } from '../db/pg-errors';

export interface CertificateRepository {
  findByEnrollment(enrollmentId: string): Promise<CertificateRow | null>;
  findBySerial(serial: string): Promise<CertificateRow | null>;
  listByContact(organizationId: string, contactId: string): Promise<CertificateRow[]>;
  create(input: NewCertificateRow): Promise<CertificateRow | null>;
}

export function createCertificateRepository(db: NodePgDatabase): CertificateRepository {
  return {
    async findByEnrollment(enrollmentId: string) {
      const rows = await db.select().from(certificates).where(eq(certificates.enrollmentId, enrollmentId));
      return rows[0] ?? null;
    },
    async findBySerial(serial: string) {
      const rows = await db.select().from(certificates).where(eq(certificates.serial, serial));
      return rows[0] ?? null;
    },
    async listByContact(organizationId: string, contactId: string) {
      const rows = await db
        .select({ certificate: certificates })
        .from(certificates)
        .innerJoin(enrollments, eq(enrollments.id, certificates.enrollmentId))
        .where(
          and(
            eq(certificates.organizationId, organizationId),
            eq(enrollments.contactId, contactId)
          )
        )
        .orderBy(desc(certificates.issuedAt));
      return rows.map((r) => r.certificate);
    },
    async create(input: NewCertificateRow) {
      try {
        const [created] = await db.insert(certificates).values(input).returning();
        return created ?? null;
      } catch (err) {
        if (isUniqueViolation(err)) return null;
        throw err;
      }
    },
  };
}
