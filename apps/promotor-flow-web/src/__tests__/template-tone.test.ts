import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickTemplateByTone, createMessagingQueries } from '../modules/messaging/queries';

const templates = [
  { id: '1', category: 'FOLLOW_UP', templateText: 'Netral [Nama]', tone: null, title: 'T1', isActive: true },
  { id: '2', category: 'FOLLOW_UP', templateText: 'Formal [Nama]', tone: 'FORMAL', title: 'T2', isActive: true },
  { id: '3', category: 'FOLLOW_UP', templateText: 'Hangat [Nama]', tone: 'HANGAT', title: 'T3', isActive: true },
];

describe('pickTemplateByTone', () => {
  it('memilih template sesuai tone', () => {
    assert.equal(pickTemplateByTone(templates as any, 'FOLLOW_UP', 'HANGAT')?.id, '3');
  });
  it('fallback ke netral bila tone tidak tersedia', () => {
    assert.equal(pickTemplateByTone(templates as any, 'FOLLOW_UP', 'URGENT')?.id, '1');
  });
  it('fallback ke template pertama bila tidak ada netral', () => {
    const noNeutral = templates.filter((t) => t.tone !== null);
    assert.equal(pickTemplateByTone(noNeutral as any, 'FOLLOW_UP', 'URGENT')?.id, '2');
  });
});

describe('generateDraftMessage with tone', () => {
  const mockRepo = {
    listTemplates: async () => [
      { id: '1', category: 'FOLLOW_UP', templateText: 'Netral [Nama] [Tanggal] [Amount] [Layanan]', tone: null, title: 'T1', isActive: true },
      { id: '2', category: 'FOLLOW_UP', templateText: 'Formal Bapak/Ibu [Nama] [Tanggal] [Amount] [Layanan]', tone: 'FORMAL', title: 'T2', isActive: true },
      { id: '3', category: 'FOLLOW_UP', templateText: 'Hangat Kak [Nama] [Tanggal] [Amount] [Layanan]', tone: 'HANGAT', title: 'T3', isActive: true },
    ],
    getTemplateByCategory: async () => null,
  };
  const messaging = createMessagingQueries(mockRepo as any);

  it('menghasilkan draft sesuai tone terpilih dengan interpolasi', async () => {
    const draft = await messaging.generateDraftMessage('FOLLOW_UP', 'Budi', { serviceTitle: 'Tes STIFIn', amount: 500000 }, 'HANGAT');
    assert.match(draft, /Hangat Kak Budi/);
    assert.match(draft, /Tes STIFIn/);
    assert.match(draft, /500\.000/);
  });

  it('fallback ke netral saat tone URGENT tidak tersedia', async () => {
    const draft = await messaging.generateDraftMessage('FOLLOW_UP', 'Budi', undefined, 'URGENT');
    assert.match(draft, /Netral Budi/);
  });
});
