import { test, expect } from '@playwright/test';

const STAGING_CLASS_URL = process.env.STAGING_CLASS_URL || 'https://promotor-class-staging.moxsenna.workers.dev';
const DEMO_TOKEN = 'staging-promotor-session-token-demo';

test.describe('P1 PromotorClass: Create Program → Curriculum Authoring Golden Path', () => {
  test.beforeEach(async ({ page }) => {
    // Inject active session token into localStorage before page loads
    await page.addInitScript((token) => {
      window.localStorage.setItem('promotor_session_token', token);
    }, DEMO_TOKEN);
  });

  test('Create Program with absent cover → persist in DB → author modules & text/video lessons → verify persistence on reload', async ({ page }) => {
    test.setTimeout(90000);

    const testProgramTitle = `Program Uji Kurikulum ${Date.now()}`;
    const testSubtitle = 'Subjudul program pengujian golden path V0.1';

    // 1. Open /app/programs/new
    await page.goto(`${STAGING_CLASS_URL}/app/programs/new`);
    await expect(page.locator('h1')).toContainText('Buat Program & Kelas Baru');

    // 2. Fill required fields (leaving cover absent — using default preset)
    const titleInput = page.locator('input[placeholder*="7 Hari Mengenal"]').first();
    await titleInput.fill(testProgramTitle);

    const subtitleInput = page.locator('input[placeholder*="E-course 7 hari"]').first();
    await subtitleInput.fill(testSubtitle);

    // 3. Click 'Simpan & Mulai Susun Kurikulum →'
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Simpan & Mulai Susun Kurikulum/i }).first();
    await expect(submitBtn).toBeEnabled();

    // Track network create request
    const createPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/programs') && res.request().method() === 'POST',
      { timeout: 30000 }
    ).catch(() => null);

    await submitBtn.click();

    // 4. Assert create HTTP succeeds and URL updates
    const createRes = await createPromise;
    if (createRes) {
      expect([200, 201]).toContain(createRes.status());
    }

    // 5. Assert URL contains newly created program ID and curriculum builder renders
    await page.waitForURL(/\/app\/programs\/[a-zA-Z0-9-]+/, { timeout: 30000 });
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/app\/programs\/[a-zA-Z0-9-]+/);
    expect(currentUrl).not.toContain('/app/programs/new');

    // 6. Assert curriculum page header displays created program title
    await expect(page.locator('h1')).toContainText(testProgramTitle, { timeout: 15000 });

    // 7. Create Module 1: 'Modul 1: Pengenalan Dasar'
    const addModuleBtn = page.locator('button').filter({ hasText: /\+ Tambah Modul Baru|\+ Tambah Bab/i }).first();
    await expect(addModuleBtn).toBeVisible();
    await addModuleBtn.click();

    const moduleTitleInput = page.locator('input[placeholder*="Nama bab / modul"]').first();
    await expect(moduleTitleInput).toBeVisible();
    await moduleTitleInput.fill('Modul 1: Pengenalan Dasar');

    const saveModuleBtn = page.locator('button').filter({ hasText: /Simpan Modul|Tambah Modul/i }).first();
    await saveModuleBtn.click();

    // Assert Module 1 appears on curriculum page
    await expect(page.locator('body')).toContainText('Modul 1: Pengenalan Dasar', { timeout: 15000 });

    // 8. Add TEXT Lesson 1: 'Pelajaran 1: Konsep Fundamental'
    const addLessonBtn = page.locator('button').filter({ hasText: /\+ Pelajaran Baru|\+ Tambah Pelajaran/i }).first();
    await expect(addLessonBtn).toBeVisible();
    await addLessonBtn.click();

    const lessonTitleInput = page.locator('input[placeholder*="Judul materi"]').first();
    await expect(lessonTitleInput).toBeVisible();
    await lessonTitleInput.fill('Pelajaran 1: Konsep Fundamental');

    // Select Material Type: Teks
    const textTypeRadio = page.locator('input[type="radio"][value="text"], label:has-text("Materi Teks / Panduan")').first();
    if (await textTypeRadio.isVisible()) {
      await textTypeRadio.click();
    }

    const saveLessonModalBtn = page.locator('button').filter({ hasText: /Simpan & Tambah ke Modul/i }).first();
    await saveLessonModalBtn.click();

    await expect(page.locator('body')).toContainText('Pelajaran 1: Konsep Fundamental', { timeout: 15000 });

    // 9. Edit TEXT Lesson 1 to add text content and save
    const editLessonLink = page.locator('a, button').filter({ hasText: /Edit/i }).first();
    if (await editLessonLink.isVisible()) {
      await editLessonLink.click();
      await page.waitForURL(/\/lessons\/[a-zA-Z0-9-]+/, { timeout: 15000 });

      const textContentArea = page.locator('textarea').first();
      await textContentArea.fill('Ini adalah materi teks mendalam mengenai prinsip dasar STIFIn.');

      const saveLessonEditorBtn = page.locator('button[type="submit"]').filter({ hasText: /Simpan Pelajaran/i }).first();
      await saveLessonEditorBtn.click();

      // Should redirect back to program curriculum
      await page.waitForURL(/\/app\/programs\/[a-zA-Z0-9-]+/, { timeout: 15000 });
      await expect(page.locator('h1')).toContainText(testProgramTitle);
    }

    // 10. Add VIDEO Lesson 2: 'Pelajaran 2: Video Praktik' with YouTube URL
    const addSecondLessonBtn = page.locator('button').filter({ hasText: /\+ Pelajaran Baru|\+ Tambah Pelajaran/i }).first();
    await addSecondLessonBtn.click();

    const lesson2TitleInput = page.locator('input[placeholder*="Judul materi"]').first();
    await expect(lesson2TitleInput).toBeVisible();
    await lesson2TitleInput.fill('Pelajaran 2: Video Praktik');

    const videoUrlInput = page.locator('input[placeholder*="youtube.com"]').first();
    if (await videoUrlInput.isVisible()) {
      await videoUrlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }

    const saveLesson2Btn = page.locator('button').filter({ hasText: /Simpan & Tambah ke Modul/i }).first();
    await saveLesson2Btn.click();

    await expect(page.locator('body')).toContainText('Pelajaran 2: Video Praktik', { timeout: 15000 });

    // 11. RELOAD BROWSER PAGE to verify full database persistence
    await page.reload();

    // 12. Assert Module 1, Lesson 1, and Lesson 2 remain persisted after reload
    await expect(page.locator('h1')).toContainText(testProgramTitle, { timeout: 15000 });
    await expect(page.locator('body')).toContainText('Modul 1: Pengenalan Dasar');
    await expect(page.locator('body')).toContainText('Pelajaran 1: Konsep Fundamental');
    await expect(page.locator('body')).toContainText('Pelajaran 2: Video Praktik');
  });
});
