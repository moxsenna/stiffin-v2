import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { withIntegrationDb, TEST_DATABASE_URL } from './test-env';
import { learningSignals } from '../../db/schema/learning-signals';
import { createLearningEngineService } from '../../services/class/learning-engine-service';
import { seedLearningFixture } from './helpers/learning-fixture';

const enabled = Boolean(TEST_DATABASE_URL);
const LONG_TEXT = 'Anak saya jadi lebih tenang setelah saya mencoba cara komunikasi positif dari modul ini. '.repeat(3);

const seedClassFixture = seedLearningFixture;

describe('refleksi mendalam memicu sinyal WA', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  it('membuat REFLECTION_SUBMITTED signal untuk refleksi >= 80 karakter', async () => {
    await withIntegrationDb(async (db) => {
      const { orgId, contactId, enrollmentId, lessonId } = await seedClassFixture(db);
      await createLearningEngineService(db).submitReflection({
        organizationId: orgId,
        enrollmentId,
        lessonId,
        responseText: LONG_TEXT,
        authenticatedContactId: contactId,
      });
      const signals = await db
        .select()
        .from(learningSignals)
        .where(eq(learningSignals.type, 'REFLECTION_SUBMITTED'));
      assert.equal(signals.length, 1);
      assert.match(signals[0].reason, /Refleksi \d+ kata/);
      assert.equal(signals[0].recommendedActionType, 'WHATSAPP_REPLY');
    });
  });

  it('refleksi pendek tidak memicu sinyal', async () => {
    await withIntegrationDb(async (db) => {
      const { orgId, contactId, enrollmentId, lessonId } = await seedClassFixture(db);
      await createLearningEngineService(db).submitReflection({
        organizationId: orgId,
        enrollmentId,
        lessonId,
        responseText: 'Setuju.',
        authenticatedContactId: contactId,
      });
      const signals = await db
        .select()
        .from(learningSignals)
        .where(eq(learningSignals.type, 'REFLECTION_SUBMITTED'));
      assert.equal(signals.length, 0);
    });
  });

  it('idempoten: submit ulang refleksi tidak menduplikasi sinyal aktif', async () => {
    await withIntegrationDb(async (db) => {
      const { orgId, contactId, enrollmentId, lessonId } = await seedClassFixture(db);
      const engine = createLearningEngineService(db);
      await engine.submitReflection({
        organizationId: orgId,
        enrollmentId,
        lessonId,
        responseText: LONG_TEXT,
        authenticatedContactId: contactId,
      });
      await engine.submitReflection({
        organizationId: orgId,
        enrollmentId,
        lessonId,
        responseText: LONG_TEXT + ' Tambahan kalimat.',
        authenticatedContactId: contactId,
      });
      const signals = await db
        .select()
        .from(learningSignals)
        .where(eq(learningSignals.type, 'REFLECTION_SUBMITTED'));
      assert.equal(signals.length, 1);
    });
  });
});
