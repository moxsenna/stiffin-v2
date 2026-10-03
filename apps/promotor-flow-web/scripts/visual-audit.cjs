/* eslint-disable no-console */
// Audit visual batch: screenshot semua halaman PromotorFlow (mobile 390 + desktop)
// + deteksi overflow horizontal otomatis. Output: output/playwright/
const { chromium } = require('D:/Coding/Stiffin v2/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3003';
const OUT = path.join(__dirname, '..', 'output', 'playwright');
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['today', '/app'],
  ['contacts', '/app/contacts'],
  ['contact-detail', '/app/contacts/contact_hendra'],
  ['calendar', '/app/calendar'],
  ['pipeline', '/app/pipeline'],
  ['templates', '/app/templates'],
  ['booking', '/p/rina/book'],
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

const OVERFLOW_JS = () => {
  const bad = [];
  const vw = window.innerWidth;
  const pageOverflow = document.documentElement.scrollWidth - vw;
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed') continue; // dock/topbar fixed by design
    const over = Math.round(r.right - vw);
    if (over > 1) {
      let sel = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        sel += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
      }
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      bad.push({ sel, right: Math.round(r.right), over, text: txt });
    }
  }
  // text containers whose content overflows internally
  const clipped = [];
  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.children.length > 0) continue;
    const txt = (el.textContent || '').trim();
    if (!txt) continue;
    if (el.scrollWidth - el.clientWidth > 2) {
      let sel = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        sel += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
      }
      clipped.push({ sel, text: txt.replace(/\s+/g, ' ').slice(0, 60) });
    }
  }
  // interactive elements smaller than 44px (mobile concern)
  const smallTargets = [];
  for (const el of document.querySelectorAll('button, a, input, select, [role="button"]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.width < 20 || r.height < 20) {
      const txt = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      smallTargets.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), text: txt });
    }
  }
  return { pageOverflow, bad: bad.slice(0, 30), clipped: clipped.slice(0, 30), smallTargets: smallTargets.slice(0, 30) };
};

(async () => {
  const browser = await chromium.launch();
  const report = {};
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    for (const [name, route] of ROUTES) {
      const key = `${name}-${vp.name}`;
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);
        const shot = path.join(OUT, `${key}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        const audit = await page.evaluate(OVERFLOW_JS);
        report[key] = { route, ok: true, ...audit };
        console.log(`${key}: pageOverflow=${audit.pageOverflow} bad=${audit.bad.length} clipped=${audit.clipped.length} small=${audit.smallTargets.length}`);
      } catch (e) {
        report[key] = { route, ok: false, error: String(e).slice(0, 200) };
        console.log(`${key}: ERROR ${String(e).slice(0, 120)}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'audit-report.json'), JSON.stringify(report, null, 2));
  console.log('DONE ->', path.join(OUT, 'audit-report.json'));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
