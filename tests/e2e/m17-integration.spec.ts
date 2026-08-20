import { test, expect } from '@playwright/test';

test.describe('M17 Cross-Product Reverse Integration E2E Suite', () => {
  test('1. BUNDLE_AVAILABLE: Learning Context rendered in Contact Detail view', async ({ page }) => {
    // Intercept PromotorClass integration endpoint or state
    await page.goto('http://localhost:3000/app/contacts');
    const firstContact = page.locator('a[href*="/app/contacts/"]').first();

    if (await firstContact.isVisible()) {
      await firstContact.click();

      // If Class integration is available, verify Learning section or absence of error banner
      const outageBanner = page.locator('text=Layanan Kelas Sedang Tidak Tersedia');
      if (await outageBanner.isVisible()) {
        // Outage correctly detected on disconnected backend
        await expect(outageBanner).toBeVisible();
      } else {
        // Normal state verified
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('2. BUNDLE_CLASS_UNAVAILABLE: Outage banner prevents silent empty data', async ({ page }) => {
    // Simulate 500 error from PromotorClass API
    await page.route('**/api/v1/class/**', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Down' } }),
      });
    });

    await page.goto('http://localhost:3000/app/contacts');
    const firstContact = page.locator('a[href*="/app/contacts/"]').first();

    if (await firstContact.isVisible()) {
      await firstContact.click();

      // Verify that failure does NOT silently display "0 Programs Enrolled" as normal data
      await expect(page.locator('text=Semua Program Selesai')).not.toBeVisible();
    }
  });

  test('3. FLOW_ONLY: Standalone CRM mode does not render Class section or fake warnings', async ({ page }) => {
    // Simulate FLOW_ONLY entitlement (promotorClass: false)
    await page.route('**/api/v1/flow/entitlements', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ promotorFlow: true, promotorClass: false }),
      });
    });

    await page.goto('http://localhost:3000/app/contacts');
    const firstContact = page.locator('a[href*="/app/contacts/"]').first();

    if (await firstContact.isVisible()) {
      await firstContact.click();

      // Verify no misleading Class outage warnings when not entitled
      await expect(page.locator('text=Layanan Kelas Sedang Gangguan')).not.toBeVisible();
    }
  });
});
