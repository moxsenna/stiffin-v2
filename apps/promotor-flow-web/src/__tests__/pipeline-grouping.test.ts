import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PIPELINE_STAGES, STAGE_LABELS, groupContactsByStage } from '../modules/pipeline/grouping';

describe('groupContactsByStage', () => {
  it('mengelompokkan sesuai stage dan menyertakan kolom kosong', () => {
    const contacts = [
      { id: '1', name: 'Ayu', stage: 'NEW' },
      { id: '2', name: 'Arief', stage: 'BOOKED' },
      { id: '3', name: 'Reni', stage: 'BOOKED' },
    ] as any[];
    const grouped = groupContactsByStage(contacts);
    assert.deepEqual(PIPELINE_STAGES, ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'BOOKED', 'COMPLETED', 'LOST']);
    assert.equal(grouped.NEW.length, 1);
    assert.equal(grouped.BOOKED.length, 2);
    assert.equal(grouped.LOST.length, 0);
    assert.equal(STAGE_LABELS.NEW, 'Lead Baru');
    assert.equal(STAGE_LABELS.BOOKED, 'Jadwal Dibuat');
  });

  it('menangani list kosong dengan menghasilkan semua kolom kosong', () => {
    const grouped = groupContactsByStage([]);
    for (const stage of PIPELINE_STAGES) {
      assert.ok(Array.isArray(grouped[stage]));
      assert.equal(grouped[stage].length, 0);
    }
  });
});
