import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { certificates, type CertificateRow, type NewCertificateRow } from '../db/schema/certificates';

export interface CertificateRepository {
  findByEnrollment(enrollmentId: string): Promise<CertificateRow | null>;
  findBySerial(serial: string): Promise<CertificateRow | null>;
  create(input: NewCertificateRow): Promise<CertificateRow>;
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
    async create(input: NewCertificateRow) {
      const [created] = await db.insert(certificates).values(input).returning();
      return created;
    },
  };
}
