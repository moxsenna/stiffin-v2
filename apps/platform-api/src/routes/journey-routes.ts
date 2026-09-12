import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import type { OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';

function getRequestContext(c: any): {
  ctx: OrganizationContext;
  actor: AuthenticatedActor;
  db: any;
} {
  const db = c.get('db');
  const authCtx = c.get('authContext');
  if (!authCtx || !authCtx.organization || !authCtx.actor) {
    throw new DomainError('UNAUTHORIZED', 'Authentication and organization context are required');
  }
  const ctx: OrganizationContext = { organizationId: authCtx.organization.organizationId };
  const actor: AuthenticatedActor = {
    userId: authCtx.actor.userId ?? authCtx.user.id,
    membershipId: authCtx.actor.membershipId,
    role: authCtx.actor.role,
  };
  return { ctx, actor, db };
}

export function registerJourneyRoutes(app: Hono<AppEnv>) {
  // Perjalanan satu kontak lintas Class & Flow — milik bersama (bukan /class/ atau /flow/).
  app.get('/api/v1/journey/:contactId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const contactId = c.req.param('contactId');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
      throw new DomainError('VALIDATION_ERROR', 'contactId tidak valid');
    }
    const orgId = ctx.organizationId;

    const ownerCheck = await db.execute(sql`
      SELECT id FROM contacts WHERE id = ${contactId} AND organization_id = ${orgId} LIMIT 1
    `);
    if (!ownerCheck.rows?.length) {
      throw new DomainError('NOT_FOUND', 'Kontak tidak ditemukan');
    }

    const res = await db.execute(sql`
      SELECT * FROM (
        SELECT id, 'FLOW'::text AS app, 'next_action'::text AS type,
               title AS title, status::text AS detail,
               created_at AS occurred_at
        FROM next_actions
        WHERE organization_id = ${orgId} AND contact_id = ${contactId}
        UNION ALL
        SELECT id, 'FLOW', 'booking', 'Booking ' || lower(status), NULL,
               start_at
        FROM bookings
        WHERE organization_id = ${orgId} AND contact_id = ${contactId}
          AND start_at IS NOT NULL
        UNION ALL
        SELECT id, 'FLOW', 'aftercare', 'Aftercare dimulai', NULL,
               created_at
        FROM aftercare_records
        WHERE organization_id = ${orgId} AND contact_id = ${contactId}
        UNION ALL
        SELECT e.id, 'CLASS', 'enrollment', 'Mendaftar program', p.title,
               e.created_at
        FROM enrollments e
        LEFT JOIN programs p ON p.id = e.program_id
        WHERE e.organization_id = ${orgId} AND e.contact_id = ${contactId}
        UNION ALL
        SELECT o.id, 'CLASS', 'payment', 'Lunas program', p.title,
               o.paid_at
        FROM commerce_orders o
        LEFT JOIN programs p ON p.id = o.program_id
        WHERE o.organization_id = ${orgId} AND o.contact_id = ${contactId}
          AND o.status IN ('PAID','APPROVED') AND o.paid_at IS NOT NULL
        UNION ALL
        SELECT lp.id, 'CLASS', 'lesson', 'Materi selesai', l.title,
               COALESCE(lp.completed_at, lp.updated_at)
        FROM lesson_progress lp
        JOIN enrollments e ON e.id = lp.enrollment_id
        LEFT JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.organization_id = ${orgId} AND e.contact_id = ${contactId}
          AND lp.is_completed
      ) j
      WHERE occurred_at IS NOT NULL
      ORDER BY occurred_at DESC
      LIMIT 50
    `);

    const items = (res.rows ?? []).map((r: any) => ({
      app: r.app as 'CLASS' | 'FLOW',
      type: r.type as string,
      title: (r.title ?? '') as string,
      detail: (r.detail ?? null) as string | null,
      occurredAt: new Date(r.occurred_at).toISOString(),
    }));
    return c.json({ items }, 200);
  });
}
