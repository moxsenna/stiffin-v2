import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConsultationClaimMessage } from '../lib/wa-templates';

describe('buildConsultationClaimMessage', () => {
  it('memuat nama, program, topik refleksi, dan permintaan klaim', () => {
    const msg = buildConsultationClaimMessage({
      learnerName: 'Budi',
      programTitle: 'Kelas Parenting 101',
      reflectionTopics: ['anak pemalu', 'komunikasi positif'],
    });
    assert.match(msg, /Halo Kak/);
    assert.match(msg, /saya Budi/);
    assert.match(msg, /Kelas Parenting 101/);
    assert.match(msg, /anak pemalu/);
    assert.match(msg, /klaim bonus sesi konsultasi/);
  });

  it('tetap valid tanpa nama dan tanpa topik', () => {
    const msg = buildConsultationClaimMessage({ programTitle: 'Kelas X' });
    assert.doesNotThrow(() => encodeURI(msg));
    assert.match(msg, /Kelas X/);
    assert.match(msg, /klaim bonus sesi konsultasi/);
  });

  it('topik dibatasi maksimal 3', () => {
    const msg = buildConsultationClaimMessage({
      programTitle: 'P',
      reflectionTopics: ['a', 'b', 'c', 'd', 'e'],
    });
    const matches = msg.match(/•/g) ?? [];
    assert.ok(matches.length <= 3);
  });
});
