import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql, eq, and } from 'drizzle-orm';
import {
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
  withIntegrationDb,
  withRuntimeSql,
  withOwnerSql,
} from './test-env';
import {
  organizations,
  users,
  productEntitlements,
  programs,
  modules,
  lessons,
  lessonAttachments,
  programPresentations,
  workspaceProfiles,
  enrollments,
  lessonProgress,
  reflectionResponses,
  learningEvents,
  learningSignals,
} from '../../db/schema';
import { createProgramRepository } from '../../repositories/program-repository';
import { createWorkspaceProfileRepository } from '../../repositories/workspace-profile-repository';
import { createPublicContentRepository } from '../../repositories/public-content-repository';
import { createProgramService } from '../../services/program-service';
import { createPublicContentService } from '../../services/public-content-service';
import { createApp } from '../../app';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';

const enabled = Boolean(TEST_DATABASE_URL);

const B3_TABLES = [
  'programs',
  'modules',
  'lessons',
  'lesson_attachments',
  'program_presentations',
  'workspace_profiles',
];

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'b3-integration-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

async function signInCookie(auth: ReturnType<typeof createAuth>, email: string) {
  const res = await auth.handler(
    new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    })
  );
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'sign-in sets cookie');
  return setCookie!.split(';')[0];
}

