const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = 8089;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let safePath = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(ROOT_DIR, safePath === '/' ? 'render-player.html' : safePath);

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
      console.log(`Local HTTP server running at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

async function testPlayer() {
  const server = await startServer();

  console.log('Testing render-player.html with Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  await page.goto(`http://127.0.0.1:${PORT}/render-player.html`);

  const ready = await page.evaluate(async () => {
    return await window.verifyReady();
  });
  console.log('Player ready status:', ready);

  const scenesCount = await page.evaluate(() => window.scenes.length);
  console.log('Mounted scenes count:', scenesCount);

  // Test seek across key frames
  const testFrames = [0, 60, 180, 300, 450, 600, 750, 850, 899];
  for (const f of testFrames) {
    const res = await page.evaluate(fn => window.seekFrame(fn), f);
    console.log(`Seek F${f} (${res.time.toFixed(2)}s) OK`);
  }

  await browser.close();
  server.close();
  console.log('Player verification completed successfully!');
}

testPlayer().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
