import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql, eq, and } from 'drizzle-orm';
import {
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
  withIntegrationDb,
} from './test-env';
import {
  organizations,
  users,
  productEntitlements,
  organizationMembers,
  contacts,
  contactFlowStates,
  services,
  bookings,
  nextActions,
  activities,
  aftercareRecords,
  messageTemplates,
  contactAssessments,
} from '../../db/schema';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'b6-flow-api-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

async function signInCookie(auth: ReturnType<typeof createAuth>, email: string) {
  const res = await auth.handler(
    new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    })
  );
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'sign-in sets cookie');
  return setCookie!.split(';')[0];
}

describe('B6 — Flow HTTP API Integration Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  const app = createApp();

  let orgAId: string;
  let orgASlug: string;
  let orgBId: string;
  let orgBSlug: string;

  let userAEmail: string;
  let userBEmail: string;
  let userMemberEmail: string;
  let userNoEntitlementEmail: string;

  let cookieA: string;
  let cookieB: string;
  let cookieMember: string;
  let cookieNoEntitlement: string;

  let serviceAId: string;
  let contactA1Id: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });

      orgASlug = `org-a-flow-${Date.now()}`;
      orgBSlug = `org-b-flow-${Date.now()}`;
      const orgNoEntSlug = `org-noent-${Date.now()}`;

      userAEmail = `promotor-flow-a-${Date.now()}@example.com`;
      userBEmail = `promotor-flow-b-${Date.now()}@example.com`;
      userMemberEmail = `member-a-${Date.now()}@example.com`;
      userNoEntitlementEmail = `noent-${Date.now()}@example.com`;

      // 1. Provision Org A (Owner)
      const resA = await provisionPromotorUser(db, {
        email: userAEmail,
        password: 'Password123!',
        name: 'Promotor A Flow',
        organizationName: 'Org A Flow Academy',
        organizationSlug: orgASlug,
      });
      orgAId = resA.organizationId!;

      // Enable promotorFlow entitlement for Org A
      await db
        .update(productEntitlements)
        .set({ promotorFlow: true, promotorClass: true })
        .where(eq(productEntitlements.organizationId, orgAId));

      cookieA = await signInCookie(auth, userAEmail);

      // 2. Provision Member for Org A (role: member)
      const resMember = await provisionPromotorUser(db, {
        email: userMemberEmail,
        password: 'Password123!',
        name: 'Staff Member A',
        organizationName: 'Org A Flow Member',
        organizationSlug: `org-a-flow-member-${Date.now()}`,
      });

      // Point member to Org A and set role = 'member'
      await db
        .update(organizationMembers)
        .set({ organizationId: orgAId, role: 'member' })
        .where(eq(organizationMembers.userId, resMember.userId!));

      cookieMember = await signInCookie(auth, userMemberEmail);

      // 3. Provision Org B (Owner)
      const resB = await provisionPromotorUser(db, {
        email: userBEmail,
        password: 'Password123!',
        name: 'Promotor B Flow',
        organizationName: 'Org B Flow Academy',
        organizationSlug: orgBSlug,
      });
      orgBId = resB.organizationId!;

      // Enable promotorFlow entitlement for Org B
      await db
        .update(productEntitlements)
        .set({ promotorFlow: true, promotorClass: true })
        .where(eq(productEntitlements.organizationId, orgBId));

      cookieB = await signInCookie(auth, userBEmail);

      // 4. Provision Org with promotorFlow = false
      const resNoEnt = await provisionPromotorUser(db, {
        email: userNoEntitlementEmail,
        password: 'Password123!',
        name: 'Promotor No Entitlement',
        organizationName: 'Org No Entitlement',
        organizationSlug: orgNoEntSlug,
      });
      const orgNoEntId = resNoEnt.organizationId!;

      await db
        .update(productEntitlements)
        .set({ promotorFlow: false, promotorClass: true })
        .where(eq(productEntitlements.organizationId, orgNoEntId));

      cookieNoEntitlement = await signInCookie(auth, userNoEntitlementEmail);

      // Seed initial Service & Contact for Org A
      const [svc] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Tes Bakat Genetik STIFIn',
          description: 'Tes sidik jari biometrik dan konsultasi',
          category: 'ASSESSMENT',
          priceAmount: 500000,
          depositAmount: 100000,
          durationMinutes: 60,
          isActive: true,
        })
        .returning();
      serviceAId = svc.id;

      const [c1] = await db
        .insert(contacts)
        .values({
          organizationId: orgAId,
          name: 'Budi Santoso',
          phoneE164: '+6281234567890',
        })
        .returning();
      contactA1Id = c1.id;

      await db.insert(contactFlowStates).values({
        organizationId: orgAId,
        contactId: contactA1Id,
        stage: 'NEW',
        classification: 'PROSPECT',
        interest: 'Tes Minat Bakat Anak',
      });
    });
  });

  // =========================================================================
  // 1. AUTHENTICATION & AUTHORIZATION GATES (§12)
  // =========================================================================
  describe('1. Authentication & Authorization Gates', () => {
    it('unauthenticated request rejects with 401', async () => {
      const res = await app.request(
        '/api/v1/flow/today',
        { method: 'GET' },
        TEST_ENV as any
      );
      assert.strictEqual(res.status, 401);
      const json = (await res.json()) as any;
      assert.strictEqual(json.error.code, 'UNAUTHORIZED');
    });

    it('organization without promotorFlow entitlement rejects with 403 ENTITLEMENT_DENIED', async () => {
      const res = await app.request(
        '/api/v1/flow/today',
        {
          method: 'GET',
          headers: { cookie: cookieNoEntitlement },
        },
        TEST_ENV as any
      );
      assert.strictEqual(res.status, 403);
      const json = (await res.json()) as any;
      assert.strictEqual(json.error.code, 'ENTITLEMENT_DENIED');
    });

    it('member role rejects with 403 FORBIDDEN when owner/admin is required', async () => {
      const res = await app.request(
        '/api/v1/flow/today',
        {
          method: 'GET',
          headers: { cookie: cookieMember },
        },
        TEST_ENV as any
      );
      assert.strictEqual(res.status, 403);
      const json = (await res.json()) as any;
      assert.strictEqual(json.error.code, 'FORBIDDEN');
    });

    it('owner role succeeds and returns 200', async () => {
      const res = await app.request(
        '/api/v1/flow/today',
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );
      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.ok(typeof json.totalActiveCount === 'number');
      assert.ok(json.groups);
    });
  });

  // =========================================================================
  // 2. CONTACTS ROUTE SURFACE (§5.1, §5.2, §12)
  // =========================================================================
  describe('2. Contacts Route Surface', () => {
    let createdContactId: string;

    it('POST /api/v1/flow/contacts creates contact with non-empty interest', async () => {
      const res = await app.request(
        '/api/v1/flow/contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            name: 'Ahmad Dahlan',
            phoneRaw: '081298765432',
            interest: 'Konsultasi Karir dan Bisnis',
            email: 'ahmad@example.com',
            sourceChannel: 'INSTAGRAM',
            notes: 'Tertarik tes STIFIn untuk tim kerja',
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 201);
      const json = (await res.json()) as any;
      assert.ok(json.contact.id);
      assert.strictEqual(json.contact.name, 'Ahmad Dahlan');
      assert.strictEqual(json.contact.phoneE164, '+6281298765432');
      assert.strictEqual(json.flowState.stage, 'NEW');
      assert.strictEqual(json.flowState.classification, 'PROSPECT');
      assert.strictEqual(json.flowState.interest, 'Konsultasi Karir dan Bisnis');
      assert.ok(json.leadAction);
      assert.strictEqual(json.leadAction.actionType, 'CONTACT_LEAD');

      createdContactId = json.contact.id;
    });

    it('POST /api/v1/flow/contacts rejects empty interest with 400 VALIDATION_ERROR', async () => {
      const res = await app.request(
        '/api/v1/flow/contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            name: 'Citra Dewi',
            phoneRaw: '081211112222',
            interest: '   ', // whitespace only
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 400);
      const json = (await res.json()) as any;
      assert.strictEqual(json.error.code, 'VALIDATION_ERROR');
    });

    it('GET /api/v1/flow/contacts lists contacts with search & classification filter', async () => {
      const res = await app.request(
        '/api/v1/flow/contacts?search=Ahmad&classification=PROSPECT',
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.ok(Array.isArray(json.contacts));
      assert.ok(json.contacts.some((c: any) => c.name === 'Ahmad Dahlan'));
    });

    it('GET /api/v1/flow/contacts/:id returns FlowContactContext', async () => {
      const res = await app.request(
        `/api/v1/flow/contacts/${createdContactId}`,
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.strictEqual(json.context.contact.id, createdContactId);
      assert.strictEqual(json.context.stage, 'NEW');
      assert.strictEqual(json.context.interest, 'Konsultasi Karir dan Bisnis');
      assert.ok(json.context.primaryNextAction);
    });

    it('PATCH /api/v1/flow/contacts/:id updates interest, notes, and sourceChannel', async () => {
      const res = await app.request(
        `/api/v1/flow/contacts/${createdContactId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            interest: 'Workshop Parenting STIFIn',
            notes: 'Updated client notes',
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.strictEqual(json.flowState.interest, 'Workshop Parenting STIFIn');
      assert.strictEqual(json.flowState.notes, 'Updated client notes');
    });

    it('POST /api/v1/flow/contacts/:id/stage transitions stage (requiring lostReason for LOST)', async () => {
      // 1. Transition to LOST without reason -> 400
      const failRes = await app.request(
        `/api/v1/flow/contacts/${createdContactId}/stage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            stage: 'LOST',
          }),
        },
        TEST_ENV as any
      );
      assert.strictEqual(failRes.status, 400);

      // 2. Transition to LOST with reason -> 200
      const okRes = await app.request(
        `/api/v1/flow/contacts/${createdContactId}/stage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            stage: 'LOST',
            lostReason: 'Budget belum tersedia',
          }),
        },
        TEST_ENV as any
      );
      assert.strictEqual(okRes.status, 200);
      const okJson = (await okRes.json()) as any;
      assert.strictEqual(okJson.flowState.stage, 'LOST');
      assert.strictEqual(okJson.flowState.lostReason, 'Budget belum tersedia');

      // 3. Transition to INTERESTED clears lostReason
      const reopenRes = await app.request(
        `/api/v1/flow/contacts/${createdContactId}/stage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            stage: 'INTERESTED',
          }),
        },
        TEST_ENV as any
      );
      assert.strictEqual(reopenRes.status, 200);
      const reopenJson = (await reopenRes.json()) as any;
      assert.strictEqual(reopenJson.flowState.stage, 'INTERESTED');
      assert.strictEqual(reopenJson.flowState.lostReason, null);
    });

    it('GET /api/v1/flow/contacts/:id/activities returns timeline activities', async () => {
      const res = await app.request(
        `/api/v1/flow/contacts/${createdContactId}/activities`,
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.ok(Array.isArray(json.activities));
      assert.ok(json.activities.length >= 2);
    });

    it('GET /api/v1/flow/contacts/:id/assessment-status returns NOT_STARTED default', async () => {
      const res = await app.request(
        `/api/v1/flow/contacts/${createdContactId}/assessment-status`,
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.strictEqual(json.assessment.status, 'NOT_STARTED');
    });

    it('TENANT GUARD: Org B cannot read or mutate Org A contact (fails with 404)', async () => {
      const readRes = await app.request(
        `/api/v1/flow/contacts/${createdContactId}`,
        {
          method: 'GET',
          headers: { cookie: cookieB },
        },
        TEST_ENV as any
      );
      assert.strictEqual(readRes.status, 404);

      const patchRes = await app.request(
        `/api/v1/flow/contacts/${createdContactId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieB,
          },
          body: JSON.stringify({ notes: 'Hacked note' }),
        },
        TEST_ENV as any
      );
      assert.strictEqual(patchRes.status, 404);
    });
  });

  // =========================================================================
  // 3. SERVICES & TEMPLATES ROUTE SURFACE (§5.7, §5.9, §12)
  // =========================================================================
  describe('3. Services & Message Templates Route Surface', () => {
    let createdServiceId: string;
    let createdTemplateId: string;

    it('POST & GET /api/v1/flow/services', async () => {
      const createRes = await app.request(
        '/api/v1/flow/services',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            name: 'Konsultasi Keluarga',
            category: 'SESSION',
            priceAmount: 750000,
            depositAmount: 250000,
            durationMinutes: 90,
            isActive: true,
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(createRes.status, 201);
      const createdJson = (await createRes.json()) as any;
      createdServiceId = createdJson.service.id;
      assert.strictEqual(createdJson.service.priceAmount, 750000);

      // GET list
      const listRes = await app.request(
        '/api/v1/flow/services',
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );
      assert.strictEqual(listRes.status, 200);
      const listJson = (await listRes.json()) as any;
      assert.ok(listJson.services.some((s: any) => s.id === createdServiceId));

      // PATCH update
      const patchRes = await app.request(
        `/api/v1/flow/services/${createdServiceId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            priceAmount: 800000,
          }),
        },
        TEST_ENV as any
      );
      assert.strictEqual(patchRes.status, 200);
      const patchJson = (await patchRes.json()) as any;
      assert.strictEqual(patchJson.service.priceAmount, 800000);
    });

    it('POST & GET /api/v1/flow/message-templates', async () => {
      const createRes = await app.request(
        '/api/v1/flow/message-templates',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            title: 'Sapaan Pertama Calon Klien',
            category: 'CONTACT_LEAD',
            bodyText: 'Halo Kak {name}, terima kasih sudah menghubungi STIFIn...',
            isActive: true,
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(createRes.status, 201);
      const createdJson = (await createRes.json()) as any;
      createdTemplateId = createdJson.template.id;

      // GET list
      const listRes = await app.request(
        '/api/v1/flow/message-templates?category=CONTACT_LEAD',
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );
      assert.strictEqual(listRes.status, 200);
      const listJson = (await listRes.json()) as any;
      assert.ok(listJson.templates.some((t: any) => t.id === createdTemplateId));

      // PATCH update
      const patchRes = await app.request(
        `/api/v1/flow/message-templates/${createdTemplateId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            title: 'Sapaan Hangat Calon Klien (Updated)',
          }),
        },
        TEST_ENV as any
      );
      assert.strictEqual(patchRes.status, 200);
    });
  });

  // =========================================================================
  // 4. BOOKINGS LIFECYCLE & STATE MACHINE (§5.3, §12)
  // =========================================================================
  describe('4. Bookings Lifecycle & State Machine', () => {
    let bookingId: string;

    it('POST /api/v1/flow/bookings snapshots server service price as amount', async () => {
      const res = await app.request(
        '/api/v1/flow/bookings',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            contactId: contactA1Id,
            serviceId: serviceAId,
            startAt: new Date(Date.now() + 86400000).toISOString(),
            locationType: 'ON_SITE',
            locationText: 'Kantor Cabang STIFIn Jakarta',
            notes: 'Tes pertama',
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 201);
      const json = (await res.json()) as any;
      bookingId = json.booking.id;
      assert.strictEqual(json.booking.status, 'PENDING');
      assert.strictEqual(json.booking.amount, 500000, 'Amount must snapshot services.priceAmount');
    });

    it('GET /api/v1/flow/bookings & GET /api/v1/flow/bookings/:id', async () => {
      const listRes = await app.request(
        `/api/v1/flow/bookings?contactId=${contactA1Id}`,
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );
      assert.strictEqual(listRes.status, 200);
      const listJson = (await listRes.json()) as any;
      assert.ok(listJson.bookings.some((b: any) => b.id === bookingId));

      const detailRes = await app.request(
        `/api/v1/flow/bookings/${bookingId}`,
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );
      assert.strictEqual(detailRes.status, 200);
      const detailJson = (await detailRes.json()) as any;
      assert.strictEqual(detailJson.booking.id, bookingId);
    });

    it('POST /api/v1/flow/bookings/:id/confirm transitions PENDING to CONFIRMED', async () => {
      const res = await app.request(
        `/api/v1/flow/bookings/${bookingId}/confirm`,
        {
          method: 'POST',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.strictEqual(json.booking.status, 'CONFIRMED');
    });

    it('POST /api/v1/flow/bookings/:id/mark-paid marks booking as PAID', async () => {
      const res = await app.request(
        `/api/v1/flow/bookings/${bookingId}/mark-paid`,
        {
          method: 'POST',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.strictEqual(json.booking.paymentStatus, 'PAID');
    });

    it('POST /api/v1/flow/bookings/:id/reschedule updates booking startAt', async () => {
      const newStartAt = new Date(Date.now() + 172800000).toISOString();
      const res = await app.request(
        `/api/v1/flow/bookings/${bookingId}/reschedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            startAt: newStartAt,
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.strictEqual(new Date(json.booking.startAt).toISOString(), newStartAt);
    });

    it('POST /api/v1/flow/bookings/:id/complete marks COMPLETED, promotes sticky CLIENT, provisions D+7 aftercare', async () => {
      const res = await app.request(
        `/api/v1/flow/bookings/${bookingId}/complete`,
        {
          method: 'POST',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.strictEqual(json.booking.status, 'COMPLETED');

      // Verify contact context has sticky CLIENT
      const contactRes = await app.request(
        `/api/v1/flow/contacts/${contactA1Id}`,
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );
      const contactJson = (await contactRes.json()) as any;
      assert.strictEqual(contactJson.context.stage, 'COMPLETED');
      assert.strictEqual(contactJson.context.classification, 'CLIENT');

      // Verify Aftercare endpoint has 1 scheduled record with status PENDING
      const aftercareRes = await app.request(
        '/api/v1/flow/aftercare?status=PENDING',
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );
      assert.strictEqual(aftercareRes.status, 200);
      const aftercareJson = (await aftercareRes.json()) as any;
      assert.ok(aftercareJson.records.some((r: any) => r.bookingId === bookingId));
    });

    it('invalid booking transition (e.g. reschedule or cancel a COMPLETED booking) rejects with 400 INVALID_BOOKING_STATE', async () => {
      const res = await app.request(
        `/api/v1/flow/bookings/${bookingId}/reschedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            startAt: new Date().toISOString(),
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 400);
      const json = (await res.json()) as any;
      assert.strictEqual(json.error.code, 'VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 5. NEXT ACTIONS & MESSAGING ROUTE SURFACE (§5.4, §5.8, §12)
  // =========================================================================
  describe('5. Next Actions & Messaging Route Surface', () => {
    let actionId: string;

    it('POST /api/v1/flow/next-actions creates manual/follow-up action', async () => {
      const res = await app.request(
        '/api/v1/flow/next-actions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            contactId: contactA1Id,
            actionType: 'MANUAL',
            title: 'Kirim materi pengayaan STIFIn',
            description: 'Kirim modul PDF pengayaan via WhatsApp',
            dueAt: new Date(Date.now() + 86400000).toISOString(),
            priority: 50,
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 201);
      const json = (await res.json()) as any;
      actionId = json.nextAction.id;
      assert.strictEqual(json.nextAction.title, 'Kirim materi pengayaan STIFIn');
      assert.strictEqual(json.nextAction.status, 'PENDING');
    });

    it('POST /api/v1/flow/messaging/whatsapp-opened records WHATSAPP_OPENED without completing action', async () => {
      const res = await app.request(
        '/api/v1/flow/messaging/whatsapp-opened',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            contactId: contactA1Id,
            rawText: 'Halo Budi, berikut materi STIFIn Anda',
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.ok(json.url.startsWith('https://wa.me/'));

      // Verify NextAction is STILL PENDING (opening wa.me does not complete)
      const checkRes = await app.request(
        `/api/v1/flow/next-actions?contactId=${contactA1Id}&status=PENDING`,
        {
          method: 'GET',
          headers: { cookie: cookieA },
        },
        TEST_ENV as any
      );
      const checkJson = (await checkRes.json()) as any;
      assert.ok(checkJson.nextActions.some((a: any) => a.id === actionId));
    });

    it('POST /api/v1/flow/messaging/confirm-sent explicitly confirms send and completes action', async () => {
      const res = await app.request(
        '/api/v1/flow/messaging/confirm-sent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            nextActionId: actionId,
          }),
        },
        TEST_ENV as any
      );

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.strictEqual(json.nextAction.status, 'COMPLETED');
    });

    it('POST /api/v1/flow/next-actions/:id/skip requires nextStep (P0-6)', async () => {
      // Create new action to test skip
      const actRes = await app.request(
        '/api/v1/flow/next-actions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            contactId: contactA1Id,
            actionType: 'FOLLOW_UP',
            title: 'Follow-up telepon sore',
          }),
        },
        TEST_ENV as any
      );
      const actJson = (await actRes.json()) as any;
      const skipTargetId = actJson.nextAction.id;

      // 1. Skip without nextStep -> 400
      const badRes = await app.request(
        `/api/v1/flow/next-actions/${skipTargetId}/skip`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({}),
        },
        TEST_ENV as any
      );
      assert.strictEqual(badRes.status, 400);

      // 2. Skip with valid nextStep -> 200
      const okRes = await app.request(
        `/api/v1/flow/next-actions/${skipTargetId}/skip`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieA,
          },
          body: JSON.stringify({
            nextStep: {
              type: 'FOLLOW_UP',
              title: 'Hubungi lagi besok pagi',
              dueAt: new Date(Date.now() + 86400000).toISOString(),
            },
          }),
        },
        TEST_ENV as any
      );
      assert.strictEqual(okRes.status, 200);
      const okJson = (await okRes.json()) as any;
      assert.strictEqual(okJson.skippedAction.status, 'SKIPPED');
      assert.strictEqual(okJson.newAction.status, 'PENDING');
      assert.strictEqual(okJson.newAction.title, 'Hubungi lagi besok pagi');
    });
  });
});
