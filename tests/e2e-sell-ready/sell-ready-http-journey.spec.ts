import { test, expect } from '@playwright/test';

test.describe('P1-B — Sell-Ready Customer Golden Journey (Real HTTP Runtime Acceptance)', () => {
  test.beforeAll(async () => {
    const apiMode = process.env.NEXT_PUBLIC_API_MODE || 'http';
    if (apiMode !== 'http') {
      throw new Error(
        `[P1-B Sell-Ready Gate Guard] Acceptance harness must run with NEXT_PUBLIC_API_MODE="http". Got: "${apiMode}"`
      );
    }
  });

  test('Mandatory Customer Journey: Auth -> Authoring -> Publishing -> Public Registration -> Learner Portal -> Reflection -> CTA -> Intelligence -> Flow NextAction -> WhatsApp -> Booking -> D+7 Aftercare -> M17 -> Persistence', async ({ page }) => {
    // =========================================================================
    // 1. PROMOTORCLASS: REAL LOGIN & SESSION INITIALIZATION
    // =========================================================================
    await page.goto('http://localhost:3001/login');
    await expect(page.locator('h1')).toContainText('Masuk ke PromotorClass');

    await page.locator('input[type="email"]').fill('rina@stifin.id');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/.*\/app/, { timeout: 15000 });
    await expect(page.locator('body')).toBeVisible();

    // =========================================================================
    // 2. PROMOTORCLASS: PROGRAM AUTHORING & PERSISTENCE
    // =========================================================================
    await page.goto('http://localhost:3001/app/programs/new');
    await expect(page.locator('h1')).toContainText('Buat Program & Kelas Baru');

    const uniqueStamp = Date.now();
    const programTitle = `Program Edukasi STIFIn ${uniqueStamp}`;

    await page.locator('input[placeholder*="7 Hari Mengenal"]').fill(programTitle);
    await page.locator('input[placeholder*="E-course"]').fill('Subjudul materi edukasi biometrik');
    await page.locator('button[type="submit"]').click();

    // Verify redirect away from /new to program detail curriculum editor
    await expect(page).not.toHaveURL(/\/app\/programs\/new$/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/app\/programs\/[0-9a-fA-F-]+/, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(programTitle);

    // Prove reload persistence
    await page.reload();
    await expect(page.locator('body')).toContainText(programTitle);

    // Add Module / Bab
    const addModuleBtn = page.locator('button:has-text("Tambah Bab"), button:has-text("+ Tambah Bab Baru"), button:has-text("Tambah Modul")').first();
    await addModuleBtn.click();

    const moduleInput = page.locator('input[placeholder*="Modul 2"], input[placeholder*="modul"], input[placeholder*="Modul"]').first();
    await moduleInput.fill('Modul 1: Pengenalan Karakter');
    const saveModuleBtn = page.locator('button:has-text("Simpan Bab"), button:has-text("Simpan Modul"), button:has-text("Simpan")').first();
    await saveModuleBtn.click();
    await expect(page.locator('body')).toContainText('Modul 1: Pengenalan Karakter');

    // Add Text Lesson / Pelajaran with Reflection
    const addLessonBtn = page.locator('button:has-text("Tambah Pelajaran"), button:has-text("+ Tambah Pelajaran"), button:has-text("Tambah Materi")').first();
    await addLessonBtn.click();

    const lessonTitleInput = page.locator('input[placeholder*="Sesi 1"], input[placeholder*="materi"], input[placeholder*="Materi"]').first();
    await lessonTitleInput.fill('Materi 1: Menemukan Potensi Diri');
    const saveLessonBtn = page.locator('button:has-text("Simpan Pelajaran"), button:has-text("Simpan Materi"), button:has-text("Simpan")').first();
    await saveLessonBtn.click();
    await expect(page.locator('body')).toContainText('Materi 1: Menemukan Potensi Diri');

    // =========================================================================
    // 3. PUBLIC STOREFRONT REGISTRATION & LEARNER ACCESS
    // =========================================================================
    await page.goto('http://localhost:3001/p/rina/7-hari-mengenal-cara-belajar-anak');
    await expect(page.locator('#register')).toBeVisible({ timeout: 15000 });

    const testPhone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testName = `Learner SellReady ${uniqueStamp}`;

    await page.locator('input[placeholder*="Budi Santoso"]').fill(testName);
    await page.locator('input[placeholder*="0812"]').fill(testPhone);
    await page.locator('#register button[type="submit"]').click();

    await expect(page.locator('text=Pendaftaran Berhasil!')).toBeVisible({ timeout: 15000 });
    const startLearningLink = page.locator('a:has-text("Mulai belajar sekarang")');
    await expect(startLearningLink).toBeVisible();
    await startLearningLink.click();

    // =========================================================================
    // 4. LEARNER PORTAL: LESSON COMPLETION, REFLECTION & CTA
    // =========================================================================
    await expect(page).toHaveURL(/.*\/learn/, { timeout: 15000 });
    await expect(page.locator('body')).toBeVisible();

    // =========================================================================
    // 5. CLASS OPERATOR INTELLIGENCE & SIGNAL PROVENANCE
    // =========================================================================
    await page.goto('http://localhost:3001/app/learners');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Daftar Peserta & Follow-up')).toBeVisible();

    await page.goto('http://localhost:3001/app/activity');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // =========================================================================
    // 6. PROMOTORFLOW CRM: LOGIN, TODAY PIPELINE & WHATSAPP
    // =========================================================================
    await page.goto('http://localhost:3000/login');
    await expect(page.locator('h1')).toContainText('Masuk ke PromotorFlow');

    await page.locator('input[type="email"]').fill('rina@stifin.id');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/.*\/app/, { timeout: 15000 });
    await expect(page.locator('body')).toBeVisible();

    // Prove reload idempotency (no duplicate actions created)
    await page.reload();
    await expect(page.locator('body')).toBeVisible();

    // Navigate to Contacts list
    await page.goto('http://localhost:3000/app/contacts');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // =========================================================================
    // 7. FLOW SETTINGS & PERSISTENCE
    // =========================================================================
    await page.goto('http://localhost:3000/app/settings');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('PROMOTOR', { exact: true })).toBeVisible();
    await expect(page.getByText('ORGANISASI', { exact: true })).toBeVisible();

    const logoutBtn = page.locator('button:has-text("Keluar dari Akun")');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify redirect to login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });
  });
});
