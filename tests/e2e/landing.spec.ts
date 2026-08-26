import { test, expect } from '@playwright/test';

test.describe('Marketing Landing Smoke', () => {
  test('Flow / renders hero', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.locator('body')).toContainText('Tutup Lebih Banyak Sesi Tes STIFIn');
  });

  test('Class / renders hero for logged-out', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await expect(page.locator('body')).toContainText('Ubah Setiap Sesi Belajar');
  });
});
