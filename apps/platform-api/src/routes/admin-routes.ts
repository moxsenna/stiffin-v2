import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { eq, and, desc, sql, ilike, or, gte, inArray } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';

import {
  adminAuditLogs,
  organizations,
  organizationSubscriptions,
  productEntitlements,
  commerceOrders,
  paymentRecords,
  platformFeeEntries,
  payoutBatches,
  payoutItems,
  organizationBankAccounts,
  programs,
  contacts,
  enrollments,
  integrationOutbox,
  users,
  organizationMembers,
  sessions,
} from '../db/schema';

// Helper to record admin audit log
async function logAudit(
  db: any,
  data: {
    adminIdentity?: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: any;
    ipAddress?: string;
  }
) {
  try {
    await db.insert(adminAuditLogs).values({
      adminIdentity: data.adminIdentity || 'superadmin',
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      details: data.details || null,
      ipAddress: data.ipAddress || null,
    });
  } catch (err) {
    console.error('[AdminAuditLog] Failed to record audit log:', err);
  }
}

// Authentication validator for admin routes
function verifyAdminAuth(c: any): boolean {
  const adminKey = c.env?.ADMIN_API_KEY;
  if (!adminKey) return false;

  const headerKey = c.req.header('x-admin-key');
  if (headerKey && headerKey === adminKey) return true;

  const cookieKey = getCookie(c, 'ralivo_admin_session');
  if (cookieKey && cookieKey === adminKey) return true;

  return false;
}

