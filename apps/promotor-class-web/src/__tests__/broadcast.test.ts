import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReminderDraft, buildWaUrl } from '../lib/broadcast';

describe('broadcast reminder', () => {
  it('draft memuat nama, program, dan progres', () => {
    const draft = buildReminderDraft({ name: 'Ayu', programTitle: 'Kelas STIFIn Dasar', progressPercent: 30 });
    assert.match(draft, /Ayu/);
    assert.match(draft, /Kelas STIFIn Dasar/);
    assert.match(draft, /30%/);
  });

  it('wa url membuang karakter non-digit', () => {
    assert.equal(buildWaUrl('+62 812-3456-789', 'hai'), 'https://wa.me/628123456789?text=' + encodeURIComponent('hai'));
  });
});
