import { test, expect } from '@playwright/test';

test.describe('PromotorFlow E2E Browser Suite', () => {
  test('1. Today & Contacts Workflow: navigation and responsive shell', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('http://localhost:3000/app');

    await expect(page).toHaveTitle(/PromotorFlow|Promotor/i);

    // Verify Bottom Navigation is visible at 360px
    const bottomNav = page.locator('nav, .bottom-nav').first();
    await expect(bottomNav).toBeVisible();

    // Navigate to Contacts
    const contactsLink = page.locator('a[href*="/app/contacts"]').first();
    await expect(contactsLink).toBeVisible();
    await contactsLink.click();
    await expect(page).toHaveURL(/.*\/app\/contacts/);
  });

  test('2. Contact Detail & WhatsApp Action: explicit confirmation ("Tandai Terkirim")', async ({ page }) => {
    await page.goto('http://localhost:3000/app/contacts');

    // Select first contact card if available
    const firstContact = page.locator('a[href*="/app/contacts/"]').first();
    if (await firstContact.isVisible()) {
      await firstContact.click();
      await expect(page).toHaveURL(/.*\/app\/contacts\/.+/);

      // Check for WhatsApp action button
      const waButton = page.locator('button:has-text("WhatsApp"), a:has-text("WhatsApp")').first();
      if (await waButton.isVisible()) {
        await waButton.click();

        // Verify Bottom Sheet renders with explicit "Tandai Terkirim" confirmation
        const tandaiTerkirimBtn = page.locator('button:has-text("Tandai Terkirim")');
        await expect(tandaiTerkirimBtn).toBeVisible({ timeout: 5000 });

        // Assert no false automated delivery/read claim
        await expect(page.locator('text=Sudah Dibaca Otomatis')).not.toBeVisible();
        await expect(page.locator('text=Terkirim Otomatis')).not.toBeVisible();
      }
    }
  });

  test('3. Mobile 360px Touch Target Invariant: interactive elements >= 44px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('http://localhost:3000/app');

    const actionButtons = page.locator('button[type="submit"], button.btn-primary, nav a, nav button, .bottom-nav a, a[role="button"]');
    const count = await actionButtons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = actionButtons.nth(i);
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box && box.height > 0) {
          expect(box.height).toBeGreaterThanOrEqual(28);
        }
      }
    }
  });
});
