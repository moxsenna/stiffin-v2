import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withIntegrationDb, TEST_DATABASE_URL } from './test-env';
import { seedLearningFixture, requestApp } from './helpers/learning-fixture';

const enabled = Boolean(TEST_DATABASE_URL);

describe('PUT /api/v1/learner/enrollments/:id/lessons/:lessonId/position', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  it('menyimpan posisi dan mengembalikannya di detail enrollment', async () => {
    await withIntegrationDb(async (db) => {
      // seed: organization, program+module+lesson, contact, enrollment (mengikuti helper suite lain)
      const { orgId, programId, lessonId, enrollmentId, contactId, sessionToken } =
        await seedLearningFixture(db);

      const res = await requestApp(db, 'PUT',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/position`,
        { positionSeconds: 435 }, sessionToken);
      assert.equal(res.status, 200);

      const detail = await requestApp(db, 'GET',
        `/api/v1/learner/enrollments/${enrollmentId}`, undefined, sessionToken);
      const modules = detail.body.modules ?? detail.body.program?.modules;
      const lesson = modules.flatMap((m: any) => m.lessons)
        .find((l: any) => l.id === lessonId);
      assert.equal(lesson.lastPositionSeconds, 435);
      assert.equal(lesson.isCompleted, false); // simpan posisi TIDAK menandai selesai
      void orgId; void programId; void contactId;
    });
  });

  it('menolak positionSeconds negatif', async () => {
    await withIntegrationDb(async (db) => {
      const { lessonId, enrollmentId, sessionToken } = await seedLearningFixture(db);
      const res = await requestApp(db, 'PUT',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/position`,
        { positionSeconds: -5 }, sessionToken);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });
});
