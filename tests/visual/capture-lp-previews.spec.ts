import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const CLASS_OUT_DIR = path.join(process.cwd(), 'apps', 'promotor-class-web', 'public', 'images', 'previews');
const FLOW_OUT_DIR = path.join(process.cwd(), 'apps', 'promotor-flow-web', 'public', 'images', 'previews');

const FLOW = `http://localhost:${process.env.FLOW_PORT || 3000}`;
const CLASS = `http://localhost:${process.env.CLASS_PORT || 3001}`;

const VIEWPORT_DESKTOP = { width: 1280, height: 800 };
const VIEWPORT_MOBILE = { width: 390, height: 844 };

async function captureScreen(
  page: import('@playwright/test').Page,
  url: string,
  outPath: string,
  options?: { viewport?: { width: number; height: number }; waitSelector?: string; clip?: { x: number; y: number; width: number; height: number } }
) {
  const vp = options?.viewport || VIEWPORT_DESKTOP;
  await page.setViewportSize(vp);
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
  if (!res || res.status() >= 400) {
    console.warn(`[warn] Failed to load ${url}: ${res ? res.status() : 'no-response'}`);
    return;
  }
  if (options?.waitSelector) {
    await page.waitForSelector(options.waitSelector, { timeout: 10000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);

  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });

  if (options?.clip) {
    await page.screenshot({ path: outPath, clip: options.clip });
  } else {
    // Capture fixed viewport (hero mockup scale)
    await page.screenshot({ path: outPath, fullPage: false });
  }

  // Also emit optimized webp
  const webpPath = outPath.replace(/\.png$/, '.webp');
  await sharp(outPath).webp({ quality: 88 }).toFile(webpPath).catch((err) => {
    console.warn(`[warn] WebP conversion failed for ${outPath}:`, err);
  });

  console.log(`[captured] ${outPath} & ${webpPath}`);
}

test.describe('Landing Page App Screenshot Previews Capture', () => {
  test('capture Class screens for Landing Page', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Learner Reader View
    await captureScreen(
      page,
      `${CLASS}/learn/preview/prog-demo-7hari/lessons/les-demo-01`,
      path.join(CLASS_OUT_DIR, 'class-learner-reader.png')
    );

    // 2. Promotor Cockpit / Dashboard View
    await captureScreen(
      page,
      `${CLASS}/app`,
      path.join(CLASS_OUT_DIR, 'class-promotor-cockpit.png')
    );

    // 3. Learners Intent & Status Table View
    await captureScreen(
      page,
      `${CLASS}/app/learners`,
      path.join(CLASS_OUT_DIR, 'class-learners-table.png')
    );

    // 4. Mobile Learner View
    await captureScreen(
      page,
      `${CLASS}/learn/preview/prog-demo-7hari/lessons/les-demo-01`,
      path.join(CLASS_OUT_DIR, 'class-learner-mobile.png'),
      { viewport: VIEWPORT_MOBILE }
    );
  });

  test('capture Flow screens for Landing Page', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Today Work Queue Cockpit
    await captureScreen(
      page,
      `${FLOW}/app`,
      path.join(FLOW_OUT_DIR, 'flow-today-cockpit.png')
    );

    // 2. Kanban CRM Pipeline
    await captureScreen(
      page,
      `${FLOW}/app/pipeline`,
      path.join(FLOW_OUT_DIR, 'flow-kanban-pipeline.png')
    );

    // 3. Public 14-day Booking Calendar
    await captureScreen(
      page,
      `${FLOW}/p/rina/book`,
      path.join(FLOW_OUT_DIR, 'flow-booking-calendar.png')
    );

    // 4. Mobile Today Queue View
    await captureScreen(
      page,
      `${FLOW}/app`,
      path.join(FLOW_OUT_DIR, 'flow-today-mobile.png'),
      { viewport: VIEWPORT_MOBILE }
    );
  });
});
