import { pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { enrollments } from './enrollments';
import { organizations } from './organizations';

export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'restrict' }),
    serial: varchar('serial', { length: 32 }).notNull(),
    recipientName: text('recipient_name').notNull(),
    programTitle: text('program_title').notNull(),
    promoterName: text('promoter_name').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('certificates_serial_uq').on(table.serial),
    uniqueIndex('certificates_enrollment_uq').on(table.enrollmentId),
  ]
);

export type CertificateRow = typeof certificates.$inferSelect;
export type NewCertificateRow = typeof certificates.$inferInsert;
