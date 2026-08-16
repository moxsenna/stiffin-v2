import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseYoutubeUrl, buildYoutubeEmbedUrl } from '../services/program/youtube';
import { slugifyTitle } from '../services/program/slug';

describe('B3 — Class-owned program helpers', () => {
  describe('YouTube parser', () => {
    it('accepts standard watch URL', () => {
      const res = parseYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      assert.deepStrictEqual(res, {
        provider: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ',
      });
    });

    it('accepts short youtu.be URL', () => {
      const res = parseYoutubeUrl('https://youtu.be/dQw4w9WgXcQ');
      assert.deepStrictEqual(res, {
        provider: 'youtube',
        url: 'https://youtu.be/dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ',
      });
    });

    it('accepts embed URL', () => {
      const res = parseYoutubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      assert.deepStrictEqual(res, {
        provider: 'youtube',
        url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ',
      });
    });

    it('accepts shorts URL', () => {
      const res = parseYoutubeUrl('https://youtube.com/shorts/dQw4w9WgXcQ?feature=share');
      assert.deepStrictEqual(res, {
        provider: 'youtube',
        url: 'https://youtube.com/shorts/dQw4w9WgXcQ?feature=share',
        externalId: 'dQw4w9WgXcQ',
      });
    });

    it('rejects invalid or non-YouTube URLs', () => {
      assert.strictEqual(parseYoutubeUrl('https://vimeo.com/123456789'), null);
      assert.strictEqual(parseYoutubeUrl('https://youtube.com/watch?v=short'), null);
      assert.strictEqual(parseYoutubeUrl('not-a-url'), null);
      assert.strictEqual(parseYoutubeUrl(''), null);
    });

    it('builds official embed URL', () => {
      assert.strictEqual(buildYoutubeEmbedUrl('dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
      assert.throws(() => buildYoutubeEmbedUrl('invalid'));
    });
  });

  describe('slugifyTitle', () => {
    it('normalizes spaces, punctuation, and diacritics', () => {
      assert.strictEqual(slugifyTitle('Parenting Anak Usia Dini!'), 'parenting-anak-usia-dini');
      assert.strictEqual(slugifyTitle('  Kelas  &  Workshop  #1  '), 'kelas-workshop-1');
      assert.strictEqual(slugifyTitle('Élégant Café'), 'elegant-cafe');
    });

    it('handles fallback for empty/punctuation-only title', () => {
      assert.strictEqual(slugifyTitle('!!!'), 'program');
      assert.strictEqual(slugifyTitle(''), 'program');
    });
  });
});
