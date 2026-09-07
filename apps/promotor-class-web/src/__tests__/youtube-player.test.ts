import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStartSeconds } from '../components/learner/YoutubeLessonPlayer';

describe('resolveStartSeconds', () => {
  it('melanjutkan dari titik terakhir bila > 30 detik dan belum selesai', () => {
    assert.equal(resolveStartSeconds(435, false), 433);
  });
  it('mulai dari 0 bila lesson sudah selesai', () => {
    assert.equal(resolveStartSeconds(600, true), 0);
  });
  it('mulai dari 0 bila posisi tersimpan masih di awal', () => {
    assert.equal(resolveStartSeconds(12, false), 0);
  });
});
