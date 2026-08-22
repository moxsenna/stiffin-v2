import { test, expect } from '@playwright/test';

const STAGING_API_URL = 'https://stiffin-promotor-api-staging.moxsenna.workers.dev';
const STAGING_CLASS_URL = 'https://promotor-class-staging.moxsenna.workers.dev';
const STAGING_FLOW_URL = 'https://promotor-flow-staging.moxsenna.workers.dev';

test.describe('PROMOTOR PLATFORM V0.1 — Live Staging Customer Acceptance Journey', () => {
  test('Complete Customer Journey on Live Deployed Cloudflare Staging Workers', async ({ page }) => {
    test.setTimeout(300000);

    const uniqueStamp = Date.now();
    const programTitle = `Program Edukasi STIFIn Live ${uniqueStamp}`;
    const programSubtitle = `Subjudul Materi Edukasi ${uniqueStamp}`;
    const testName = `Learner Staging ${uniqueStamp}`;
    const testPhone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;

    // =========================================================================
    // 1. PROMOTORCLASS: REAL CLEAN LOGIN & SESSION INITIALIZATION
    // =========================================================================
    await page.goto(`${STAGING_CLASS_URL}/login`);
    await expect(page.locator('h1')).toContainText('Masuk ke PromotorClass');

    await page.locator('input[type="email"]').fill('rina@stifin.id');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/.*\/app/, { timeout: 20000 });
    await expect(page.locator('body')).toBeVisible();

    // =========================================================================
    // 2. PROMOTORCLASS: CREATE UNIQUE PROGRAM, MODULE, TEXT & VIDEO LESSONS
    // =========================================================================
    await page.goto(`${STAGING_CLASS_URL}/app/programs/new`);
    await expect(page.locator('h1')).toContainText('Buat Program & Kelas Baru');

    await page.locator('input[placeholder*="7 Hari Mengenal"]').fill(programTitle);
    await page.locator('input[placeholder*="E-course"]').fill(programSubtitle);
    await page.locator('button[type="submit"]').click();

    // Verify redirect to program detail curriculum editor
    await expect(page).not.toHaveURL(/\/app\/programs\/new$/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/app\/programs\/[0-9a-fA-F-]+/, { timeout: 20000 });
    await expect(page.locator('body')).toContainText(programTitle);

    const programUrl = page.url();
    const programId = programUrl.split('/programs/')[1].split('/')[0].split('?')[0];

    // Configure Lesson 1: Text Lesson with Reflection
    const editLesson1Link = page.locator('a:has-text("Edit Content →")').first();
    await editLesson1Link.click();
    await expect(page.locator('h1')).toContainText('Editor Materi Pelajaran', { timeout: 15000 });

    const titleInput1 = page.locator('[data-testid="lesson-title-input"], input[placeholder*="Otak Kanan"]').first();
    await expect(titleInput1).toBeVisible();
    await titleInput1.fill('Pelajaran 1: Mengenal Karakter Diri');
    await page.locator('textarea[placeholder*="Tuliskan uraian materi"]').fill('Materi lengkap tentang mengenali kekuatan karakter personal dan biometrik.');
    const reflectionCheckbox1 = page.locator('input[type="checkbox"]').first();
    await reflectionCheckbox1.check();
    await page.locator('input[placeholder*="membuka wawasan"]').fill('Tuliskan 1 pemahaman kunci yang paling Anda rasakan:');
    await page.locator('button[type="submit"]').click();

    // Back on program detail page
    await expect(page).toHaveURL(new RegExp(`/app/programs/${programId}`), { timeout: 20000 });

    // Add Lesson 2: YouTube Video Lesson with Reflection and CTA
    const addLessonBtn2 = page.locator('button:has-text("+ Tambah Pelajaran"), button:has-text("Tambah Pelajaran")').first();
    await addLessonBtn2.click();

    await page.locator('input[placeholder*="Sesi 1"]').fill('Pelajaran 2: Analisis Video Praktik');
    await page.locator('label:has-text("Video YouTube") input[type="radio"]').check();
    await page.locator('input[placeholder*="youtube.com"]').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.locator('textarea[placeholder*="Tuliskan poin utama"]').fill('Video analisis mendalam studi kasus implementasi pola karakter.');
    await page.locator('button:has-text("Simpan Pelajaran")').click();
    await expect(page.locator('body')).toContainText('Pelajaran 2: Analisis Video Praktik', { timeout: 15000 });

    // Wait for the second edit link to be ready
    const editLesson2Link = page.locator('a:has-text("Edit Content →")').nth(1);
    await expect(editLesson2Link).toBeVisible({ timeout: 15000 });
    await editLesson2Link.click();
    await expect(page.locator('h1')).toContainText('Editor Materi Pelajaran', { timeout: 15000 });

    await page.locator('input[placeholder*="youtube.com"]').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const reflectionCheckbox2 = page.locator('input[type="checkbox"]').first();
    await reflectionCheckbox2.check();
    await page.locator('input[placeholder*="membuka wawasan"]').fill('Apa insight utama yang Anda peroleh dari video analisis ini?');

    // Enable CTA
    const ctaCheckbox2 = page.locator('input[type="checkbox"]').nth(1);
    await ctaCheckbox2.check();
    await page.locator('input[placeholder*="Konsultasi via WhatsApp"]').fill('Konsultasi via WhatsApp');
    await page.locator('input[placeholder*="wa.me"]').fill('https://wa.me/6281234567890');
    await page.locator('button[type="submit"]').click();

    // Back on program detail page
    await expect(page).toHaveURL(new RegExp(`/app/programs/${programId}`), { timeout: 20000 });

    // =========================================================================
    // 3. PUBLISH THE NEWLY CREATED PROGRAM & ASSERT PERSISTENCE
    // =========================================================================
    const publishBtn = page.locator('button:has-text("Terbitkan")');
    await publishBtn.click();
    await expect(page.getByText('Terbit di Storefront', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('button:has-text("Ubah ke Draf")')).toBeVisible();

    // Open Share Modal to obtain canonical public URL
    const shareBtn = page.locator('button:has-text("Bagikan Tautan")');
    await shareBtn.click();
    const publicUrlInput = page.locator('input[readonly]');
    await expect(publicUrlInput).toBeVisible();
    const rawPublicUrl = await publicUrlInput.inputValue();
    const publicPath = rawPublicUrl.includes('/p/') ? '/p/' + rawPublicUrl.split('/p/')[1] : rawPublicUrl;
    const publicUrl = `${STAGING_CLASS_URL}${publicPath}`;

    // Reload authoring page and verify persistence of all authored elements
    await page.reload();
    await expect(page.locator('h1').first()).toContainText(programTitle);
    await expect(page.getByText('Terbit di Storefront', { exact: true })).toBeVisible();
    await expect(page.locator('body')).toContainText('Modul 1: Pengenalan');
    await expect(page.locator('body')).toContainText('Pelajaran 1: Mengenal Karakter Diri');
    await expect(page.locator('body')).toContainText('Pelajaran 2: Analisis Video Praktik');

    // =========================================================================
    // 4. LEARNER CONSUMPTION: REGISTER INTO NEW PROGRAM & COMPLETE JOURNEY
    // =========================================================================
    await page.goto(publicUrl);
    await expect(page.locator('#register')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('body')).toContainText(programTitle);

    await page.locator('input[placeholder*="Budi Santoso"]').fill(testName);
    await page.locator('input[placeholder*="0812"]').fill(testPhone);
    await page.locator('#register button[type="submit"]').click();

    await expect(page.locator('text=Pendaftaran Berhasil!')).toBeVisible({ timeout: 20000 });
    const startLearningLink = page.locator('a:has-text("Mulai belajar sekarang")');
    await expect(startLearningLink).toBeVisible();
    await startLearningLink.click();

    // Assert Learner Portal curriculum view
    await expect(page).toHaveURL(/.*\/learn\/programs\/[0-9a-fA-F-]+/, { timeout: 20000 });
    await expect(page.locator('body')).toContainText(programTitle);

    const enrollmentUrl = page.url();
    const enrollmentId = enrollmentUrl.split('/programs/')[1].split('/')[0].split('?')[0];

    // Open Lesson 1
    const lesson1Link = page.locator('a:has-text("Pelajaran 1: Mengenal Karakter Diri")');
    await expect(lesson1Link).toBeVisible({ timeout: 15000 });
    await lesson1Link.click();

    await page.waitForURL(/\/learn\/programs\/[0-9a-fA-F-]+\/lessons\/[0-9a-fA-F-]+/, { timeout: 20000 });
    await expect(page.locator('body')).toContainText('Pelajaran 1: Mengenal Karakter Diri', { timeout: 20000 });
    await expect(page.locator('text=Refleksi Wajib *')).toBeVisible({ timeout: 20000 });

    // Fill reflection and complete lesson 1
    await page.locator('textarea[placeholder*="Tuliskan refleksi"]').fill('Saya memahami bahwa potensi genetik membuka jalan eksplorasi diri yang optimal.');
    const completeLesson1Btn = page.locator('button:has-text("Tandai Selesai & Lanjut")');
    await expect(completeLesson1Btn).toBeEnabled({ timeout: 15000 });
    await completeLesson1Btn.click();

    // Returned to curriculum view, now open Lesson 2 (YouTube + Reflection + CTA)
    await expect(page).toHaveURL(new RegExp(`/learn/programs/${enrollmentId}(/)?$`), { timeout: 20000 });

    const lesson2Link = page.locator('a:has-text("Pelajaran 2: Analisis Video Praktik")');
    await expect(lesson2Link).toBeVisible({ timeout: 15000 });
    await lesson2Link.click();

    await page.waitForURL(/\/learn\/programs\/[0-9a-fA-F-]+\/lessons\/[0-9a-fA-F-]+/, { timeout: 20000 });
    await expect(page.locator('body')).toContainText('Pelajaran 2: Analisis Video Praktik', { timeout: 20000 });
    await expect(page.locator('iframe')).toBeVisible({ timeout: 20000 });

    // Click CTA button
    const ctaLink = page.locator('a:has-text("Konsultasi via WhatsApp")');
    await expect(ctaLink).toBeVisible({ timeout: 15000 });
    await ctaLink.click();

    // Fill reflection and complete lesson 2
    await page.locator('textarea[placeholder*="Tuliskan refleksi"]').fill('Video analisis kasus ini memberikan pemahaman aplikatif yang sangat jelas.');
    const completeLesson2Btn = page.locator('button:has-text("Tandai Selesai & Lanjut")');
    await expect(completeLesson2Btn).toBeEnabled({ timeout: 15000 });
    await completeLesson2Btn.click();

    // Program is now 100% completed -> redirects to completion page
    await expect(page).toHaveURL(new RegExp(`/learn/programs/${enrollmentId}/completed`), { timeout: 20000 });
    await expect(page.locator('body')).toContainText('Program Selesai');
    await expect(page.locator('body')).toContainText(programTitle);

    // =========================================================================
    // 5. CLASS OPERATOR INTELLIGENCE WITH EXACT VALUES
    // =========================================================================
    await page.goto(`${STAGING_CLASS_URL}/app/learners`);
    await expect(page.locator('text=Daftar Peserta & Follow-up')).toBeVisible({ timeout: 20000 });

    // Assert exact learner row
    const learnerRow = page.locator('[data-testid="learner-item"]').filter({ hasText: testName }).first();
    await expect(learnerRow).toBeVisible({ timeout: 20000 });
    await expect(learnerRow).toContainText('Progres: 100%');
    await expect(learnerRow).toContainText('Minat tinggi');

    // Click learner row to open LearnerDetail drawer
    await learnerRow.click();
    const learnerDrawer = page.locator('.side-panel.active').first();
    await expect(learnerDrawer).toBeVisible({ timeout: 15000 });
    await expect(learnerDrawer).toContainText(testName);
    await expect(learnerDrawer).toContainText('Minat tinggi');
    await expect(learnerDrawer).toContainText('100%');

    // Activity Log verification
    await page.goto(`${STAGING_CLASS_URL}/app/activity`);
    await expect(page.locator('body')).toBeVisible({ timeout: 20000 });

    // =========================================================================
    // 6. CLASS -> FLOW EXACTLY ONCE & WHATSAPP CONFIRMATION
    // =========================================================================
    await page.goto(`${STAGING_FLOW_URL}/login`);
    await expect(page.locator('h1')).toContainText('Masuk ke PromotorFlow');

    await page.locator('input[type="email"]').fill('rina@stifin.id');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/.*\/app/, { timeout: 20000 });

    // Navigate to Contacts list and find learner contact
    await page.goto(`${STAGING_FLOW_URL}/app/contacts`);
    await expect(page.locator('body')).toContainText(testName, { timeout: 20000 });

    const contactRow = page.locator(`text=${testName}`).first();
    await contactRow.click();

    // Contact Detail view
    await expect(page).toHaveURL(/.*\/app\/contacts\/[0-9a-fA-F-]+/, { timeout: 20000 });
    const contactUrl = page.url();
    const contactId = contactUrl.split('/contacts/')[1].split('/')[0].split('?')[0];

    await expect(page.locator('h1')).toContainText(testName);

    // Assert exactly ONE NextAction under 'TINDAKAN BERIKUTNYA'
    const waActionBtn = page.locator('button:has-text("Buka WhatsApp")');
    await expect(waActionBtn).toBeVisible({ timeout: 20000 });

    // Reload and assert exactly ONE NextAction remains
    await page.reload();
    await expect(waActionBtn).toBeVisible({ timeout: 20000 });

    // WhatsApp Action: Trigger draft and explicit human confirmation
    await waActionBtn.click();
    const waSheet = page.locator('text=Kirim WhatsApp').first();
    await expect(waSheet).toBeVisible({ timeout: 15000 });

    const openWaInsideSheetBtn = page.locator('button:has-text("Buka WhatsApp")').last();
    await openWaInsideSheetBtn.click();

    const confirmWaSentBtn = page.locator('button:has-text("Ya, Sudah Dikirim")');
    await expect(confirmWaSentBtn).toBeVisible({ timeout: 15000 });
    await confirmWaSentBtn.click();

    // Verify WhatsApp modal closed
    await expect(waSheet).not.toBeVisible({ timeout: 15000 });

    // =========================================================================
    // 7. BOOKING -> COMPLETION -> D+7 AFTERCARE
    // =========================================================================
    const createBookingBtn = page.locator('button:has-text("+ Buat booking")');
    await expect(createBookingBtn).toBeVisible({ timeout: 15000 });
    await createBookingBtn.click();

    // Booking created -> verify status and transitions
    await expect(page.locator('text=Tes STIFIn Personal').first()).toBeVisible({ timeout: 20000 });

    // 1. Confirm Booking (PENDING -> CONFIRMED)
    const confirmBookingBtn = page.locator('button:has-text("Konfirmasi Booking")');
    await expect(confirmBookingBtn).toBeVisible({ timeout: 15000 });
    await confirmBookingBtn.click();
    await expect(confirmBookingBtn).not.toBeVisible({ timeout: 20000 });

    // 2. Mark paid if UNPAID
    const markPaidBtn = page.locator('button:has-text("Tandai Lunas")');
    await expect(markPaidBtn).toBeVisible({ timeout: 15000 });
    await markPaidBtn.click();
    await expect(markPaidBtn).not.toBeVisible({ timeout: 20000 });

    // 3. Complete Booking (CONFIRMED -> COMPLETED)
    const completeBookingBtn = page.locator('button:has-text("Tandai Layanan Selesai")');
    await expect(completeBookingBtn).toBeVisible({ timeout: 15000 });
    await completeBookingBtn.click();

    // Assert stage is COMPLETED and D+7 Aftercare is provisioned exactly once
    await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Aftercare D+7').first()).toBeVisible({ timeout: 20000 });

    // =========================================================================
    // 8. FLOW -> CLASS M17 ENROLLMENT & DUPLICATE PREVENTION
    // =========================================================================
    const enrollClassBtn = page.locator('button:has-text("+ Daftarkan ke Kelas")');
    await expect(enrollClassBtn).toBeVisible({ timeout: 15000 });
    await enrollClassBtn.click();

    // Modal displays eligible programs
    const enrollModal = page.locator('text=Daftarkan ke Program Kelas');
    await expect(enrollModal).toBeVisible({ timeout: 15000 });

    // Wait for eligible programs to finish loading
    await expect(page.locator('text=Memuat program...')).not.toBeVisible({ timeout: 20000 });

    // Find the program created by the test in the modal
    const testProgRow = page.locator('[data-testid="eligible-program-row"]').filter({ hasText: programTitle }).first();
    await expect(testProgRow).toBeVisible({ timeout: 20000 });
    await expect(testProgRow.locator('button')).toContainText('Terdaftar');

    // Attempt to click and verify duplicate prevention
    const closeModalBtn = page.locator('button:has-text("Tutup")');
    await closeModalBtn.click();
    await expect(enrollModal).not.toBeVisible({ timeout: 15000 });

    // =========================================================================
    // 9. LOGOUT / LOGIN PERSISTENCE CHECK (CLASS & FLOW)
    // =========================================================================
    // Class Logout and Relogin
    await page.goto(`${STAGING_CLASS_URL}/app/settings`);
    const classLogoutBtn = page.locator('button:has-text("Keluar dari Akun")');
    await expect(classLogoutBtn).toBeVisible({ timeout: 15000 });
    await classLogoutBtn.click();

    await expect(page).toHaveURL(/.*\/login/, { timeout: 20000 });

    // Login again to Class
    await page.locator('input[type="email"]').fill('rina@stifin.id');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/app/, { timeout: 20000 });

    // Assert Program & Learner persistence
    await page.goto(`${STAGING_CLASS_URL}/app/programs/${programId}`);
    await expect(page.locator('h1').first()).toContainText(programTitle, { timeout: 20000 });
    await expect(page.getByText('Terbit di Storefront', { exact: true })).toBeVisible({ timeout: 20000 });

    await page.goto(`${STAGING_CLASS_URL}/app/learners`);
    await expect(page.locator('body')).toContainText(testName, { timeout: 20000 });
    await expect(page.locator('body')).toContainText('Progres: 100%', { timeout: 20000 });

    // Flow Logout and Relogin
    await page.goto(`${STAGING_FLOW_URL}/app/settings`);
    const flowLogoutBtn = page.locator('button:has-text("Keluar dari Akun")');
    await expect(flowLogoutBtn).toBeVisible({ timeout: 15000 });
    await flowLogoutBtn.click();

    await expect(page).toHaveURL(/.*\/login/, { timeout: 20000 });

    // Login again to Flow
    await page.locator('input[type="email"]').fill('rina@stifin.id');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/app/, { timeout: 20000 });

    // Assert Contact & Aftercare persistence
    await page.goto(`${STAGING_FLOW_URL}/app/contacts/${contactId}`);
    await expect(page.locator('h1')).toContainText(testName, { timeout: 20000 });
    await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Aftercare D+7').first()).toBeVisible({ timeout: 20000 });
  });
});
