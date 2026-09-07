import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAttachmentRows, emptyAttachmentRow } from '../modules/programs/attachments';

describe('normalizeAttachmentRows', () => {
  it('membuang row kosong dan memotong spasi', () => {
    const rows = [
      { kind: 'download' as const, name: '  Worksheet.pdf ', url: ' https://drive.google.com/f  ' },
      { kind: 'download' as const, name: '', url: '' },
    ];
    const result = normalizeAttachmentRows(rows);
    assert.deepEqual(result, [{ kind: 'download', name: 'Worksheet.pdf', url: 'https://drive.google.com/f' }]);
  });

  it('membuang row dengan url tidak valid', () => {
    const result = normalizeAttachmentRows([{ kind: 'download', name: 'X', url: 'bukan-url' }]);
    assert.deepEqual(result, []);
  });

  it('default kind = download bila kosong', () => {
    const result = normalizeAttachmentRows([{ kind: undefined as any, name: 'Audio.mp3', url: 'https://x.com/a.mp3' }]);
    assert.equal(result[0].kind, 'download');
  });

  it('emptyAttachmentRow memberi row kosong baru', () => {
    assert.deepEqual(emptyAttachmentRow(), { kind: 'download', name: '', url: '' });
  });
});