export function registerAdminRoutes(app: Hono<AppEnv>) {
  // -------------------------------------------------------------
  // Admin Authentication Endpoints
  // -------------------------------------------------------------
  app.post('/api/v1/admin/auth/login', async (c) => {
    c.header('Cache-Control', 'no-store');
    const adminKey = c.env?.ADMIN_API_KEY;
    if (!adminKey) {
      throw new DomainError('FORBIDDEN', 'Admin access belum dikonfigurasi di server');
    }

    const body = await c.req.json().catch(() => ({}));
    const key = typeof body?.adminKey === 'string' ? body.adminKey.trim() : '';

    if (!key || key !== adminKey) {
      throw new DomainError('UNAUTHORIZED', 'Kunci akses admin tidak valid');
    }

    const isProduction = c.env?.APP_ENV === 'production';
    setCookie(c, 'ralivo_admin_session', key, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    const db = c.get('db');
    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'ADMIN_LOGIN',
      targetType: 'system',
      targetId: 'auth',
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
    });

    return c.json({
      success: true,
      admin: {
        role: 'superadmin',
        name: 'Platform Administrator',
      },
    });
  });

  app.get('/api/v1/admin/auth/me', async (c) => {
    c.header('Cache-Control', 'no-store');
    if (!verifyAdminAuth(c)) {
      return c.json({ authenticated: false }, 401);
    }
    return c.json({
      authenticated: true,
      role: 'superadmin',
      name: 'Platform Administrator',
    });
  });

  app.post('/api/v1/admin/auth/logout', async (c) => {
    c.header('Cache-Control', 'no-store');
    deleteCookie(c, 'ralivo_admin_session', { path: '/' });
    return c.json({ success: true });
  });

  // -------------------------------------------------------------
  // Admin Middleware Guard for /api/v1/admin/* (excluding auth)
  // -------------------------------------------------------------
  app.use('/api/v1/admin/*', async (c, next) => {
    if (c.req.path.startsWith('/api/v1/admin/auth/login')) {
      return next();
    }
    if (!verifyAdminAuth(c)) {
      throw new DomainError('UNAUTHORIZED', 'Akses ditolak: Dibutuhkan kredensial admin');
    }
    await next();
  });

  // =============================================================
  // MODUL 1: Payout & Arus Kas (Settlement & Escrow Tracker)
  // =============================================================
  app.get('/api/v1/admin/payouts/batches', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const statusParam = c.req.query('status');

    const conditions = [];
    if (statusParam && statusParam !== 'all') {
      conditions.push(eq(payoutBatches.status, statusParam));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: payoutBatches.id,
        organizationId: payoutBatches.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        status: payoutBatches.status,
        totalNet: payoutBatches.totalNet,
        orderCount: payoutBatches.orderCount,
        destBankName: payoutBatches.destBankName,
        destAccountNumber: payoutBatches.destAccountNumber,
        destHolderName: payoutBatches.destHolderName,
        proofUrl: payoutBatches.proofUrl,
        paidAt: payoutBatches.paidAt,
        createdAt: payoutBatches.createdAt,
        updatedAt: payoutBatches.updatedAt,
      })
      .from(payoutBatches)
      .innerJoin(organizations, eq(payoutBatches.organizationId, organizations.id))
      .where(whereClause)
      .orderBy(desc(payoutBatches.createdAt))
      .limit(100);

    return c.json({ batches: rows });
  });

  app.get('/api/v1/admin/payouts/escrow', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');

    // 1. Gross GMV from PAID/APPROVED orders
    const [gmvResult] = await db
      .select({ totalGross: sql<number>`COALESCE(SUM(${commerceOrders.amount}), 0)` })
      .from(commerceOrders)
      .where(sql`${commerceOrders.status} IN ('PAID', 'APPROVED')`);
    const totalGrossGmv = Number(gmvResult?.totalGross || 0);

    // 2. Platform take-rate fees
    const [feeResult] = await db
      .select({ totalFee: sql<number>`COALESCE(SUM(${platformFeeEntries.amount}), 0)` })
      .from(platformFeeEntries)
      .where(sql`${platformFeeEntries.status} IN ('BILLABLE', 'BILLED')`);
    const totalPlatformFees = Number(feeResult?.totalFee || 0);

    // 3. Settled Paid Payouts
    const [paidBatchResult] = await db
      .select({ totalPaid: sql<number>`COALESCE(SUM(${payoutBatches.totalNet}), 0)` })
      .from(payoutBatches)
      .where(eq(payoutBatches.status, 'PAID'));
    const totalSettledPaid = Number(paidBatchResult?.totalPaid || 0);

    // 4. In-batch pending settlement
    const [batchPendingResult] = await db
      .select({ totalInBatch: sql<number>`COALESCE(SUM(${payoutBatches.totalNet}), 0)` })
      .from(payoutBatches)
      .where(sql`${payoutBatches.status} IN ('DRAFT', 'PROCESSING')`);
    const totalInBatches = Number(batchPendingResult?.totalInBatch || 0);

    // 5. Escrow pending
    const totalEscrowPending = Math.max(0, totalGrossGmv - totalPlatformFees - totalSettledPaid - totalInBatches);

    return c.json({
      escrow: {
        totalGrossGmv,
        totalPlatformFees,
        totalSettledPaid,
        totalInBatches,
        totalEscrowPending,
      },
    });
  });

  app.post('/api/v1/admin/payouts/batches/:batchId/approve', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const batchId = c.req.param('batchId');
    const body = await c.req.json().catch(() => ({}));
    const proofUrl = typeof body?.proofUrl === 'string' ? body.proofUrl.trim() : null;

    const [batch] = await db
      .select()
      .from(payoutBatches)
      .where(eq(payoutBatches.id, batchId))
      .limit(1);

    if (!batch) {
      throw new DomainError('NOT_FOUND', 'Batch payout tidak ditemukan');
    }

    await db
      .update(payoutBatches)
      .set({
        status: 'PAID',
        paidAt: new Date().toISOString(),
        proofUrl: proofUrl || batch.proofUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(payoutBatches.id, batchId));

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'PAYOUT_APPROVE',
      targetType: 'payout_batch',
      targetId: batchId,
      details: { totalNet: batch.totalNet, proofUrl },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, batchId, status: 'PAID' });
  });

  app.post('/api/v1/admin/payouts/batches/:batchId/reject', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const batchId = c.req.param('batchId');
    const body = await c.req.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : 'Ditolak oleh admin';

    const [batch] = await db
      .select()
      .from(payoutBatches)
      .where(eq(payoutBatches.id, batchId))
      .limit(1);

    if (!batch) {
      throw new DomainError('NOT_FOUND', 'Batch payout tidak ditemukan');
    }

    await db
      .update(payoutBatches)
      .set({
        status: 'FAILED',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(payoutBatches.id, batchId));

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'PAYOUT_REJECT',
      targetType: 'payout_batch',
      targetId: batchId,
      details: { reason, previousStatus: batch.status },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, batchId, status: 'FAILED' });
  });

  // =============================================================
  // MODUL 2: Payment Ops & Transaksi Paycore (Global Stream & Force Paid)
  // =============================================================
  app.get('/api/v1/admin/orders', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const statusParam = c.req.query('status');
    const searchParam = c.req.query('q')?.trim();

    const conditions = [];
    if (statusParam && statusParam !== 'all') {
      conditions.push(eq(commerceOrders.status, statusParam));
    }
    if (searchParam) {
      conditions.push(
        or(
          ilike(commerceOrders.reference, `%${searchParam}%`),
          ilike(contacts.name, `%${searchParam}%`),
          ilike(contacts.email, `%${searchParam}%`)
        )
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: commerceOrders.id,
        organizationId: commerceOrders.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        programId: commerceOrders.programId,
        programTitle: programs.title,
        contactId: commerceOrders.contactId,
        contactName: contacts.name,
        contactEmail: contacts.email,
        contactPhone: contacts.phoneE164,
        reference: commerceOrders.reference,
        providerOrderId: commerceOrders.providerOrderId,
        amount: commerceOrders.amount,
        status: commerceOrders.status,
        paymentMode: commerceOrders.paymentMode,
        enrollmentId: commerceOrders.enrollmentId,
        paidAt: commerceOrders.paidAt,
        refundedAt: commerceOrders.refundedAt,
        createdAt: commerceOrders.createdAt,
      })
      .from(commerceOrders)
      .innerJoin(organizations, eq(commerceOrders.organizationId, organizations.id))
      .leftJoin(programs, eq(commerceOrders.programId, programs.id))
      .leftJoin(contacts, eq(commerceOrders.contactId, contacts.id))
      .where(whereClause)
      .orderBy(desc(commerceOrders.createdAt))
      .limit(100);

    return c.json({ orders: rows });
  });

  app.post('/api/v1/admin/orders/:orderId/force-paid', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const orderId = c.req.param('orderId');

    const [order] = await db
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.id, orderId))
      .limit(1);

    if (!order) {
      throw new DomainError('NOT_FOUND', 'Order tidak ditemukan');
    }

    let enrollmentId = order.enrollmentId;

    // Create or activate enrollment if program & contact present
    if (order.programId && order.contactId) {
      const [existingEnrollment] = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.organizationId, order.organizationId),
            eq(enrollments.programId, order.programId),
            eq(enrollments.contactId, order.contactId)
          )
        )
        .limit(1);

      if (existingEnrollment) {
        if (existingEnrollment.status !== 'ENROLLED') {
          await db
            .update(enrollments)
            .set({ status: 'ENROLLED', updatedAt: new Date().toISOString() })
            .where(eq(enrollments.id, existingEnrollment.id));
        }
        enrollmentId = existingEnrollment.id;
      } else {
        const [newEnroll] = await db
          .insert(enrollments)
          .values({
            organizationId: order.organizationId,
            programId: order.programId,
            contactId: order.contactId,
            status: 'ENROLLED',
          })
          .returning({ id: enrollments.id });
        enrollmentId = newEnroll.id;
      }
    }

    await db
      .update(commerceOrders)
      .set({
        status: 'PAID',
        paidAt: new Date().toISOString(),
        enrollmentId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(commerceOrders.id, orderId));

    // Ensure platform fee entry exists
    const [existingFee] = await db
      .select()
      .from(platformFeeEntries)
      .where(eq(platformFeeEntries.orderId, orderId))
      .limit(1);

    if (!existingFee) {
      await db
        .insert(platformFeeEntries)
        .values({
          organizationId: order.organizationId,
          orderId,
          feeType: 'PAID_LEARNER_TRANSACTION',
          amount: 3000,
          currency: 'IDR',
          status: 'BILLABLE',
          idempotencyKey: `admin-force-paid-${orderId}`,
        })
        .catch(() => null);
    }

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'ORDER_FORCE_PAID',
      targetType: 'commerce_order',
      targetId: orderId,
      details: { previousStatus: order.status, enrollmentId, amount: order.amount },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, orderId, status: 'PAID', enrollmentId });
  });

  app.post('/api/v1/admin/orders/:orderId/refund', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const orderId = c.req.param('orderId');
    const body = await c.req.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : 'Refund diminta admin';

    const [order] = await db
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.id, orderId))
      .limit(1);

    if (!order) {
      throw new DomainError('NOT_FOUND', 'Order tidak ditemukan');
    }

    const now = new Date().toISOString();

    // Revoke enrollment access
    if (order.enrollmentId) {
      await db
        .update(enrollments)
        .set({ status: 'CANCELLED', updatedAt: now })
        .where(eq(enrollments.id, order.enrollmentId));
    }

    // Reverse platform fee
    await db
      .update(platformFeeEntries)
      .set({ status: 'REVERSED', reversedAt: now, updatedAt: now })
      .where(eq(platformFeeEntries.orderId, orderId));

    // Update order status to REFUNDED
    await db
      .update(commerceOrders)
      .set({
        status: 'REFUNDED',
        refundedAt: now,
        rejectionReason: reason,
        updatedAt: now,
      })
      .where(eq(commerceOrders.id, orderId));

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'ORDER_REFUND',
      targetType: 'commerce_order',
      targetId: orderId,
      details: { reason, enrollmentId: order.enrollmentId, amount: order.amount },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, orderId, status: 'REFUNDED' });
  });

  // =============================================================
  // MODUL 3: Tenant Management & Impersonation
  // =============================================================
  app.get('/api/v1/admin/tenants', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');

    const orgList = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        timezone: organizations.timezone,
        metadata: organizations.metadata,
        createdAt: organizations.createdAt,
        subPlan: organizationSubscriptions.planCode,
        subStatus: organizationSubscriptions.status,
        subCycle: organizationSubscriptions.billingCycle,
        subPeriodEnd: organizationSubscriptions.currentPeriodEnd,
        entClass: productEntitlements.promotorClass,
        entFlow: productEntitlements.promotorFlow,
      })
      .from(organizations)
      .leftJoin(organizationSubscriptions, eq(organizations.id, organizationSubscriptions.organizationId))
      .leftJoin(productEntitlements, eq(organizations.id, productEntitlements.organizationId))
      .orderBy(desc(organizations.createdAt))
      .limit(100);

    const enriched = await Promise.all(
      orgList.map(async (org: any) => {
        const [cCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(contacts)
          .where(eq(contacts.organizationId, org.id));
        const [pCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(programs)
          .where(eq(programs.organizationId, org.id));
        const [gmvSum] = await db
          .select({ sum: sql<number>`COALESCE(SUM(${commerceOrders.amount}), 0)` })
          .from(commerceOrders)
          .where(and(eq(commerceOrders.organizationId, org.id), sql`${commerceOrders.status} IN ('PAID', 'APPROVED')`));

        let metaObj: any = {};
        try {
          metaObj = org.metadata ? JSON.parse(org.metadata) : {};
        } catch {
          metaObj = {};
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          timezone: org.timezone,
          createdAt: org.createdAt,
          isSuspended: Boolean(metaObj?.suspended),
          suspendedReason: metaObj?.suspendedReason || null,
          subscription: {
            planCode: org.subPlan || 'FREE',
            status: org.subStatus || 'ACTIVE',
            billingCycle: org.subCycle || 'NONE',
            currentPeriodEnd: org.subPeriodEnd || null,
          },
          entitlements: {
            promotorClass: Boolean(org.entClass),
            promotorFlow: Boolean(org.entFlow),
          },
          contactsCount: Number(cCount?.count || 0),
          programsCount: Number(pCount?.count || 0),
          totalGmv: Number(gmvSum?.sum || 0),
        };
      })
    );

    return c.json({ tenants: enriched });
  });

  app.post('/api/v1/admin/tenants/:organizationId/override-subscription', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const organizationId = c.req.param('organizationId');
    const body = await c.req.json().catch(() => ({}));

    const planCode = body?.planCode as 'FREE' | 'SOLO' | 'STUDIO' | undefined;
    const status = body?.status as 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'CANCELED' | undefined;
    const currentPeriodEnd = typeof body?.currentPeriodEnd === 'string' ? body.currentPeriodEnd : undefined;
    const promotorClass = typeof body?.promotorClass === 'boolean' ? body.promotorClass : undefined;
    const promotorFlow = typeof body?.promotorFlow === 'boolean' ? body.promotorFlow : undefined;

    const [existingSub] = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    const now = new Date().toISOString();

    if (existingSub) {
      await db
        .update(organizationSubscriptions)
        .set({
          planCode: planCode || existingSub.planCode,
          status: status || existingSub.status,
          currentPeriodEnd: currentPeriodEnd !== undefined ? currentPeriodEnd : existingSub.currentPeriodEnd,
          updatedAt: now,
        })
        .where(eq(organizationSubscriptions.organizationId, organizationId));
    } else {
      await db.insert(organizationSubscriptions).values({
        organizationId,
        planCode: planCode || 'FREE',
        status: status || 'ACTIVE',
        currentPeriodEnd: currentPeriodEnd || null,
      });
    }

    if (promotorClass !== undefined || promotorFlow !== undefined) {
      const [existingEnt] = await db
        .select()
        .from(productEntitlements)
        .where(eq(productEntitlements.organizationId, organizationId))
        .limit(1);

      if (existingEnt) {
        await db
          .update(productEntitlements)
          .set({
            promotorClass: promotorClass !== undefined ? promotorClass : existingEnt.promotorClass,
            promotorFlow: promotorFlow !== undefined ? promotorFlow : existingEnt.promotorFlow,
            updatedAt: now,
          })
          .where(eq(productEntitlements.organizationId, organizationId));
      } else {
        await db.insert(productEntitlements).values({
          organizationId,
          promotorClass: promotorClass !== undefined ? promotorClass : false,
          promotorFlow: promotorFlow !== undefined ? promotorFlow : false,
        });
      }
    }

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'SUBSCRIPTION_OVERRIDE',
      targetType: 'organization',
      targetId: organizationId,
      details: { planCode, status, currentPeriodEnd, promotorClass, promotorFlow },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, organizationId });
  });

  app.post('/api/v1/admin/tenants/:organizationId/suspend', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const organizationId = c.req.param('organizationId');
    const body = await c.req.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : 'Suspended by admin';

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new DomainError('NOT_FOUND', 'Organisasi tidak ditemukan');
    }

    let meta: any = {};
    try {
      meta = org.metadata ? JSON.parse(org.metadata) : {};
    } catch {
      meta = {};
    }
    meta.suspended = true;
    meta.suspendedReason = reason;
    meta.suspendedAt = new Date().toISOString();

    await db
      .update(organizations)
      .set({ metadata: JSON.stringify(meta), updatedAt: new Date().toISOString() })
      .where(eq(organizations.id, organizationId));

    // Suspend subscription if present
    await db
      .update(organizationSubscriptions)
      .set({ status: 'CANCELED', updatedAt: new Date().toISOString() })
      .where(eq(organizationSubscriptions.organizationId, organizationId));

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'TENANT_SUSPEND',
      targetType: 'organization',
      targetId: organizationId,
      details: { reason },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, organizationId, suspended: true });
  });

  app.post('/api/v1/admin/tenants/:organizationId/activate', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const organizationId = c.req.param('organizationId');

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new DomainError('NOT_FOUND', 'Organisasi tidak ditemukan');
    }

    let meta: any = {};
    try {
      meta = org.metadata ? JSON.parse(org.metadata) : {};
    } catch {
      meta = {};
    }
    delete meta.suspended;
    delete meta.suspendedReason;

    await db
      .update(organizations)
      .set({ metadata: JSON.stringify(meta), updatedAt: new Date().toISOString() })
      .where(eq(organizations.id, organizationId));

    await db
      .update(organizationSubscriptions)
      .set({ status: 'ACTIVE', updatedAt: new Date().toISOString() })
      .where(eq(organizationSubscriptions.organizationId, organizationId));

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'TENANT_ACTIVATE',
      targetType: 'organization',
      targetId: organizationId,
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, organizationId, activated: true });
  });

  app.post('/api/v1/admin/tenants/:organizationId/impersonate', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const organizationId = c.req.param('organizationId');

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new DomainError('NOT_FOUND', 'Organisasi tidak ditemukan');
    }

    // Find owner member
    const [ownerMember] = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.role, 'owner')))
      .limit(1);

    let targetUserId = ownerMember?.userId;

    if (!targetUserId) {
      // Find any member
      const [anyMember] = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, organizationId))
        .limit(1);
      targetUserId = anyMember?.userId;
    }

    if (!targetUserId) {
      throw new DomainError('NOT_FOUND', 'Tidak ada member ditemukan untuk organisasi ini');
    }

    // Create a 24-hour Better-Auth session for this user
    const token = `imp_${crypto.randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      token,
      userId: targetUserId,
      activeOrganizationId: organizationId,
      expiresAt,
    });

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'IMPERSONATE',
      targetType: 'organization',
      targetId: organizationId,
      details: { targetUserId, orgSlug: org.slug },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({
      success: true,
      token,
      organizationSlug: org.slug,
      launchPath: `/app?impersonate=${token}`,
    });
  });

  // =============================================================
  // MODUL 4: Helpdesk Peserta Global (Search, Edit, & Manual Access)
  // =============================================================
  app.get('/api/v1/admin/helpdesk/search', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const q = c.req.query('q')?.trim() || '';

    if (!q || q.length < 2) {
      return c.json({ contacts: [] });
    }

    const rows = await db
      .select({
        id: contacts.id,
        organizationId: contacts.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        name: contacts.name,
        email: contacts.email,
        phoneE164: contacts.phoneE164,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .innerJoin(organizations, eq(contacts.organizationId, organizations.id))
      .where(
        or(
          ilike(contacts.name, `%${q}%`),
          ilike(contacts.email, `%${q}%`),
          ilike(contacts.phoneE164, `%${q}%`)
        )
      )
      .orderBy(desc(contacts.createdAt))
      .limit(50);

    // Fetch enrollments for each contact
    const enriched = await Promise.all(
      rows.map(async (contact: any) => {
        const contactEnrollments = await db
          .select({
            id: enrollments.id,
            programId: enrollments.programId,
            programTitle: programs.title,
            status: enrollments.status,
            progressPercent: enrollments.progressPercent,
            enrolledAt: enrollments.enrolledAt,
          })
          .from(enrollments)
          .innerJoin(programs, eq(enrollments.programId, programs.id))
          .where(eq(enrollments.contactId, contact.id));

        return {
          ...contact,
          enrollments: contactEnrollments,
        };
      })
    );

    return c.json({ contacts: enriched });
  });

  app.post('/api/v1/admin/helpdesk/contacts/:contactId/update', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const contactId = c.req.param('contactId');
    const body = await c.req.json().catch(() => ({}));

    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact) {
      throw new DomainError('NOT_FOUND', 'Kontak/Peserta tidak ditemukan');
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (typeof body?.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body?.email === 'string' && body.email.trim()) {
      updates.email = normalizeEmail(body.email.trim());
    }
    if (typeof body?.phoneRaw === 'string' && body.phoneRaw.trim()) {
      updates.phoneRaw = body.phoneRaw.trim();
      updates.phoneE164 = normalizePhone(body.phoneRaw.trim());
    }

    await db
      .update(contacts)
      .set(updates)
      .where(eq(contacts.id, contactId));

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'LEARNER_DATA_UPDATE',
      targetType: 'contact',
      targetId: contactId,
      details: { previous: { name: contact.name, email: contact.email, phone: contact.phoneE164 }, updated: updates },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, contactId, updates });
  });

  app.post('/api/v1/admin/helpdesk/contacts/:contactId/enroll', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const contactId = c.req.param('contactId');
    const body = await c.req.json().catch(() => ({}));
    const programId = typeof body?.programId === 'string' ? body.programId.trim() : '';

    if (!programId) {
      throw new DomainError('VALIDATION_ERROR', 'programId wajib diisi');
    }

    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact) {
      throw new DomainError('NOT_FOUND', 'Kontak/Peserta tidak ditemukan');
    }

    const [prog] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!prog) {
      throw new DomainError('NOT_FOUND', 'Program tidak ditemukan');
    }

    const [existing] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.organizationId, prog.organizationId),
          eq(enrollments.programId, programId),
          eq(enrollments.contactId, contactId)
        )
      )
      .limit(1);

    let enrollmentId = '';

    if (existing) {
      await db
        .update(enrollments)
        .set({ status: 'ENROLLED', updatedAt: new Date().toISOString() })
        .where(eq(enrollments.id, existing.id));
      enrollmentId = existing.id;
    } else {
      const [inserted] = await db
        .insert(enrollments)
        .values({
          organizationId: prog.organizationId,
          programId,
          contactId,
          status: 'ENROLLED',
        })
        .returning({ id: enrollments.id });
      enrollmentId = inserted.id;
    }

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'MANUAL_ENROLLMENT',
      targetType: 'contact',
      targetId: contactId,
      details: { programId, enrollmentId, programTitle: prog.title },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, contactId, programId, enrollmentId, status: 'ENROLLED' });
  });

  // =============================================================
  // MODUL 5: Moderasi Konten & Anti-Fraud (Trust & Safety)
  // =============================================================
  app.get('/api/v1/admin/moderation/programs', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const statusParam = c.req.query('status');

    const conditions = [];
    if (statusParam && statusParam !== 'all') {
      conditions.push(eq(programs.status, statusParam));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: programs.id,
        organizationId: programs.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        title: programs.title,
        slug: programs.slug,
        subtitle: programs.subtitle,
        programType: programs.programType,
        accessType: programs.accessType,
        status: programs.status,
        pricing: programs.pricing,
        priceAmount: programs.priceAmount,
        publishedAt: programs.publishedAt,
        createdAt: programs.createdAt,
      })
      .from(programs)
      .innerJoin(organizations, eq(programs.organizationId, organizations.id))
      .where(whereClause)
      .orderBy(desc(programs.createdAt))
      .limit(100);

    return c.json({ programs: rows });
  });

  app.get('/api/v1/admin/moderation/anomalies', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');

    // Thresholds:
    // 1. GMV > 5.000.000 in past 24 hours
    // 2. Orders > 20 in past 24 hours
    // 3. Org created < 7 days ago with paid orders
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const recentOrders = await db
      .select({
        organizationId: commerceOrders.organizationId,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        orgCreatedAt: organizations.createdAt,
        totalGmv24h: sql<number>`COALESCE(SUM(${commerceOrders.amount}), 0)`,
        orderCount24h: sql<number>`count(*)`,
      })
      .from(commerceOrders)
      .innerJoin(organizations, eq(commerceOrders.organizationId, organizations.id))
      .where(and(sql`${commerceOrders.status} IN ('PAID', 'APPROVED')`, gte(commerceOrders.createdAt, oneDayAgo)))
      .groupBy(commerceOrders.organizationId, organizations.name, organizations.slug, organizations.createdAt);

    const anomalies: any[] = [];

    for (const row of recentOrders) {
      const gmv = Number(row.totalGmv24h || 0);
      const count = Number(row.orderCount24h || 0);
      const isNewOrg = new Date(row.orgCreatedAt) > new Date(sevenDaysAgo);

      if (gmv >= 5000000) {
        anomalies.push({
          organizationId: row.organizationId,
          organizationName: row.orgName,
          organizationSlug: row.orgSlug,
          riskLevel: 'HIGH',
          reason: `Volume lonjakan tinggi: Rp ${gmv.toLocaleString('id-ID')} dalam 24 jam`,
          gmv24h: gmv,
          orderCount24h: count,
        });
      } else if (isNewOrg && count >= 5) {
        anomalies.push({
          organizationId: row.organizationId,
          organizationName: row.orgName,
          organizationSlug: row.orgSlug,
          riskLevel: 'MEDIUM',
          reason: `Akun baru (<7 hari) dengan ${count} order instan`,
          gmv24h: gmv,
          orderCount24h: count,
        });
      } else if (count >= 20) {
        anomalies.push({
          organizationId: row.organizationId,
          organizationName: row.orgName,
          organizationSlug: row.orgSlug,
          riskLevel: 'MEDIUM',
          reason: `Frekuensi order tinggi: ${count} transaksi dalam 24 jam`,
          gmv24h: gmv,
          orderCount24h: count,
        });
      }
    }

    return c.json({ anomalies });
  });

  app.post('/api/v1/admin/moderation/programs/:programId/takedown', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const programId = c.req.param('programId');
    const body = await c.req.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : 'Takedown oleh moderasi admin';

    const [prog] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!prog) {
      throw new DomainError('NOT_FOUND', 'Program tidak ditemukan');
    }

    await db
      .update(programs)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(programs.id, programId));

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'PROGRAM_TAKEDOWN',
      targetType: 'program',
      targetId: programId,
      details: { title: prog.title, previousStatus: prog.status, reason },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, programId, status: 'archived' });
  });

  app.post('/api/v1/admin/moderation/programs/:programId/restore', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const programId = c.req.param('programId');

    const [prog] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!prog) {
      throw new DomainError('NOT_FOUND', 'Program tidak ditemukan');
    }

    await db
      .update(programs)
      .set({
        status: 'published',
        publishedAt: prog.publishedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(programs.id, programId));

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'PROGRAM_RESTORE',
      targetType: 'program',
      targetId: programId,
      details: { title: prog.title },
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, programId, status: 'published' });
  });

  // =============================================================
  // MODUL 6: Engine Room & Monitoring Integrasi
  // =============================================================
  app.get('/api/v1/admin/engine/outbox', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');

    const [counts] = await db
      .select({
        pending: sql<number>`count(*) filter (where ${integrationOutbox.status} = 'PENDING')`,
        processing: sql<number>`count(*) filter (where ${integrationOutbox.status} = 'PROCESSING')`,
        completed: sql<number>`count(*) filter (where ${integrationOutbox.status} = 'COMPLETED')`,
        failed: sql<number>`count(*) filter (where ${integrationOutbox.status} = 'FAILED')`,
      })
      .from(integrationOutbox);

    const latestEvents = await db
      .select({
        id: integrationOutbox.id,
        organizationId: integrationOutbox.organizationId,
        destination: integrationOutbox.destination,
        operation: integrationOutbox.operation,
        status: integrationOutbox.status,
        attemptCount: integrationOutbox.attemptCount,
        lastErrorCode: integrationOutbox.lastErrorCode,
        createdAt: integrationOutbox.createdAt,
        processedAt: integrationOutbox.processedAt,
      })
      .from(integrationOutbox)
      .orderBy(desc(integrationOutbox.createdAt))
      .limit(50);

    return c.json({
      summary: {
        pending: Number(counts?.pending || 0),
        processing: Number(counts?.processing || 0),
        completed: Number(counts?.completed || 0),
        failed: Number(counts?.failed || 0),
      },
      events: latestEvents,
    });
  });

  app.post('/api/v1/admin/engine/outbox/retry', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const body = await c.req.json().catch(() => ({}));
    const eventId = typeof body?.id === 'string' ? body.id.trim() : null;

    const now = new Date();

    if (eventId) {
      await db
        .update(integrationOutbox)
        .set({
          status: 'PENDING',
          attemptCount: 0,
          nextAttemptAt: now,
          lastErrorCode: null,
        })
        .where(eq(integrationOutbox.id, eventId));
    } else {
      // Retry all failed events
      await db
        .update(integrationOutbox)
        .set({
          status: 'PENDING',
          attemptCount: 0,
          nextAttemptAt: now,
          lastErrorCode: null,
        })
        .where(eq(integrationOutbox.status, 'FAILED'));
    }

    await logAudit(db, {
      adminIdentity: 'superadmin',
      action: 'OUTBOX_RETRY',
      targetType: 'integration_outbox',
      targetId: eventId || 'all_failed',
      ipAddress: c.req.header('cf-connecting-ip'),
    });

    return c.json({ success: true, retriedId: eventId || 'all_failed' });
  });

  app.get('/api/v1/admin/engine/health', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');

    const start = performance.now();
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      // ignore
    }
    const dbLatencyMs = Math.round((performance.now() - start) * 100) / 100;

    const hasR2 = Boolean(c.env?.ASSETS_BUCKET);
    const hasHyperdrive = Boolean(c.env?.HYPERDRIVE);

    return c.json({
      health: {
        dbLatencyMs,
        r2Bucket: hasR2 ? 'CONNECTED' : 'NOT_BOUND',
        hyperdrive: hasHyperdrive ? 'ACCELERATED' : 'DIRECT',
        environment: c.env?.APP_ENV || 'development',
        emailMode: c.env?.EMAIL_MODE || 'log',
        senderEmail: c.env?.EMAIL_FROM || 'noreply@ralivo.biz.id',
      },
    });
  });

  app.get('/api/v1/admin/engine/audit-logs', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');

    const logs = await db
      .select()
      .from(adminAuditLogs)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(100);

    return c.json({ logs });
  });

  // =============================================================
  // MODUL 7: Executive Dashboard (Metrik Pertumbuhan)
  // =============================================================
  app.get('/api/v1/admin/dashboard/overview', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');

    // Total GMV & Paid Order Count
    const [ordersResult] = await db
      .select({
        totalGmv: sql<number>`COALESCE(SUM(${commerceOrders.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(commerceOrders)
      .where(sql`${commerceOrders.status} IN ('PAID', 'APPROVED')`);

    // Total Platform Fees
    const [feeResult] = await db
      .select({ totalFee: sql<number>`COALESCE(SUM(${platformFeeEntries.amount}), 0)` })
      .from(platformFeeEntries)
      .where(sql`${platformFeeEntries.status} IN ('BILLABLE', 'BILLED')`);

    // Total Settled Payouts
    const [payoutResult] = await db
      .select({ totalPayout: sql<number>`COALESCE(SUM(${payoutBatches.totalNet}), 0)` })
      .from(payoutBatches)
      .where(eq(payoutBatches.status, 'PAID'));

    // Count Tenants
    const [tenantCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations);

    // Count Contacts
    const [contactCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts);

    // Attachment Rate calculation
    const [bothEntitled] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productEntitlements)
      .where(and(eq(productEntitlements.promotorClass, true), eq(productEntitlements.promotorFlow, true)));

    const [classEntitled] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productEntitlements)
      .where(eq(productEntitlements.promotorClass, true));

    const [flowEntitled] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productEntitlements)
      .where(eq(productEntitlements.promotorFlow, true));

    // Subscription MRR Estimate
    const [soloSubs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizationSubscriptions)
      .where(and(eq(organizationSubscriptions.planCode, 'SOLO'), eq(organizationSubscriptions.status, 'ACTIVE')));

    const [studioSubs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizationSubscriptions)
      .where(and(eq(organizationSubscriptions.planCode, 'STUDIO'), eq(organizationSubscriptions.status, 'ACTIVE')));

    const mrrEstimate = Number(soloSubs?.count || 0) * 99000 + Number(studioSubs?.count || 0) * 249000;

    const totalTenants = Number(tenantCount?.count || 0);
    const bothCount = Number(bothEntitled?.count || 0);
    const attachmentRate = totalTenants > 0 ? Math.round((bothCount / totalTenants) * 100) : 0;

    // Recent 5 orders
    const recentOrders = await db
      .select({
        id: commerceOrders.id,
        reference: commerceOrders.reference,
        amount: commerceOrders.amount,
        status: commerceOrders.status,
        orgName: organizations.name,
        createdAt: commerceOrders.createdAt,
      })
      .from(commerceOrders)
      .innerJoin(organizations, eq(commerceOrders.organizationId, organizations.id))
      .orderBy(desc(commerceOrders.createdAt))
      .limit(5);

    return c.json({
      metrics: {
        totalGmv: Number(ordersResult?.totalGmv || 0),
        totalOrdersCount: Number(ordersResult?.count || 0),
        netPlatformRevenue: Number(feeResult?.totalFee || 0),
        totalSettledPayouts: Number(payoutResult?.totalPayout || 0),
        totalTenants,
        totalLearnersCount: Number(contactCount?.count || 0),
        attachmentRate,
        classEntitledCount: Number(classEntitled?.count || 0),
        flowEntitledCount: Number(flowEntitled?.count || 0),
        bothEntitledCount: bothCount,
        mrrEstimate,
      },
      recentOrders,
    });
  });
}
