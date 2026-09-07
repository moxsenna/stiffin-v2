import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

if (typeof globalThis.Storage === 'undefined') {
  class MockStorage {
    private store = new Map<string, string>();
    get length() {
      return this.store.size;
    }
    clear() {
      this.store.clear();
    }
    getItem(key: string) {
      return this.store.has(key) ? this.store.get(key)! : null;
    }
    setItem(key: string, value: string) {
      this.store.set(key, String(value));
    }
    removeItem(key: string) {
      this.store.delete(key);
    }
    key(index: number) {
      return Array.from(this.store.keys())[index] ?? null;
    }
  }
  globalThis.Storage = MockStorage as unknown as typeof Storage;
  globalThis.localStorage = new MockStorage() as unknown as Storage;
}

import {
  buildReflectionDraftKey,
  saveReflectionDraft,
  loadReflectionDraft,
  clearReflectionDraft,
} from '../lib/reflection-draft';

describe('reflection draft storage', () => {
  beforeEach(() => localStorage.clear());

  it('membuat key per enrollment+lesson', () => {
    assert.equal(buildReflectionDraftKey('e1', 'l2'), 'reflection_draft:e1:l2');
  });

  it('menyimpan dan membaca draft', () => {
    saveReflectionDraft(buildReflectionDraftKey('e1', 'l2'), 'Anak saya pemalu...');
    assert.equal(loadReflectionDraft(buildReflectionDraftKey('e1', 'l2')), 'Anak saya pemalu...');
  });

  it('mengembalikan null jika tidak ada draft', () => {
    assert.equal(loadReflectionDraft(buildReflectionDraftKey('x', 'y')), null);
  });

  it('menghapus draft', () => {
    const key = buildReflectionDraftKey('e1', 'l2');
    saveReflectionDraft(key, 'isi');
    clearReflectionDraft(key);
    assert.equal(loadReflectionDraft(key), null);
  });

  it('tidak melempar error saat localStorage gagal (private mode)', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceeded');
    };
    assert.doesNotThrow(() => saveReflectionDraft('k', 'v'));
    Storage.prototype.setItem = orig;
  });
});
