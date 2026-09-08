import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLearningEngineService } from '../services/class/learning-engine-service';
import { UpsertLessonNoteRequestSchema } from '@promotor/contracts';

const orgId = '11111111-1111-4111-8111-111111111111';
const contactId = '22222222-2222-4222-8222-222222222222';
const otherContactId = '33333333-3333-4333-8333-333333333333';
const programId = '44444444-4444-4444-8444-444444444444';
const enrollmentId = '55555555-5555-4555-8555-555555555555';
const lessonId = '66666666-6666-4666-8666-666666666666';

function createMockDeps() {
  const store = new Map<string, { body: string; updatedAt: Date }>();

  const mockEnrollmentRepo: any = {
    async getById(oId: string, eId: string) {
      if (oId === orgId && eId === enrollmentId) {
        return {
          id: enrollmentId,
          organizationId: orgId,
          contactId,
          programId,
          status: 'STARTED',
        };
      }
      return null;
    },
  };

  const mockProgramRepo: any = {
    async findById({ organizationId }: { organizationId: string }, pId: string) {
      if (organizationId === orgId && pId === programId) {
        return {
          id: programId,
          organizationId: orgId,
          title: 'Program Uji',
          modules: [
            {
              id: 'm1',
              title: 'Modul 1',
              lessons: [
                {
                  id: lessonId,
                  title: 'Materi 1',
                  isRequired: true,
                },
              ],
            },
          ],
        };
      }
      return null;
    },
  };

  const mockLessonNoteRepo: any = {
    async findByEnrollmentAndLesson(oId: string, eId: string, lId: string) {
      const key = `${oId}:${eId}:${lId}`;
      const item = store.get(key);
      if (!item) return null;
      return {
        id: 'n1',
        organizationId: oId,
        enrollmentId: eId,
        lessonId: lId,
        body: item.body,
        updatedAt: item.updatedAt,
        createdAt: item.updatedAt,
      };
    },
    async upsert(oId: string, eId: string, lId: string, body: string) {
      const key = `${oId}:${eId}:${lId}`;
      const updatedAt = new Date('2026-09-09T08:00:00.000Z');
      store.set(key, { body, updatedAt });
      return {
        id: 'n1',
        organizationId: oId,
        enrollmentId: eId,
        lessonId: lId,
        body,
        updatedAt,
        createdAt: updatedAt,
      };
    },
  };

  return {
    enrollmentRepo: mockEnrollmentRepo,
    programRepo: mockProgramRepo,
    lessonNoteRepo: mockLessonNoteRepo,
  };
}

describe('A4 — Learner Lesson Notes Service & Invariants', () => {
  it('UpsertLessonNoteRequestSchema validasi string trim, kosong, dan batas 5000 karakter', () => {
    const valid = UpsertLessonNoteRequestSchema.safeParse({ body: '   Catatan penting   ' });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.body, 'Catatan penting');
    }

    const empty = UpsertLessonNoteRequestSchema.safeParse({ body: '    ' });
    assert.equal(empty.success, false);

    const tooLong = UpsertLessonNoteRequestSchema.safeParse({ body: 'a'.repeat(5001) });
    assert.equal(tooLong.success, false);
  });

  it('mengembalikan null saat belum ada catatan yang disimpan', async () => {
    const deps = createMockDeps();
    const service = createLearningEngineService({} as any, deps);

    const result = await service.getLessonNote({
      organizationId: orgId,
      enrollmentId,
      lessonId,
      authenticatedContactId: contactId,
    });

    assert.equal(result, null);
  });

  it('berhasil menyimpan dan membaca catatan pribadi milik sendiri', async () => {
    const deps = createMockDeps();
    const service = createLearningEngineService({} as any, deps);

    const saved = await service.saveLessonNote({
      organizationId: orgId,
      enrollmentId,
      lessonId,
      authenticatedContactId: contactId,
      body: 'Gaya belajar visual dominan pada materi ini.',
    });

    assert.equal(saved.body, 'Gaya belajar visual dominan pada materi ini.');
    assert.equal(typeof saved.updatedAt, 'string');

    const fetched = await service.getLessonNote({
      organizationId: orgId,
      enrollmentId,
      lessonId,
      authenticatedContactId: contactId,
    });

    assert.notEqual(fetched, null);
    assert.equal(fetched?.body, 'Gaya belajar visual dominan pada materi ini.');
  });

  it('menolak akses jika authenticatedContactId tidak cocok (FORBIDDEN)', async () => {
    const deps = createMockDeps();
    const service = createLearningEngineService({} as any, deps);

    await assert.rejects(
      async () => {
        await service.getLessonNote({
          organizationId: orgId,
          enrollmentId,
          lessonId,
          authenticatedContactId: otherContactId,
        });
      },
      (err: any) => {
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );
  });

  it('menolak jika lessonId tidak terdaftar pada program (NOT_FOUND)', async () => {
    const deps = createMockDeps();
    const service = createLearningEngineService({} as any, deps);

    await assert.rejects(
      async () => {
        await service.getLessonNote({
          organizationId: orgId,
          enrollmentId,
          lessonId: '00000000-0000-0000-0000-000000000000',
          authenticatedContactId: contactId,
        });
      },
      (err: any) => {
        assert.equal(err.code, 'NOT_FOUND');
        return true;
      }
    );
  });
});
