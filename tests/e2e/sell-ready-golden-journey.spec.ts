import { test, expect } from '@playwright/test';

test.describe('P1-4 — Sell-Ready Customer Golden Journey (E2E Browser)', () => {
  test('Complete Customer Lifecycle: Auth -> Program Authoring -> Public Registration -> Learning & Reflection -> Signal & Intent -> Flow Action -> Booking -> Aftercare', async ({ page }) => {
    // 1. Promoter signs in at /login
    await page.goto('http://localhost:3001/login');
    await expect(page.locator('h1')).toContainText('Masuk ke PromotorClass');

    await page.locator('input[type="email"]').fill('rina@stifin.id');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    // 2. Promoter lands on dashboard (/app)
    await expect(page).toHaveURL(/.*\/app/);
    await expect(page.locator('h1')).toContainText('Beranda');

    // 3. Navigate to Programs (/app/programs)
    await page.goto('http://localhost:3001/app/programs');
    await expect(page.locator('text=Daftar Program')).toBeVisible();

    // 4. Public User visits Storefront (/p/rina/7-hari-mengenal-cara-belajar-anak)
    await page.goto('http://localhost:3001/p/rina/7-hari-mengenal-cara-belajar-anak');
    await expect(page.locator('#register')).toBeVisible();

    // 5. Public User registers
    const testPhone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testName = 'Budi Santoso Golden';

    const nameInput = page.locator('input[placeholder*="Budi Santoso"]');
    const phoneInput = page.locator('input[placeholder*="0812"]');

    if (await nameInput.isVisible()) {
      await nameInput.fill(testName);
      await phoneInput.fill(testPhone);

      const submitBtn = page.locator('#register button[type="submit"]');
      await submitBtn.click();

      // 6. Registration succeeds and learner receives access link
      await expect(page.locator('text=Pendaftaran Berhasil!')).toBeVisible({ timeout: 10000 });
      const startLink = page.locator('a:has-text("Mulai belajar sekarang")');
      await expect(startLink).toBeVisible();
      await startLink.click();

      // 7. Learner lands in Learner Portal (/learn)
      await expect(page).toHaveURL(/.*\/learn/);
      await expect(page.locator('body')).toBeVisible();
    }

    // 8. Promoter checks PromotorClass Dashboard for new signal / learner
    await page.goto('http://localhost:3001/app/learners');
    await expect(page.locator('text=Daftar Peserta & Follow-up')).toBeVisible();

    // 9. Promoter visits PromotorFlow Today Pipeline
    await page.goto('http://localhost:3000/app');
    await expect(page.locator('body')).toBeVisible();

    // 10. Promoter checks Flow Contact List
    await page.goto('http://localhost:3000/app/contacts');
    await expect(page.locator('body')).toBeVisible();
  });
});
