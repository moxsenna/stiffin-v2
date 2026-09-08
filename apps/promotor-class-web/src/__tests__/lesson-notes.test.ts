import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLessonNoteQuery, saveLessonNoteCommand } from '../modules/learning/notes';

describe('A4 — Frontend Learner Lesson Notes Module', () => {
  it('dapat menyimpan dan mengambil catatan dalam mock mode', async () => {
    const eId = 'enrollment-test-1';
    const lId = 'lesson-test-1';

    const initial = await getLessonNoteQuery(eId, lId);
    assert.equal(initial, null);

    const saved = await saveLessonNoteCommand(eId, lId, 'Catatan eksperimen belajar mandiri');
    assert.equal(saved.body, 'Catatan eksperimen belajar mandiri');
    assert.notEqual(saved.updatedAt, undefined);

    const fetched = await getLessonNoteQuery(eId, lId);
    assert.notEqual(fetched, null);
    assert.equal(fetched?.body, 'Catatan eksperimen belajar mandiri');
  });

  it('menyimpan catatan terpisah untuk lesson berbeda', async () => {
    const eId = 'enrollment-test-1';
    const l1 = 'lesson-alpha';
    const l2 = 'lesson-beta';

    await saveLessonNoteCommand(eId, l1, 'Catatan Alpha');
    await saveLessonNoteCommand(eId, l2, 'Catatan Beta');

    const note1 = await getLessonNoteQuery(eId, l1);
    const note2 = await getLessonNoteQuery(eId, l2);

    assert.equal(note1?.body, 'Catatan Alpha');
    assert.equal(note2?.body, 'Catatan Beta');
  });
});
