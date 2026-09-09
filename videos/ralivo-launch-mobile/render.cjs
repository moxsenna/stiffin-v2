/**
 * Ralivo Mobile Launch Video — Master Frame-by-Frame Renderer & MP4 Encoder
 * Renders exactly 900 deterministic frames [0..899] at 30 fps (30.00s)
 * Incorporates ducked BGM (assets/Blueprint_For_Success.mp3)
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');

const PORT = 8091;
const ROOT_DIR = __dirname;
const TOTAL_FRAMES = 900;
const FPS = 30;

const FRAMES_DIR = path.join(ROOT_DIR, 'renders', 'raw_frames');
const SNAPSHOTS_DIR = path.join(ROOT_DIR, 'snapshots');
const RENDERS_DIR = path.join(ROOT_DIR, 'renders');
const OUTPUT_VIDEO = path.join(RENDERS_DIR, 'video.mp4');
const BGM_AUDIO = path.join(ROOT_DIR, 'assets', 'Blueprint_For_Success.mp3');

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
  '.ttf': 'font/ttf',
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

async function renderMasterVideo() {
  console.log('=====================================================');
  console.log('RALIVO MOBILE LAUNCH VIDEO — MASTER PRODUCTION RENDER');
  console.log(`Total Frames: ${TOTAL_FRAMES} | FPS: ${FPS} | Duration: 30.00s`);
  console.log('=====================================================\n');

  if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });
  if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  if (!fs.existsSync(RENDERS_DIR)) fs.mkdirSync(RENDERS_DIR, { recursive: true });

  const server = await startServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  console.log(`Loading Player: http://127.0.0.1:${PORT}/render-player.html...`);
  await page.goto(`http://127.0.0.1:${PORT}/render-player.html`);

  console.log('Verifying player readiness and fonts...');
  const ready = await page.evaluate(async () => {
    return await window.verifyReady();
  });
  if (!ready) throw new Error('Player failed to initialize');
  console.log('Player ready status: PASS\n');

  const keyFrames = [
    { name: '01-hook', frame: 60 },
    { name: '02-problem', frame: 180 },
    { name: '03-solution', frame: 315 },
    { name: '04-classroom-checkout', frame: 465 },
    { name: '05-flow-booking', frame: 615 },
    { name: '06-proof', frame: 750 },
    { name: '07-cta', frame: 855 }
  ];

  console.log(`Capturing ${TOTAL_FRAMES} frames sequentially...`);
  const startTime = Date.now();

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    await page.evaluate((fn) => window.seekFrame(fn), f);

    const frameFile = path.join(FRAMES_DIR, `frame_${String(f).padStart(4, '0')}.png`);
    await page.screenshot({ path: frameFile, type: 'png' });

    // Snapshot check
    const kf = keyFrames.find(k => k.frame === f);
    if (kf) {
      const snapFile = path.join(SNAPSHOTS_DIR, `${kf.name}.png`);
      fs.copyFileSync(frameFile, snapFile);
      console.log(`  [Snapshot] Scene ${kf.name} captured at Frame ${f} (${(f/FPS).toFixed(2)}s)`);
    }

    if (f % 90 === 0 || f === TOTAL_FRAMES - 1) {
      const progress = ((f + 1) / TOTAL_FRAMES * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Progress: ${f + 1}/${TOTAL_FRAMES} frames (${progress}%) — ${elapsed}s`);
    }
  }

  const captureDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nFrame capture complete in ${captureDuration}s.`);

  await browser.close();
  server.close();

  // FFmpeg master video encoding
  console.log('\nStarting FFmpeg MP4 encoding with ducked BGM...');
  const hasBgm = fs.existsSync(BGM_AUDIO);
  let ffmpegCmd = `ffmpeg -y -framerate ${FPS} -i "${path.join(FRAMES_DIR, 'frame_%04d.png')}"`;

  if (hasBgm) {
    console.log(`Integrating BGM: ${BGM_AUDIO} (ducked, volume=0.15, fade-out st=27.5s, d=2.5s)...`);
    ffmpegCmd += ` -i "${BGM_AUDIO}" -filter_complex "[1:a]volume=0.15,afade=t=in:st=0:d=0.5,afade=t=out:st=27.5:d=2.5[a]" -map 0:v:0 -map "[a]" -c:a aac -b:a 192k`;
  }

  ffmpegCmd += ` -c:v libx264 -pix_fmt yuv420p -profile:v high -level:v 4.2 -crf 18 -preset slow -movflags +faststart -t ${(TOTAL_FRAMES / FPS).toFixed(2)} "${OUTPUT_VIDEO}"`;

  console.log('Executing FFmpeg command...');
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log(`\nMaster MP4 encoded successfully: ${OUTPUT_VIDEO}`);

  // Generate Contact Sheet from the 7 snapshots
  console.log('\nGenerating contact sheet from scene snapshots...');
  const contactSheetCmd = `ffmpeg -y -i "${path.join(SNAPSHOTS_DIR, '01-hook.png')}" -i "${path.join(SNAPSHOTS_DIR, '02-problem.png')}" -i "${path.join(SNAPSHOTS_DIR, '03-solution.png')}" -i "${path.join(SNAPSHOTS_DIR, '04-classroom-checkout.png')}" -i "${path.join(SNAPSHOTS_DIR, '05-flow-booking.png')}" -i "${path.join(SNAPSHOTS_DIR, '06-proof.png')}" -i "${path.join(SNAPSHOTS_DIR, '07-cta.png')}" -filter_complex "[0:v]scale=640:360[v0];[1:v]scale=640:360[v1];[2:v]scale=640:360[v2];[3:v]scale=640:360[v3];[4:v]scale=640:360[v4];[5:v]scale=640:360[v5];[6:v]scale=640:360[v6];[v0][v1][v2][v3][v4][v5][v6]concat=n=7:v=1:a=0,tile=3x3[out]" -map "[out]" -q:v 2 "${path.join(SNAPSHOTS_DIR, 'contact-sheet.jpg')}"`;
  try {
    execSync(contactSheetCmd, { stdio: 'inherit' });
    console.log(`Contact sheet generated: ${path.join(SNAPSHOTS_DIR, 'contact-sheet.jpg')}`);
  } catch (e) {
    console.log('Note: contact sheet generation warning:', e.message);
  }

  // Probe output video
  console.log('\nValidating output with ffprobe...');
  const probeOut = execSync(`ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,channels -of json "${OUTPUT_VIDEO}"`, { encoding: 'utf8' });
  console.log('Probe result:\n', probeOut);

  // Clean raw frames to conserve disk space
  console.log('Cleaning temporary raw frame PNGs...');
  const rawFiles = fs.readdirSync(FRAMES_DIR);
  for (const file of rawFiles) {
    fs.unlinkSync(path.join(FRAMES_DIR, file));
  }
  fs.rmdirSync(FRAMES_DIR);
  console.log('Cleaned raw frames.');

  console.log('\n=====================================================');
  console.log('PRODUCTION LAUNCH VIDEO (MOBILE SCREENSHOT EDITION) COMPLETE!');
  console.log(`Artifact: ${OUTPUT_VIDEO}`);
  console.log('=====================================================');
}

renderMasterVideo().catch(err => {
  console.error('Render failed:', err);
  process.exit(1);
});
