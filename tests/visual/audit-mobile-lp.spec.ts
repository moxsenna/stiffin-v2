import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.join(process.cwd(), 'tests', 'visual', 'audit-output');
const FLOW = `http://localhost:${process.env.FLOW_PORT || 3000}`;
const CLASS = `http://localhost:${process.env.CLASS_PORT || 3001}`;

const VIEWPORT_MOBILE = { width: 375, height: 812 };

test.describe('Mobile Landing Page Audit', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  test('audit Class LP mobile', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize(VIEWPORT_MOBILE);
    await page.goto(`${CLASS}/?lp=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Full page screenshot
    await page.screenshot({
      path: path.join(OUT_DIR, 'class-mobile-full.png'),
      fullPage: true,
    });

    // Check horizontal overflow & find offending elements
    const overflowReport = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const elements: string[] = [];
      if (scrollWidth > clientWidth) {
        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > clientWidth) {
            elements.push(`${el.tagName.toLowerCase()}.${el.className} (width: ${rect.width}px, right: ${rect.right}px)`);
          }
        });
      }
      return { scrollWidth, clientWidth, elements: elements.slice(0, 5) };
    });
    console.log(`[Class LP Mobile]`, overflowReport);
  });

  test('audit Flow LP mobile', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize(VIEWPORT_MOBILE);
    await page.goto(`${FLOW}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Full page screenshot
    await page.screenshot({
      path: path.join(OUT_DIR, 'flow-mobile-full.png'),
      fullPage: true,
    });

    // Check horizontal overflow & find offending elements
    const overflowReport = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const elements: string[] = [];
      if (scrollWidth > clientWidth) {
        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > clientWidth) {
            elements.push(`${el.tagName.toLowerCase()}.${el.className} (width: ${rect.width}px, right: ${rect.right}px)`);
          }
        });
      }
      return { scrollWidth, clientWidth, elements: elements.slice(0, 5) };
    });
    console.log(`[Flow LP Mobile]`, overflowReport);
  });
});
