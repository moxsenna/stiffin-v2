import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { calculateAftercareRule } from '../../domain/next-action-rules';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';
import { createBookingService } from '../../services/booking-service';
import {
  contacts,
  contactFlowStates,
  services,
  productEntitlements,
  nextActions,
} from '../../db/schema';
import type { OrganizationContext } from '../../core/organization-context';
import type { AuthenticatedActor } from '../../auth/types';

const enabled = Boolean(TEST_DATABASE_URL);
const app = createApp();

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'aftercare-d7-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

async function seedCompletedBookingFixture(db: NodePgDatabase) {
  const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });
  const unique = `${Date.now()}-${Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 5)}`;
  const email = `operator-${unique}@example.com`;
  const orgSlug = `org-flow-${unique}`;

  const provisioned = await provisionPromotorUser(db, {
    email,
    password: 'Password123!',
    name: 'Operator Aftercare Test',
    organizationName: 'Aftercare Test Academy',
    organizationSlug: orgSlug,
  });

  const organizationId = provisioned.organizationId!;
  const userId = provisioned.userId;

  await db
    .update(productEntitlements)
    .set({ promotorFlow: true, promotorClass: true })
    .where(eq(productEntitlements.organizationId, organizationId));

  const signInRes = await auth.handler(
    new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    })
  );
  const setCookie = signInRes.headers.get('set-cookie');
  assert.ok(setCookie, 'sign-in sets cookie');
  const sessionToken = setCookie.split(';')[0];

  const [service] = await db
    .insert(services)
    .values({
      organizationId,
      name: 'Tes STIFIn Personal',
      category: 'ASSESSMENT',
      priceAmount: 500000,
      durationMinutes: 60,
    })
    .returning();

  const [contact] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: 'Klien Aftercare Test',
      phoneE164: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    })
    .returning();

  await db.insert(contactFlowStates).values({
    organizationId,
    contactId: contact.id,
    stage: 'NEW',
    classification: 'PROSPECT',
  });

  const ctx: OrganizationContext = { organizationId };
  const actor: AuthenticatedActor = {
    userId,
    membershipId: provisioned.membershipId!,
    role: 'owner',
  };

  const now = new Date();
  const bookingService = createBookingService(db, { clock: () => now });

  const booking = await bookingService.createBooking(
    ctx,
    {
      contactId: contact.id,
      serviceId: service.id,
      startAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
      locationType: 'ON_SITE',
      paymentStatus: 'PAID',
    },
    actor
  );

  await bookingService.confirmBooking(ctx, booking.id, actor);
  const completed = await bookingService.completeBooking(ctx, booking.id, actor);

  const [aftercareAction] = await db
    .select()
    .from(nextActions)
    .where(and(eq(nextActions.bookingId, booking.id), eq(nextActions.actionType, 'AFTERCARE')));
  assert.ok(aftercareAction, 'aftercare action must be created');

  return {
    sessionToken,
    bookingId: booking.id,
    contactId: contact.id,
    aftercareActionId: aftercareAction.id,
    completedAt: new Date(completed.completedAt!),
    completedBooking: completed,
    actor,
    ctx,
    bookingService,
  };
}

async function requestOperator(
  _db: NodePgDatabase,
  method: string,
  path: string,
  sessionToken: string,
  body?: unknown
) {
  const reqInit: RequestInit = {
    method,
    headers: {
      cookie: sessionToken,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const res = await app.request(path, reqInit, TEST_ENV as any);
  const text = await res.text();
  let jsonBody: any = null;
  try {
    jsonBody = text ? JSON.parse(text) : null;
  } catch {
    jsonBody = text;
  }

  return {
    status: res.status,
    body: jsonBody,
  };
}

describe('auto aftercare D+7', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  it('booking COMPLETED membuat NextAction AFTERCARE due tepat +7 hari dengan idempotency benar', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, bookingId, contactId, completedAt, ctx, actor, bookingService } =
        await seedCompletedBookingFixture(db);

      // completeBooking dipanggil dalam fixture; verifikasi next action:
      const actions = await requestOperator(db, 'GET', '/api/v1/flow/next-actions?status=PENDING', sessionToken);
      const actionList = actions.body.actions ?? actions.body.nextActions;
      assert.ok(Array.isArray(actionList), 'next-actions harus berupa array');

      const aftercare = actionList.find(
        (a: any) => a.actionType === 'AFTERCARE' && a.contactId === contactId
      );
      assert.ok(aftercare, 'kartu aftercare harus ada di antrean');

      const expected = calculateAftercareRule(completedAt, bookingId);
      assert.equal(new Date(aftercare.dueAt).toISOString(), expected.dueAt.toISOString());
      assert.equal(aftercare.idempotencyKey, expected.idempotencyKey);
      assert.match(aftercare.title, /penerapan hasil tes|aftercare|dampak/i);

      // Idempotency: memanggil completeBooking kembali tidak membuat kartu duplikat
      await bookingService.completeBooking(ctx, bookingId, actor);
      const allAftercare = await db
        .select()
        .from(nextActions)
        .where(and(eq(nextActions.bookingId, bookingId), eq(nextActions.actionType, 'AFTERCARE')));
      assert.equal(allAftercare.length, 1, 'hanya 1 kartu aftercare untuk booking yang sama');
    });
  });

  it('aftercare tidak bisa diselesaikan sebelum due (temporal guard)', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, aftercareActionId } = await seedCompletedBookingFixture(db);
      const res = await requestOperator(
        db,
        'POST',
        `/api/v1/flow/next-actions/${aftercareActionId}/aftercare-complete`,
        sessionToken,
        { outcome: 'HAS_QUESTION', outcomeNotes: 'masih terlalu dini' }
      );
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });
});
