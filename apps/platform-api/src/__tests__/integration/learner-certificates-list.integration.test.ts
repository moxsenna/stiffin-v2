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
  certificates,
} from '../../db/schema';
import { createApp } from '../../app';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'a7-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('A7 — Riwayat Sertifikat Learner Integration', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgId: string;
  let cookie: string;
  let otherCookie: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();
      const [org] = await db
        .insert(organizations)
        .values({ name: 'A7 Cert List Org', slug: `a7-cert-list-org-${now}` })
        .returning();
      orgId = org.id;

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
          slug: `a7-prog-${now}`,
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

      const [contact] = await db
        .insert(contacts)
        .values({ organizationId: org.id, name: 'Budi Santoso', phoneE164: `+62812${now % 100000000}` })
        .returning();

      const [enrOld] = await db
        .insert(enrollments)
        .values({
          organizationId: org.id,
          programId: prog.id,
          contactId: contact.id,
          status: 'COMPLETED',
          progressPercent: 100,
          learningStatus: 'COMPLETED',
        })
        .returning();

      // Second program for ordering check (unique org+program+contact)
      const [prog2] = await db
        .insert(programs)
        .values({
          organizationId: org.id,
          title: 'Kelas Parenting 102',
          slug: `a7-prog2-${now}`,
          programType: 'lead_magnet',
          accessType: 'public',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();

      const [enrNew] = await db
        .insert(enrollments)
        .values({
          organizationId: org.id,
          programId: prog2.id,
          contactId: contact.id,
          status: 'COMPLETED',
          progressPercent: 100,
          learningStatus: 'COMPLETED',
        })
        .returning();

      await db.insert(certificates).values({
        organizationId: org.id,
        enrollmentId: enrOld.id,
        serial: `A7-OLD-${String(now % 100000000).padStart(8, '0')}`,
        recipientName: 'Budi Santoso',
        programTitle: 'Kelas Parenting 101',
        promoterName: 'Rina Promotor',
        issuedAt: new Date('2026-01-01T00:00:00Z'),
      });
      await db.insert(certificates).values({
        organizationId: org.id,
        enrollmentId: enrNew.id,
        serial: `A7-NEW-${String(now % 100000000).padStart(8, '0')}`,
        recipientName: 'Budi Santoso',
        programTitle: 'Kelas Parenting 102',
        promoterName: 'Rina Promotor',
        issuedAt: new Date('2026-02-01T00:00:00Z'),
      });

      const [other] = await db
        .insert(contacts)
        .values({ organizationId: org.id, name: 'Siti Lain', phoneE164: `+62813${now % 100000000}` })
        .returning();

      const { createLearnerSessionService } = await import('../../services/class/learner-session-service');
      const sessionSvc = createLearnerSessionService(db);
      const sess = await sessionSvc.createSessionForContact(org.id, contact.id);
      cookie = `promotor_learner_session=${sess.sessionToken}`;
      const otherSess = await sessionSvc.createSessionForContact(org.id, other.id);
      otherCookie = `promotor_learner_session=${otherSess.sessionToken}`;
    });
  });

  it('list mengembalikan 2 sertifikat terurut issuedAt desc', async () => {
    void orgId;
    const app = createApp();
    const res = await app.request(
      '/api/v1/learner/me/certificates',
      { method: 'GET', headers: { Cookie: cookie } },
      TEST_ENV as any
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.certificates.length, 2);
    assert.equal(data.certificates[0].programTitle, 'Kelas Parenting 102');
    assert.equal(data.certificates[1].programTitle, 'Kelas Parenting 101');
    assert.ok(new Date(data.certificates[0].issuedAt) > new Date(data.certificates[1].issuedAt));
  });

  it('contact lain tanpa sertifikat → 0', async () => {
    const app = createApp();
    const res = await app.request(
      '/api/v1/learner/me/certificates',
      { method: 'GET', headers: { Cookie: otherCookie } },
      TEST_ENV as any
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.certificates.length, 0);
  });
});
