import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MockStateStore } from '../adapters/mock/mock-state-store';
import {
  getPublicWorkspaceQuery,
  listPublicProgramsQuery,
  getPublicProgramDetailQuery,
} from '../modules/public-storefront/queries';
import { matchOrCreateContactCommand } from '../modules/contacts/commands';
import { createEnrollmentCommand } from '../modules/enrollments/commands';
import { getActiveLearnerContactId, setActiveLearnerSession, clearActiveLearnerSession } from '../lib/session';

describe('PromotorClass F0.2 Public Storefront & Access Policy Test Suite', () => {
  beforeEach(() => {
    MockStateStore.resetDemo();
    clearActiveLearnerSession();
  });

  it('1. Workspace Query: Valid workspace slug returns profile, invalid returns null', async () => {
    const validProfile = await getPublicWorkspaceQuery('rina');
    assert.strictEqual(validProfile !== null, true);
    assert.strictEqual(validProfile?.displayName, 'Rina Prameswari');
    assert.strictEqual(validProfile?.workspaceSlug, 'rina');

    const invalidProfile = await getPublicWorkspaceQuery('invalid-promoter');
    assert.strictEqual(invalidProfile, null, 'Invalid workspace slug MUST return null');
  });

  it('2. Public Catalog Access Policy: Filters private & draft programs correctly', async () => {
    const catalog = await listPublicProgramsQuery('rina');

    // Total 3 public displayable programs: prog_7_hari_belajar, prog_30_hari_setelah_tes, prog_parenting_growth
    assert.strictEqual(catalog.length, 3);

    const programIds = catalog.map(item => item.program.id);
    assert.strictEqual(programIds.includes('prog_7_hari_belajar'), true);
    assert.strictEqual(programIds.includes('prog_30_hari_setelah_tes'), true);
    assert.strictEqual(programIds.includes('prog_parenting_growth'), true);

    // Private and Draft programs MUST NOT be in public catalog
    assert.strictEqual(programIds.includes('prog_private_mentoring'), false, 'Private program MUST NOT be in public catalog');
    assert.strictEqual(programIds.includes('prog_draft_concept'), false, 'Draft program MUST NOT be in public catalog');
  });

  it('3. Public Access Policy: Lead Magnet (free, public) allows public registration', async () => {
    const detail = await getPublicProgramDetailQuery('rina', '7-hari-mengenal-cara-belajar-anak');
    assert.strictEqual(detail !== null, true);
    assert.strictEqual(detail?.isRegistrationAllowed, true, 'lead_magnet free public program MUST allow registration');
    assert.strictEqual(detail?.registrationStatusNotice, undefined);
  });

  it('4. Public Access Policy: Aftersales program is discoverable but public registration is BLOCKED', async () => {
    const detail = await getPublicProgramDetailQuery('rina', '30-hari-setelah-tes');
    assert.strictEqual(detail !== null, true);
    assert.strictEqual(detail?.isRegistrationAllowed, false, 'aftersales program MUST block public registration');
    assert.strictEqual(
      detail?.registrationStatusNotice,
      'Program ini khusus untuk klien yang telah menyelesaikan tes STIFIn.'
    );
  });

  it('5. Public Access Policy: Paid program is discoverable, displays canonical price, but free enrollment is BLOCKED', async () => {
    const detail = await getPublicProgramDetailQuery('rina', 'parenting-growth');
    assert.strictEqual(detail !== null, true);
    assert.strictEqual(detail?.program.priceAmount, 450000);
    assert.strictEqual(detail?.isRegistrationAllowed, false, 'paid program MUST block free public enrollment');
    assert.strictEqual(
      detail?.registrationStatusNotice,
      'Program Berbayar — Hubungi Promotor / Tersedia via Konsultasi.'
    );
  });

  it('6. Detail Slug Validation: Invalid program slug or mismatched workspace returns null', async () => {
    const invalidProgram = await getPublicProgramDetailQuery('rina', 'invalid-program-slug');
    assert.strictEqual(invalidProgram, null, 'Invalid program slug MUST return null');

    const mismatchedWorkspace = await getPublicProgramDetailQuery('wrong-promoter', '7-hari-mengenal-cara-belajar-anak');
    assert.strictEqual(mismatchedWorkspace, null, 'Mismatched workspace slug MUST return null');

    const draftProgram = await getPublicProgramDetailQuery('rina', 'draft-konsep-baru');
    assert.strictEqual(draftProgram, null, 'Draft program detail route MUST return null');
  });

  it('7. Domain Registration Flow: Contact matching, deduplication, and single enrollment creation', async () => {
    // 1st Registration
    const c1 = await matchOrCreateContactCommand('Ayu Test', '081987654321');
    assert.strictEqual(c1.id, 'contact_ayu', 'Same normalized phone MUST reuse existing Contact ID');

    setActiveLearnerSession({ contactId: c1.id, workspaceSlug: 'rina' });
    assert.strictEqual(getActiveLearnerContactId(), 'contact_ayu');

    const enr1 = await createEnrollmentCommand(c1.id, 'prog_7_hari_belajar');
    assert.strictEqual(enr1.id, 'enr_ayu_7hari');

    // Duplicate Registration attempt
    const enr2 = await createEnrollmentCommand(c1.id, 'prog_7_hari_belajar');
    assert.strictEqual(enr2.id, 'enr_ayu_7hari', 'Duplicate enrollment MUST return existing enrollment idempotently');
  });

  it('8. Architecture Guardrail: Public UI components do NOT directly import MockStateStore or fixtures', () => {
    const componentsDir = path.join(__dirname, '../components/public');
    const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(componentsDir, file), 'utf-8');
      assert.strictEqual(
        content.includes('MockStateStore'),
        false,
        `Component ${file} MUST NOT import MockStateStore directly`
      );
      assert.strictEqual(
        content.includes('@promotor/promotor-class-fixtures'),
        false,
        `Component ${file} MUST NOT import fixtures directly`
      );
    }
  });
});
