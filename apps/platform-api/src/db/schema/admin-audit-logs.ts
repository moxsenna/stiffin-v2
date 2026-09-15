import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminIdentity: text('admin_identity').notNull().default('superadmin'),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    details: jsonb('details'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('admin_audit_logs_action_idx').on(t.action),
    index('admin_audit_logs_target_idx').on(t.targetType, t.targetId),
    index('admin_audit_logs_created_at_idx').on(t.createdAt),
  ]
);

export type AdminAuditLogRow = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLogRow = typeof adminAuditLogs.$inferInsert;
