const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = 8091;
const ROOT_DIR = __dirname;
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let safePath = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(ROOT_DIR, safePath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function captureScreens() {
  const server = await startServer();
  console.log(`Server started at http://127.0.0.1:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  const screens = [
    { file: 'mobile-screens/screen-01-dashboard.html', out: 'mobile-dashboard.png' },
    { file: 'mobile-screens/screen-02-classroom.html', out: 'mobile-classroom.png' },
    { file: 'mobile-screens/screen-03-checkout.html', out: 'mobile-checkout.png' },
    { file: 'mobile-screens/screen-04-flow.html', out: 'mobile-flow.png' },
    { file: 'mobile-screens/screen-05-booking.html', out: 'mobile-booking.png' }
  ];

  for (const s of screens) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/${s.file}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const outPath = path.join(ASSETS_DIR, s.out);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`Captured ${s.out} -> ${outPath}`);
    await page.close();
  }

  await browser.close();
  server.close();
  console.log('All 5 mobile screenshots captured successfully!');
}

captureScreens().catch(err => {
  console.error(err);
  process.exit(1);
});