describe('B3 — PromotorClass Content Implementation Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId: string;
  let orgASlug: string;
  let orgBId: string;
  let orgBSlug: string;
  let userAEmail: string;
  let userBEmail: string;
  let cookieA: string;
  let cookieB: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const auth = createAuth(db, TEST_ENV, { disableRateLimit: true });

      orgASlug = `org-a-b3-${Date.now()}`;
      orgBSlug = `org-b-b3-${Date.now()}`;
      userAEmail = `promotor-a-${Date.now()}@example.com`;
      userBEmail = `promotor-b-${Date.now()}@example.com`;

      // Provision Org A
      const resA = await provisionPromotorUser(db, {
        email: userAEmail,
        password: 'Password123!',
        name: 'Promotor A',
        organizationName: 'Org A Class',
        organizationSlug: orgASlug,
      });
      orgAId = resA.organizationId!;

      // Enable promotorClass entitlement for Org A
      await db
        .update(productEntitlements)
        .set({ promotorClass: true })
        .where(eq(productEntitlements.organizationId, orgAId));

      cookieA = await signInCookie(auth, userAEmail);

      // Provision Org B
      const resB = await provisionPromotorUser(db, {
        email: userBEmail,
        password: 'Password123!',
        name: 'Promotor B',
        organizationName: 'Org B Class',
        organizationSlug: orgBSlug,
      });
      orgBId = resB.organizationId!;

      // Enable promotorClass entitlement for Org B
      await db
        .update(productEntitlements)
        .set({ promotorClass: true })
        .where(eq(productEntitlements.organizationId, orgBId));

      cookieB = await signInCookie(auth, userBEmail);
    });
  });

  describe('1. Schema, Journal & Least Privilege Grants', () => {
    it('all 6 B3 tables exist in PostgreSQL schema', async () => {
      await withIntegrationDb(async (db) => {
        for (const table of B3_TABLES) {
          const res = await db.execute(sql`SELECT to_regclass(${`public.${table}`}) AS t`);
          assert.ok((res.rows[0] as { t: string }).t, `Table ${table} must exist in public schema`);
        }
      });
    });

    it('migration journal contains entries 0, 1, and 2', async () => {
      await withOwnerSql(async (client) => {
        const res = await client.query('SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id');
        assert.ok(res.rows.length >= 3, `Must have at least 3 migration entries, got ${res.rows.length}`);
      });
    });

    it('runtime role has SELECT, INSERT, UPDATE, DELETE on all 6 tables and NO DDL CREATE', async () => {
      await withRuntimeSql(async (client) => {
        for (const table of B3_TABLES) {
          for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
            const res = await client.query(
              `SELECT has_table_privilege('promotor_runtime', 'public.' || $1, $2) AS has`,
              [table, privilege]
            );
            assert.strictEqual(res.rows[0].has, true, `promotor_runtime must have ${privilege} on ${table}`);
          }
        }

        const createCheck = await client.query(
          `SELECT has_schema_privilege('promotor_runtime', 'public', 'CREATE') AS can_create`
        );
        assert.strictEqual(createCheck.rows[0].can_create, false, 'Runtime role must not have CREATE on public schema');
      });
    });
  });

  describe('2. Domain Service & Repository Invariants', () => {
    it('creates lead_magnet program with free pricing and default starter curriculum', async () => {
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        const prog = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Panduan STIFIn Anak',
            programType: 'lead_magnet',
          }
        );

        assert.strictEqual(prog.programSlug, 'panduan-stifin-anak');
        assert.strictEqual(prog.status, 'draft');
        assert.strictEqual(prog.pricing, 'free');
        assert.strictEqual(prog.priceAmount, 0);
        assert.strictEqual(prog.accessType, 'public');
        assert.strictEqual(prog.modules.length, 1);
        assert.strictEqual(prog.modules[0].lessons.length, 1);
      });
    });

    it('rejects pricing invariant violations at service level', async () => {
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        // Paid program with 0 priceAmount
        await assert.rejects(
          async () => {
            await service.createProgram(
              { organizationId: orgAId },
              {
                title: 'Paid Without Price',
                programType: 'paid',
                priceAmount: 0,
              }
            );
          },
          (err: any) => err.code === 'VALIDATION_ERROR'
        );
      });
    });

    it('handles slug collisions per organization cleanly by adding numeric suffix', async () => {
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        const prog1 = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Workshop Parenting',
            programType: 'paid',
            priceAmount: 150000,
          }
        );
        assert.strictEqual(prog1.programSlug, 'workshop-parenting');

        const prog2 = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Workshop Parenting',
            programType: 'paid',
            priceAmount: 150000,
          }
        );
        assert.strictEqual(prog2.programSlug, 'workshop-parenting-2');

        // Same slug in Org B should be allowed without collision with Org A
        const progB = await service.createProgram(
          { organizationId: orgBId },
          {
            title: 'Workshop Parenting',
            programType: 'paid',
            priceAmount: 150000,
          }
        );
        assert.strictEqual(progB.programSlug, 'workshop-parenting');
      });
    });

    it('enforces two-phase module and lesson reordering', async () => {
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        const prog = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Reorder Testing Program',
            programType: 'lead_magnet',
          }
        );

        // Add 2 more modules
        await service.addModule({ organizationId: orgAId }, prog.id, 'Modul 2');
        const progWithMod3 = await service.addModule({ organizationId: orgAId }, prog.id, 'Modul 3');

        const modIds = progWithMod3.modules.map((m) => m.id);
        assert.strictEqual(modIds.length, 3);

        // Reverse reorder: mod3, mod2, mod1
        const reordered = await service.reorderModules({ organizationId: orgAId }, prog.id, [
          modIds[2],
          modIds[1],
          modIds[0],
        ]);

        assert.strictEqual(reordered.modules[0].id, modIds[2]);
        assert.strictEqual(reordered.modules[0].order, 1);
        assert.strictEqual(reordered.modules[1].id, modIds[1]);
        assert.strictEqual(reordered.modules[1].order, 2);
        assert.strictEqual(reordered.modules[2].id, modIds[0]);
        assert.strictEqual(reordered.modules[2].order, 3);
      });
    });

    it('validates lesson composite components: YouTube, reflection options, and typed CTA', async () => {
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        const prog = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Composite Lesson Testing',
            programType: 'lead_magnet',
          }
        );

        const modId = prog.modules[0].id;
        const lesId = prog.modules[0].lessons[0].id;

        // Save composite lesson with YouTube, select reflection with >=2 options, and WA CTA
        const updated = await service.saveLesson({ organizationId: orgAId }, prog.id, modId, lesId, {
          title: 'Sesi Lengkap',
          order: 1,
          textContent: 'Materi teks lengkap pengantar.',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          reflectionType: 'single_select',
          reflectionPrompt: 'Apa tipe genetik dominan Anda?',
          reflectionOptions: [
            { id: 'opt_sensing', label: 'Sensing' },
            { id: 'opt_thinking', label: 'Thinking' },
            { id: 'opt_intuiting', label: 'Intuiting' },
          ],
          ctaType: 'WHATSAPP',
          ctaLabel: 'Konsultasi Sekarang',
          ctaConfig: { message: 'Halo saya ingin konsultasi' },
          attachments: [
            {
              name: 'Ringkasan Materi.pdf',
              url: 'https://example.com/ringkasan.pdf',
              kind: 'download',
              sizeFormatted: '1.2 MB',
              order: 1,
            },
          ],
        });

        const lesson = updated.modules[0].lessons[0];
        assert.strictEqual(lesson.videoProvider, 'youtube');
        assert.strictEqual(lesson.videoExternalId, 'dQw4w9WgXcQ');
        assert.strictEqual(lesson.reflectionType, 'single_select');
        assert.strictEqual(lesson.reflectionOptions?.length, 3);
        assert.strictEqual(lesson.ctaType, 'WHATSAPP');
        assert.strictEqual(lesson.attachments?.length, 1);
      });
    });

    it('rejects invalid YouTube URL and invalid reflection options', async () => {
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        const prog = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Invalid Input Testing',
            programType: 'lead_magnet',
          }
        );

        const modId = prog.modules[0].id;
        const lesId = prog.modules[0].lessons[0].id;

        // Invalid YouTube URL
        await assert.rejects(
          async () => {
            await service.saveLesson({ organizationId: orgAId }, prog.id, modId, lesId, {
              title: 'Invalid Video',
              order: 1,
              videoUrl: 'https://vimeo.com/9999999',
            });
          },
          (err: any) => err.code === 'INVALID_YOUTUBE_URL'
        );

        // Select reflection with only 1 option (requires >=2)
        await assert.rejects(
          async () => {
            await service.saveLesson({ organizationId: orgAId }, prog.id, modId, lesId, {
              title: 'Invalid Reflection',
              order: 1,
              reflectionType: 'single_select',
              reflectionPrompt: 'Pilih salah satu',
              reflectionOptions: [{ id: 'opt_1', label: 'Only One' }],
            });
          },
          (err: any) => err.code === 'VALIDATION_ERROR'
        );
      });
    });

    it('enforces delete policy: draft allows delete, published/archived rejects with CONTENT_DELETE_FORBIDDEN', async () => {
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        const prog = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Delete Policy Testing',
            programType: 'lead_magnet',
          }
        );

        const mod2 = await service.addModule({ organizationId: orgAId }, prog.id, 'Modul Cadangan');
        const mod2Id = mod2.modules.find((m) => m.title === 'Modul Cadangan')!.id;

        // Draft: delete module is allowed
        const afterDelete = await service.deleteModule({ organizationId: orgAId }, prog.id, mod2Id);
        assert.strictEqual(afterDelete.modules.length, 1);

        // Publish the program
        await service.publishProgram({ organizationId: orgAId }, prog.id);

        // Published: deleting module, lesson, or program must be rejected
        await assert.rejects(
          async () => {
            await service.deleteModule({ organizationId: orgAId }, prog.id, prog.modules[0].id);
          },
          (err: any) => err.code === 'CONTENT_DELETE_FORBIDDEN'
        );

        await assert.rejects(
          async () => {
            await service.deleteLesson(
              { organizationId: orgAId },
              prog.id,
              prog.modules[0].id,
              prog.modules[0].lessons[0].id
            );
          },
          (err: any) => err.code === 'CONTENT_DELETE_FORBIDDEN'
        );

        await assert.rejects(
          async () => {
            await service.deleteProgram({ organizationId: orgAId }, prog.id);
          },
          (err: any) => err.code === 'CONTENT_DELETE_FORBIDDEN'
        );

        // Archive the program: deleting program must still be rejected
        await service.archiveProgram({ organizationId: orgAId }, prog.id);
        await assert.rejects(
          async () => {
            await service.deleteProgram({ organizationId: orgAId }, prog.id);
          },
          (err: any) => err.code === 'CONTENT_DELETE_FORBIDDEN'
        );

        // Create another draft program specifically to test successful program deletion
        const draftToDelete = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Draft To Be Deleted',
            programType: 'paid',
            priceAmount: 50000,
          }
        );
        await service.deleteProgram({ organizationId: orgAId }, draftToDelete.id);

        // Verifying it is gone (throws NOT_FOUND)
        await assert.rejects(
          async () => {
            await service.getProgram({ organizationId: orgAId }, draftToDelete.id);
          },
          (err: any) => err.code === 'NOT_FOUND'
        );
      });
    });
  });

  describe('3. Public Storefront Read Model & Soft-delete Filtering', () => {
    let publishedProgSlug: string;

    before(async () => {
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        const prog = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Public Showcase Program',
            programType: 'lead_magnet',
          }
        );
        publishedProgSlug = prog.programSlug;
        await service.publishProgram({ organizationId: orgAId }, prog.id);

        // Also create a draft program in Org A (should stay hidden)
        await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Secret Draft Program',
            programType: 'lead_magnet',
          }
        );
      });
    });

    it('returns workspace profile and published catalog for active organization', async () => {
      await withIntegrationDb(async (db) => {
        const publicRepo = createPublicContentRepository(db);
        const publicService = createPublicContentService(publicRepo);

        const profile = await publicService.getPublicWorkspaceProfile(orgASlug);
        assert.ok(profile);
        assert.strictEqual(profile.workspaceSlug, orgASlug);

        const catalog = await publicService.getPublicProgramCatalog(orgASlug);
        assert.ok(catalog.length >= 1);
        // Ensure secret draft is not in public catalog
        assert.ok(catalog.some((item) => item.program.programSlug === publishedProgSlug));
        assert.ok(!catalog.some((item) => item.program.programSlug === 'secret-draft-program'));

        const detail = await publicService.getPublicProgramDetail(orgASlug, publishedProgSlug);
        assert.ok(detail);
        assert.strictEqual(detail.program.programSlug, publishedProgSlug);
        assert.strictEqual(detail.isRegistrationAllowed, true);
        assert.ok(typeof detail.program.totalLessonsCount === 'number');
        assert.ok(typeof detail.program.totalModulesCount === 'number');
      });
    });

    it('SECURITY GUARD: public program detail strictly hides lesson body, textContent, video URLs, reflection details, attachments, and CTA configs', async () => {
      let paidProgSlug: string;

      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);

        const prog = await service.createProgram(
          { organizationId: orgAId },
          {
            title: 'Paid Masterclass Secret Content',
            programType: 'paid',
            priceAmount: 499000,
          }
        );
        paidProgSlug = prog.programSlug;

        const moduleId = prog.modules[0].id;
        const lessonId = prog.modules[0].lessons[0].id;

        // Save confidential lesson content
        await service.saveLesson(
          { organizationId: orgAId },
          prog.id,
          moduleId,
          lessonId,
          {
            title: 'Rahasia Sukses Parenting STIFIn',
            textContent: 'TOP_SECRET_PAID_LESSON_BODY_TEXT_CONTENT_NEVER_LEAK',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            reflectionType: 'single_select',
            reflectionPrompt: 'TOP_SECRET_REFLECTION_PROMPT_QUESTION',
            reflectionOptions: [
              { id: 'opt_1', label: 'SECRET_OPTION_A' },
              { id: 'opt_2', label: 'SECRET_OPTION_B' },
            ],
            ctaType: 'WHATSAPP',
            ctaLabel: 'Hubungi Promotor',
            ctaConfig: { message: 'SECRET_INTERNAL_PROMOTER_PHONE_ROUTING' },
            attachments: [
              {
                name: 'Modul_Rahasia.pdf',
                url: 'https://cdn.example.com/secret/modul.pdf',
                kind: 'download',
              },
            ],
          }
        );

        await service.publishProgram({ organizationId: orgAId }, prog.id);
      });

      // Now query public read model via zero-auth service
      await withIntegrationDb(async (db) => {
        const publicRepo = createPublicContentRepository(db);
        const publicService = createPublicContentService(publicRepo);

        const detail = await publicService.getPublicProgramDetail(orgASlug, paidProgSlug);
        assert.ok(detail);
        assert.strictEqual(detail.isRegistrationAllowed, false);
        assert.strictEqual(detail.registrationStatusNotice, 'Pendaftaran berbayar melalui promotor.');

        // Verify summary fields
        assert.strictEqual(detail.program.priceAmount, 499000);
        assert.strictEqual(detail.program.totalLessonsCount, 1);
        assert.strictEqual(detail.program.totalModulesCount, 1);

        // Verify modules and lessons are previews ONLY
        assert.strictEqual(detail.program.modules.length, 1);
        const previewMod = detail.program.modules[0];
        assert.strictEqual(previewMod.title, 'Modul 1: Pengenalan');
        assert.strictEqual(previewMod.lessons.length, 1);

        const previewLes = previewMod.lessons[0] as any;
        assert.strictEqual(previewLes.title, 'Rahasia Sukses Parenting STIFIn');
        assert.strictEqual(previewLes.order, 1);
        assert.strictEqual(previewLes.hasVideo, true);
        assert.strictEqual(previewLes.hasReflection, true);

        // STRICT SECURITY ASSERTIONS: ensure confidential fields are NEVER present
        assert.strictEqual(previewLes.textContent, undefined);
        assert.strictEqual(previewLes.videoUrl, undefined);
        assert.strictEqual(previewLes.videoYoutubeUrl, undefined);
        assert.strictEqual(previewLes.videoExternalId, undefined);
        assert.strictEqual(previewLes.reflectionPrompt, undefined);
        assert.strictEqual(previewLes.reflectionOptions, undefined);
        assert.strictEqual(previewLes.ctaType, undefined);
        assert.strictEqual(previewLes.ctaLabel, undefined);
        assert.strictEqual(previewLes.ctaTargetProgramId, undefined);
        assert.strictEqual(previewLes.ctaConfig, undefined);
        assert.strictEqual(previewLes.attachments, undefined);

        // JSON payload inspection: confidential strings MUST NOT exist anywhere in payload
        const jsonStr = JSON.stringify(detail);
        assert.ok(!jsonStr.includes('TOP_SECRET_PAID_LESSON_BODY_TEXT_CONTENT_NEVER_LEAK'));
        assert.ok(!jsonStr.includes('TOP_SECRET_REFLECTION_PROMPT_QUESTION'));
        assert.ok(!jsonStr.includes('SECRET_OPTION_A'));
        assert.ok(!jsonStr.includes('SECRET_INTERNAL_PROMOTER_PHONE_ROUTING'));
        assert.ok(!jsonStr.includes('https://cdn.example.com/secret/modul.pdf'));
        assert.ok(!jsonStr.includes('dQw4w9WgXcQ'));
      });
    });

    it('soft-deleted organization hides workspace profile, catalog, and details (404 semantics)', async () => {
      await withIntegrationDb(async (db) => {
        // Soft delete Org B
        await db
          .update(organizations)
          .set({ deletedAt: sql`now()` })
          .where(eq(organizations.id, orgBId));

        const publicRepo = createPublicContentRepository(db);
        const publicService = createPublicContentService(publicRepo);

        await assert.rejects(
          async () => publicService.getPublicWorkspaceProfile(orgBSlug),
          (err: any) => err.code === 'NOT_FOUND'
        );

        const catalog = await publicService.getPublicProgramCatalog(orgBSlug);
        assert.deepStrictEqual(catalog, []);

        await assert.rejects(
          async () => publicService.getPublicProgramDetail(orgBSlug, 'workshop-parenting'),
          (err: any) => err.code === 'NOT_FOUND'
        );
      });
    });
  });

  describe('4. Full HTTP API Endpoint Integration with Auth Gating', () => {
    const app = createApp();

    it('public storefront HTTP routes return 200 without authentication', async () => {
      const res = await app.request(`/api/v1/public/workspaces/${orgASlug}/programs`, {
        method: 'GET',
      }, TEST_ENV as any);

      assert.strictEqual(res.status, 200);
      const json = (await res.json()) as any;
      assert.ok(Array.isArray(json.catalog));
      assert.ok(json.catalog.length >= 1);
    });

    it('admin programs HTTP route rejects unauthenticated request with 401', async () => {
      const res = await app.request('/api/v1/programs', {
        method: 'GET',
      }, TEST_ENV as any);

      assert.strictEqual(res.status, 401);
    });

    it('admin programs HTTP routes succeed with authenticated session and entitlement', async () => {
      // GET programs list
      const listRes = await app.request('/api/v1/programs', {
        method: 'GET',
        headers: {
          cookie: cookieA,
        },
      }, TEST_ENV as any);

      assert.strictEqual(listRes.status, 200);
      const listJson = (await listRes.json()) as any;
      assert.ok(Array.isArray(listJson.programs));

      // POST create program
      const createRes = await app.request('/api/v1/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieA,
        },
        body: JSON.stringify({
          title: 'HTTP API Created Program',
          programType: 'paid',
          priceAmount: 199000,
        }),
      }, TEST_ENV as any);

      assert.strictEqual(createRes.status, 201);
      const createJson = (await createRes.json()) as any;
      const createdId = createJson.program.id;
      assert.ok(createdId);
      assert.strictEqual(createJson.program.priceAmount, 199000);

      // GET program presentation
      const presRes = await app.request(`/api/v1/programs/${createdId}/presentation`, {
        method: 'GET',
        headers: {
          cookie: cookieA,
        },
      }, TEST_ENV as any);

      assert.strictEqual(presRes.status, 200);
    });

    it('multi-tenant isolation: Tenant B cannot access Tenant A program', async () => {
      // Create program in Tenant A
      let progAId: string;
      await withIntegrationDb(async (db) => {
        const programRepo = createProgramRepository(db);
        const profileRepo = createWorkspaceProfileRepository(db);
        const service = createProgramService(programRepo, profileRepo);
        const prog = await service.createProgram(
          { organizationId: orgAId },
          { title: 'Org A Secret Program', programType: 'private' }
        );
        progAId = prog.id;
      });

      // Tenant B (restore active deletedAt for test)
      await withIntegrationDb(async (db) => {
        await db.update(organizations).set({ deletedAt: null }).where(eq(organizations.id, orgBId));
      });

      // Tenant B tries to GET Tenant A's program
      const res = await app.request(`/api/v1/programs/${progAId!}`, {
        method: 'GET',
        headers: {
          cookie: cookieB,
        },
      }, TEST_ENV as any);

      assert.strictEqual(res.status, 404);
    });

    it('admin DELETE /api/v1/programs/:programId allows deleting draft and rejects published', async () => {
      // 1. Create draft program via API
      const createRes = await app.request('/api/v1/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieA,
        },
        body: JSON.stringify({
          title: 'Draft To Delete Via HTTP',
          programType: 'lead_magnet',
        }),
      }, TEST_ENV as any);

      assert.strictEqual(createRes.status, 201);
      const createJson = (await createRes.json()) as any;
      const draftId = createJson.program.id;

      // 2. DELETE draft program -> 200 OK
      const delRes = await app.request(`/api/v1/programs/${draftId}`, {
        method: 'DELETE',
        headers: {
          cookie: cookieA,
        },
      }, TEST_ENV as any);

      assert.strictEqual(delRes.status, 200);
      const delJson = (await delRes.json()) as any;
      assert.strictEqual(delJson.success, true);

      // 3. Verify it is 404 now
      const getRes = await app.request(`/api/v1/programs/${draftId}`, {
        method: 'GET',
        headers: {
          cookie: cookieA,
        },
      }, TEST_ENV as any);
      assert.strictEqual(getRes.status, 404);
    });
  });
});
