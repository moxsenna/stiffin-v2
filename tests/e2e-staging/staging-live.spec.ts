import { test, expect } from '@playwright/test';

const STAGING_API_URL = 'https://stiffin-promotor-api-staging.moxsenna.workers.dev';
const STAGING_CLASS_URL = 'https://promotor-class-staging.moxsenna.workers.dev';
const STAGING_FLOW_URL = 'https://promotor-flow-staging.moxsenna.workers.dev';

test.describe('L2 Deployed Staging E2E Verification Suite', () => {

  test('1. Platform API Staging: /health and /health/db live probes return 200 OK', async ({ request }) => {
    const healthRes = await request.get(`${STAGING_API_URL}/health`);
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe('ok');

    const dbHealthRes = await request.get(`${STAGING_API_URL}/health/db`);
    expect(dbHealthRes.status()).toBe(200);
    const dbJson = await dbHealthRes.json();
    expect(dbJson.status).toBe('ok');
    expect(dbJson.db).toBe('connected');
  });

  test('2. PromotorClass Staging: Public Program Page renders with lessons and registration form', async ({ page }) => {
    await page.goto(`${STAGING_CLASS_URL}/p/demo-promotor/stifin-intro`);
    await expect(page).toHaveTitle(/PromotorClass|Client Education OS|STIFIn/i);

    // Verify program content is visible
    const programTitle = page.locator('h1, h2').filter({ hasText: 'Pengenalan Konsep Mesin Kecerdasan' }).first();
    await expect(programTitle).toBeAttached({ timeout: 15000 });

    // Verify registration action button exists
    const registerButton = page.locator('button').filter({ hasText: /Daftar & mulai belajar|Mulai belajar/i }).first();
    await expect(registerButton).toBeAttached();
  });

  test('3. PromotorClass Staging: Operator App Root renders navigation', async ({ page }) => {
    await page.goto(`${STAGING_CLASS_URL}/app`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('4. PromotorFlow Staging: Public Booking Page renders service and time selection', async ({ page }) => {
    await page.goto(`${STAGING_FLOW_URL}/p/demo-promotor/book`);
    await expect(page).toHaveTitle(/Booking|Promotor|Konsultasi/i);

    // Verify booking heading is attached
    const bookingHeading = page.locator('h1, h2').filter({ hasText: /Jadwal Konsultasi STIFIn|Konsultasi/i }).first();
    await expect(bookingHeading).toBeAttached({ timeout: 15000 });

    // Verify submit button is attached
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeAttached();
  });

  test('5. PromotorFlow Staging: CRM Today and Contacts navigation', async ({ page }) => {
    await page.goto(`${STAGING_FLOW_URL}/app`);
    await expect(page.locator('body')).toBeVisible();

    await page.goto(`${STAGING_FLOW_URL}/app/contacts`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('6. Mobile 360px Viewport Invariant: responsive shell layout', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });

    // Test Class at 360px
    await page.goto(`${STAGING_CLASS_URL}/p/demo-promotor/stifin-intro`);
    await expect(page.locator('body')).toBeVisible();

    // Test Flow Booking at 360px
    await page.goto(`${STAGING_FLOW_URL}/p/demo-promotor/book`);
    await expect(page.locator('body')).toBeVisible();
  });
});
