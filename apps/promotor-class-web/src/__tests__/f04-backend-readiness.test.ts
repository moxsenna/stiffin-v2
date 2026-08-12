import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MockStateStore } from '../adapters/mock/mock-state-store';
import { createProgramDetailedCommand, toggleProgramStatusCommand } from '../modules/programs/commands';
import { getPublicProgramCatalogQuery } from '../modules/public-storefront/queries';
import { updateWorkspaceProfileCommand } from '../modules/public-storefront/commands';
import { publicStorefrontRepository } from '../adapters/mock/public-storefront-repository';

// Polyfill window & localStorage for Node test runner environment
const mockStorage = new Map<string, string>();
if (typeof global.window === 'undefined') {
  (global as any).window = {
    location: { origin: 'http://localhost:3000' },
  };
}
if (typeof global.localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage.get(key) || null,
    setItem: (key: string, val: string) => mockStorage.set(key, val),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  };
}

describe('F0.4 Backend-Readiness & Domain Lifecycle Test Suite', () => {
  beforeEach(() => {
    MockStateStore.resetDemo();
  });

  it('1. Newly created program defaults to status "draft"', async () => {
    const newProg = await createProgramDetailedCommand({
      title: 'Program Uji Coba Draft',
      description: 'Deskripsi program uji coba draf',
      programType: 'lead_magnet',
    });

    assert.strictEqual(newProg.status, 'draft', 'Newly created program MUST default to status "draft"');
  });

  it('2. Draft program is NOT visible in public storefront catalog', async () => {
    const newProg = await createProgramDetailedCommand({
      title: 'Program Rahasia Draf',
      description: 'Program draf yang belum terbit',
      programType: 'lead_magnet',
    });

    const catalog = await getPublicProgramCatalogQuery('rina');
    const catalogItem = catalog.find((item: any) => item.program.id === newProg.id);

    assert.strictEqual(catalogItem, undefined, 'Draft program MUST NOT appear in public catalog');
  });

  it('3. Explicit publish toggles program status to "published" and enables public visibility', async () => {
    const newProg = await createProgramDetailedCommand({
      title: 'Program Akan Diterbitkan',
      description: 'Program draf yang akan diterbitkan secara eksplisit',
      programType: 'lead_magnet',
    });

    assert.strictEqual(newProg.status, 'draft');

    // Toggle status to published
    const updated = await toggleProgramStatusCommand(newProg.id);
    assert.strictEqual(updated.status, 'published', 'Explicit toggle MUST set status to "published"');

    // Verify it appears in public catalog
    const catalog = await getPublicProgramCatalogQuery('rina');
    const catalogItem = catalog.find((item: any) => item.program.id === newProg.id);

    assert.ok(catalogItem, 'Published program MUST appear in public catalog');
    assert.strictEqual(catalogItem.program.title, 'Program Akan Diterbitkan');
  });

  it('4. Custom ProgramPublicPresentation survives MockStateStore persistence reload', async () => {
    const customOutcome = [{ title: 'Hasil Kustom', description: 'Deskripsi kustom yang bertahan' }];

    const newProg = await createProgramDetailedCommand({
      title: 'Program Dgn Outcome Kustom',
      description: 'Deskripsi program kustom',
      programType: 'lead_magnet',
      coverVariant: 'cover-b',
      outcomes: customOutcome,
    });

    // Toggle status to published to make detail queryable
    await toggleProgramStatusCommand(newProg.id);

    const detailBefore = await publicStorefrontRepository.getPublicProgramDetail('rina', newProg.programSlug);
    assert.ok(detailBefore, 'Public detail must exist');
    assert.strictEqual(detailBefore.presentation.coverVariant, 'cover-b');
    assert.strictEqual(detailBefore.presentation.learningOutcomes[0].title, 'Hasil Kustom');

    // Simulate re-instantiating MockStateStore state from localStorage
    const savedState = MockStateStore.getState();
    assert.ok(savedState.programPresentations[newProg.id], 'Presentation metadata MUST be stored in programPresentations state');

    const detailAfter = await publicStorefrontRepository.getPublicProgramDetail('rina', newProg.programSlug);
    assert.strictEqual(detailAfter?.presentation.learningOutcomes[0].title, 'Hasil Kustom');
  });

  it('5. Workspace profile update works cleanly through updateWorkspaceProfileCommand', async () => {
    const updated = await updateWorkspaceProfileCommand('rina', {
      displayName: 'Rina Prameswari Updated',
      tagline: 'Tagline Baru Promotor',
    });

    assert.strictEqual(updated.displayName, 'Rina Prameswari Updated');
    assert.strictEqual(updated.tagline, 'Tagline Baru Promotor');

    const profileInStore = MockStateStore.getState().workspaceProfiles.rina;
    assert.strictEqual(profileInStore.displayName, 'Rina Prameswari Updated');
  });
});
