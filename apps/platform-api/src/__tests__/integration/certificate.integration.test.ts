import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  withIntegrationDb,
  TEST_DATABASE_URL,
  applyMigrationsAsOwner,
} from './test-env';
import {
  organizations,
  productEntitlements,
  programs,
  modules,
  lessons,
  contacts,
  enrollments,
  workspaceProfiles,
} from '../../db/schema';
import { createApp } from '../../app';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'a6-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('A6 — e-Sertifikat Digital Integration', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let doneOrgId: string;
  let doneEnrollmentId: string;
  let doneCookie: string;
  let partialEnrollmentId: string;
  let partialCookie: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();
      const [org] = await db
        .insert(organizations)
        .values({ name: 'A6 Cert Org', slug: `a6-cert-org-${now}` })
        .returning();
      doneOrgId = org.id;

      await db.insert(productEntitlements).values({
        organizationId: org.id,
        promotorClass: true,
        promotorFlow: true,
      });

      await db.insert(workspaceProfiles).values({
        organizationId: org.id,
        displayName: 'Rina Promotor',
      });

      const [prog] = await db
        .insert(programs)
        .values({
          organizationId: org.id,
          title: 'Kelas Parenting 101',
          slug: `a6-prog-${now}`,
          programType: 'lead_magnet',
          accessType: 'public',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();

      const [mod] = await db
        .insert(modules)
        .values({ programId: prog.id, title: 'Modul 1', order: 1 })
        .returning();

      await db.insert(lessons).values({
        moduleId: mod.id,
        title: 'Pelajaran 1',
        order: 1,
        isRequired: true,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoProvider: 'youtube',
      });

      // Enrollment COMPLETED 100%
      const [doneContact] = await db
        .insert(contacts)
        .values({ organizationId: org.id, name: 'Budi Santoso', phoneE164: `+62812${now % 100000000}` })
        .returning();
      const [doneEnr] = await db
        .insert(enrollments)
        .values({
          organizationId: org.id,
          programId: prog.id,
          contactId: doneContact.id,
          status: 'COMPLETED',
          progressPercent: 100,
          learningStatus: 'COMPLETED',
        })
        .returning();
      doneEnrollmentId = doneEnr.id;

      // Enrollment partial 60%
      const [partContact] = await db
        .insert(contacts)
        .values({ organizationId: org.id, name: 'Siti Partial', phoneE164: `+62813${now % 100000000}` })
        .returning();
      const [partEnr] = await db
        .insert(enrollments)
        .values({
          organizationId: org.id,
          programId: prog.id,
          contactId: partContact.id,
          status: 'STARTED',
          progressPercent: 60,
          learningStatus: 'IN_PROGRESS',
        })
        .returning();
      partialEnrollmentId = partEnr.id;

      // Learner sessions via createSessionForContact
      const { createLearnerSessionService } = await import('../../services/class/learner-session-service');
      const sessionSvc = createLearnerSessionService(db);
      const doneSess = await sessionSvc.createSessionForContact(org.id, doneContact.id);
      doneCookie = `promotor_learner_session=${doneSess.sessionToken}`;
      const partSess = await sessionSvc.createSessionForContact(org.id, partContact.id);
      partialCookie = `promotor_learner_session=${partSess.sessionToken}`;
    });
  });

  it('menerbitkan sertifikat saat COMPLETED 100%', async () => {
    const app = createApp();
    const res = await app.request(
      `/api/v1/learner/enrollments/${doneEnrollmentId}/certificate`,
      { method: 'POST', headers: { Cookie: doneCookie } },
      TEST_ENV as any
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.match(data.certificate.serial, /^RAL-\d{2}-[A-Z0-9]{8}$/);
    assert.equal(data.certificate.recipientName, 'Budi Santoso');
    assert.equal(data.certificate.programTitle, 'Kelas Parenting 101');
    assert.equal(data.certificate.promoterName, 'Rina Promotor');
  });

  it('menolak penerbitan saat progres 60%', async () => {
    const app = createApp();
    const res = await app.request(
      `/api/v1/learner/enrollments/${partialEnrollmentId}/certificate`,
      { method: 'POST', headers: { Cookie: partialCookie } },
      TEST_ENV as any
    );
    assert.equal(res.status, 400);
    const data = (await res.json()) as any;
    assert.equal(data.error?.code ?? data.code, 'PROGRAM_NOT_COMPLETED');
  });

  it('idempotent: terbit 2x menghasilkan serial sama', async () => {
    const app = createApp();
    const r1 = await app.request(
      `/api/v1/learner/enrollments/${doneEnrollmentId}/certificate`,
      { method: 'POST', headers: { Cookie: doneCookie } },
      TEST_ENV as any
    );
    const r2 = await app.request(
      `/api/v1/learner/enrollments/${doneEnrollmentId}/certificate`,
      { method: 'POST', headers: { Cookie: doneCookie } },
      TEST_ENV as any
    );
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    const d1 = (await r1.json()) as any;
    const d2 = (await r2.json()) as any;
    assert.equal(d1.certificate.serial, d2.certificate.serial);
  });

  it('verifikasi publik 200 + serial bogus 404', async () => {
    const app = createApp();
    const issue = await app.request(
      `/api/v1/learner/enrollments/${doneEnrollmentId}/certificate`,
      { method: 'POST', headers: { Cookie: doneCookie } },
      TEST_ENV as any
    );
    const issued = (await issue.json()) as any;
    const serial = issued.certificate.serial as string;

    const ok = await app.request(
      `/api/v1/public/certificates/${encodeURIComponent(serial)}`,
      { method: 'GET' },
      TEST_ENV as any
    );
    assert.equal(ok.status, 200);
    const okData = (await ok.json()) as any;
    assert.equal(okData.certificate.valid, true);
    assert.equal(okData.certificate.serial, serial);

    const bogus = await app.request(
      '/api/v1/public/certificates/RAL-00-XXXXXXXX',
      { method: 'GET' },
      TEST_ENV as any
    );
    assert.equal(bogus.status, 404);
  });
});
