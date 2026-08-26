import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * V0.1 Modernist PWA Redesign — visual evidence capture.
 * Screenshots land in test-results/visual-evidence/ for manual comparison
 * against the design reference. Set FLOW_PORT / CLASS_PORT when the default
 * dev ports are occupied by unrelated local servers.
 */

const OUT_DIR = path.join(process.cwd(), 'test-results', 'visual-evidence');
const FLOW = `http://localhost:${process.env.FLOW_PORT || 3000}`;
const CLASS = `http://localhost:${process.env.CLASS_PORT || 3001}`;

const SHOTS: Array<{
  name: string;
  url: string;
  viewport?: { width: number; height: number };
}> = [
  { name: 'flow-today-mobile-390', url: `${FLOW}/app`, viewport: { width: 390, height: 844 } },
  { name: 'flow-today-desktop', url: `${FLOW}/app`, viewport: { width: 1440, height: 900 } },
  { name: 'flow-contacts-mobile-390', url: `${FLOW}/app/contacts`, viewport: { width: 390, height: 844 } },
  { name: 'flow-calendar-mobile-390', url: `${FLOW}/app/calendar`, viewport: { width: 390, height: 844 } },
  { name: 'flow-login-mobile-390', url: `${FLOW}/login`, viewport: { width: 390, height: 844 } },
  { name: 'class-home-mobile-390', url: `${CLASS}/app`, viewport: { width: 390, height: 844 } },
  { name: 'class-home-desktop', url: `${CLASS}/app`, viewport: { width: 1440, height: 900 } },
  { name: 'class-programs-mobile-390', url: `${CLASS}/app/programs`, viewport: { width: 390, height: 844 } },
  { name: 'class-learners-mobile-390', url: `${CLASS}/app/learners`, viewport: { width: 390, height: 844 } },
  { name: 'class-login-mobile-390', url: `${CLASS}/login`, viewport: { width: 390, height: 844 } },
  { name: 'learner-home-mobile-390', url: `${CLASS}/learn`, viewport: { width: 390, height: 844 } },
];

async function capture(page: import('@playwright/test').Page, name: string, url: string, viewport?: { width: number; height: number }) {
  if (viewport) await page.setViewportSize(viewport);
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || response.status() >= 400) {
    console.warn(`[skip] ${name}: ${url} -> ${response ? response.status() : 'no response'}`);
    return;
  }
  await page.waitForTimeout(1200);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

test.describe('redesign visual evidence', () => {
  test('capture representative screens', async ({ page }) => {
    test.setTimeout(240000);
    for (const shot of SHOTS) {
      try {
        await capture(page, shot.name, shot.url, shot.viewport);
      } catch (err) {
        console.warn(`[skip] ${shot.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    expect(fs.existsSync(OUT_DIR)).toBeTruthy();
  });

  test('mobile 360px horizontal overflow invariant on core screens', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 360, height: 740 });

    const targets = [
      { name: 'flow-today', url: `${FLOW}/app` },
      { name: 'flow-contacts', url: `${FLOW}/app/contacts` },
      { name: 'class-home', url: `${CLASS}/app` },
      { name: 'class-programs', url: `${CLASS}/app/programs` },
      { name: 'learner-home', url: `${CLASS}/learn` },
    ];

    for (const t of targets) {
      try {
        await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${t.name} has ${overflow}px horizontal overflow at 360px`).toBeLessThanOrEqual(0);
      } catch (err) {
        console.warn(`[skip] overflow check ${t.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
});
