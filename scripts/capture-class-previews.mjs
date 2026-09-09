import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'apps', 'promotor-class-web', 'public', 'images', 'previews');
const BASE_URL = process.env.CLASS_URL || 'http://localhost:3001';

const AYU_REFLECTION = 'Anak pertama saya (Sensing) belajar paling cepat lewat praktik fisik dan hafalan konkrit. Sementara anak kedua (Thinking) selalu menanyakan alasan sebab-akibat di balik setiap aturan.';

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  console.log('[capture] Launching high-DPI capture against', BASE_URL);

  // 1. Mobile Learner Reader (780 x 1688 retina)
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'promotor_class_learner_session_v2',
          JSON.stringify({ contactId: 'contact_ayu', workspaceSlug: 'rina' })
        );
      } catch {}
    });

    const url = `${BASE_URL}/learn/programs/enr_ayu_7hari/lessons/les_1_2`;
    console.log('[capture] Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('article h1').first().waitFor({ timeout: 15000 });

    // Fill authentic reflection answer
    const textarea = page.locator('textarea[aria-label="Jawaban refleksi"]');
    if (await textarea.count()) {
      await textarea.fill(AYU_REFLECTION);
      await textarea.blur();
    }

    // Hide Next.js dev artifacts
    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-nextjs-dev-overlay-root],
        [data-next-badge],
        #__next-build-watcher {
          display: none !important;
        }
      `,
    });

    await page.waitForTimeout(1500);

    const pngPath = path.join(OUT_DIR, 'class-learner-mobile.png');
    const webpPath = path.join(OUT_DIR, 'class-learner-mobile.webp');

    await page.screenshot({ path: pngPath, fullPage: false });
    await sharp(pngPath).webp({ quality: 92 }).toFile(webpPath);
    console.log('[capture] Generated', webpPath);

    await context.close();
  }

  // 2. Desktop Learner Reader (2560 x 1600 retina)
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'promotor_class_learner_session_v2',
          JSON.stringify({ contactId: 'contact_ayu', workspaceSlug: 'rina' })
        );
      } catch {}
    });

    const url = `${BASE_URL}/learn/programs/enr_ayu_7hari/lessons/les_1_2`;
    console.log('[capture] Navigating desktop to', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('article h1').first().waitFor({ timeout: 15000 });

    const textarea = page.locator('textarea[aria-label="Jawaban refleksi"]');
    if (await textarea.count()) {
      await textarea.fill(AYU_REFLECTION);
      await textarea.blur();
    }

    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-nextjs-dev-overlay-root],
        [data-next-badge],
        #__next-build-watcher {
          display: none !important;
        }
      `,
    });

    await page.waitForTimeout(1500);

    const pngPath = path.join(OUT_DIR, 'class-learner-reader.png');
    const webpPath = path.join(OUT_DIR, 'class-learner-reader.webp');

    await page.screenshot({ path: pngPath, fullPage: false });
    await sharp(pngPath).webp({ quality: 92 }).toFile(webpPath);
    console.log('[capture] Generated', webpPath);

    await context.close();
  }

  // 3. Promotor Cockpit Desktop (2560 x 1600 retina)
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    const url = `${BASE_URL}/app`;
    console.log('[capture] Navigating desktop cockpit to', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('h1, h2').first().waitFor({ timeout: 15000 });

    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-nextjs-dev-overlay-root],
        [data-next-badge],
        #__next-build-watcher {
          display: none !important;
        }
      `,
    });

    await page.waitForTimeout(1500);

    const pngPath = path.join(OUT_DIR, 'class-promotor-cockpit.png');
    const webpPath = path.join(OUT_DIR, 'class-promotor-cockpit.webp');

    await page.screenshot({ path: pngPath, fullPage: false });
    await sharp(pngPath).webp({ quality: 92 }).toFile(webpPath);
    console.log('[capture] Generated', webpPath);

    await context.close();
  }

  // 4. Promotor Cockpit Mobile (780 x 1688 retina)
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    const url = `${BASE_URL}/app`;
    console.log('[capture] Navigating mobile cockpit to', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('h1, h2').first().waitFor({ timeout: 15000 });

    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-nextjs-dev-overlay-root],
        [data-next-badge],
        #__next-build-watcher {
          display: none !important;
        }
      `,
    });

    await page.waitForTimeout(1500);

    const pngPath = path.join(OUT_DIR, 'class-cockpit-mobile.png');
    const webpPath = path.join(OUT_DIR, 'class-cockpit-mobile.webp');

    await page.screenshot({ path: pngPath, fullPage: false });
    await sharp(pngPath).webp({ quality: 92 }).toFile(webpPath);
    console.log('[capture] Generated', webpPath);

    await context.close();
  }

  // 5. Learners Table Desktop (2560 x 1600 retina)
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    const url = `${BASE_URL}/app/learners`;
    console.log('[capture] Navigating desktop learners to', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('table, [data-testid="learners-list"], h1').first().waitFor({ timeout: 15000 });

    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-nextjs-dev-overlay-root],
        [data-next-badge],
        #__next-build-watcher {
          display: none !important;
        }
      `,
    });

    await page.waitForTimeout(1500);

    const pngPath = path.join(OUT_DIR, 'class-learners-table.png');
    const webpPath = path.join(OUT_DIR, 'class-learners-table.webp');

    await page.screenshot({ path: pngPath, fullPage: false });
    await sharp(pngPath).webp({ quality: 92 }).toFile(webpPath);
    console.log('[capture] Generated', webpPath);

    await context.close();
  }

  // 6. Learners Table Mobile (780 x 1688 retina)
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    const url = `${BASE_URL}/app/learners`;
    console.log('[capture] Navigating mobile learners to', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('table, [data-testid="learners-list"], h1').first().waitFor({ timeout: 15000 });

    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-nextjs-dev-overlay-root],
        [data-next-badge],
        #__next-build-watcher {
          display: none !important;
        }
      `,
    });

    await page.waitForTimeout(1500);

    const pngPath = path.join(OUT_DIR, 'class-learners-mobile.png');
    const webpPath = path.join(OUT_DIR, 'class-learners-mobile.webp');

    await page.screenshot({ path: pngPath, fullPage: false });
    await sharp(pngPath).webp({ quality: 92 }).toFile(webpPath);
    console.log('[capture] Generated', webpPath);

    await context.close();
  }

  await browser.close();
  console.log('[capture] All done successfully!');
}

main().catch((err) => {
  console.error('[capture] Error:', err);
  process.exit(1);
});

