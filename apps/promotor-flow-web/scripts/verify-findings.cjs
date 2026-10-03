/* eslint-disable no-console */
// Verify ambiguous findings: lifecycle strip fit + mystery circle-N element.
const { chromium } = require('D:/Coding/Stiffin v2/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3003';
const OUT = path.join(__dirname, '..', 'output', 'playwright');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/app/contacts/contact_hendra', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);

  const strip = await page.evaluate(() => {
    const steps = [...document.querySelectorAll('.lifecycle-step')].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el.textContent || '').trim(), w: Math.round(r.width), scrollW: el.scrollWidth, clientW: el.clientWidth, over: el.scrollWidth - el.clientWidth };
    });
    const pill = document.querySelector('.hv-card .hv-tone-badge');
    return { steps, pillText: pill ? pill.textContent.trim().slice(0, 30) : null };
  });
  console.log('STRIP:', JSON.stringify(strip, null, 1));

  // crop screenshot of hero card
  const hero = await page.$('.hv-card');
  if (hero) await hero.screenshot({ path: path.join(OUT, 'verify-strip.png') });

  // mystery circle-N: what's at bottom-left above dock?
  const mystery = await page.evaluate(() => {
    const els = document.elementsFromPoint(28, 700);
    return els.slice(0, 6).map((el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80) || null,
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) || null,
      fixed: getComputedStyle(el).position,
    }));
  });
  console.log('MYSTERY:', JSON.stringify(mystery, null, 1));

  // booking page: is there a dock?
  await page.goto(BASE + '/p/rina/book', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const bookDock = await page.evaluate(() => ({
    dock: !!document.querySelector('.hv-dock'),
    devOverlay: document.body.textContent.includes('Dev Controls'),
  }));
  console.log('BOOKING:', JSON.stringify(bookDock));

  await ctx.close();
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
