const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CLASS_PUBLIC = path.join(ROOT_DIR, 'apps', 'promotor-class-web', 'public');
const FLOW_PUBLIC = path.join(ROOT_DIR, 'apps', 'promotor-flow-web', 'public');

const LOGO_DARK_SRC = path.join(ROOT_DIR, 'logo dark.png');
const LOGO_LIGHT_SRC = path.join(ROOT_DIR, 'logo light.png');
const ICON_SRC = path.join(ROOT_DIR, 'icon.png');

async function makeIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4);

  let offset = 6 + numImages * 16;
  const dirEntries = [];
  for (const { buffer, width, height } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data
    dirEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

async function generateAssets() {
  console.log('Generating optimized Talira brand assets and favicons...');

  // 1. Process Logos
  // Logo Dark (for light bg): trimmed & resized to max width 480 / height 160
  const logoDarkBuf = await sharp(LOGO_DARK_SRC)
    .trim()
    .resize({ width: 480, height: 160, fit: 'inside' })
    .webp({ quality: 90, effort: 6 })
    .toBuffer();

  // Logo Light (for dark bg): trimmed & resized to max width 480 / height 160
  const logoLightBuf = await sharp(LOGO_LIGHT_SRC)
    .trim()
    .resize({ width: 480, height: 160, fit: 'inside' })
    .webp({ quality: 90, effort: 6 })
    .toBuffer();

  // 2. Process Icons & Favicons
  const iconTrimmed = sharp(ICON_SRC).trim();

  // Icon WebP (128x128, 256x256, 512x512)
  const iconWebp128 = await iconTrimmed
    .clone()
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92, effort: 6 })
    .toBuffer();

  const iconWebp256 = await iconTrimmed
    .clone()
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92, effort: 6 })
    .toBuffer();

  const iconWebp512 = await iconTrimmed
    .clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92, effort: 6 })
    .toBuffer();

  const faviconWebp32 = await iconTrimmed
    .clone()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 95, effort: 6 })
    .toBuffer();

  const faviconWebp16 = await iconTrimmed
    .clone()
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 95, effort: 6 })
    .toBuffer();

  // Favicon ICO (16, 32, 48)
  const p16 = await iconTrimmed.clone().resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const p32 = await iconTrimmed.clone().resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const p48 = await iconTrimmed.clone().resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const faviconIcoBuf = await makeIco([
    { buffer: p16, width: 16, height: 16 },
    { buffer: p32, width: 32, height: 32 },
    { buffer: p48, width: 48, height: 48 },
  ]);

  // Apple Touch Icon (180x180 PNG with 15% inner padding)
  const appleTouchIconBuf = await iconTrimmed
    .clone()
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // PWA 192 & 512 PNG
  const pwa192Png = await iconTrimmed
    .clone()
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const pwa512Png = await iconTrimmed
    .clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Maskable 512 PNG (400x400 contained in 512x512 canvas)
  const pwaMaskable512Png = await iconTrimmed
    .clone()
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 56,
      bottom: 56,
      left: 56,
      right: 56,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // dark brand navy background
    })
    .png()
    .toBuffer();

  const targets = [CLASS_PUBLIC, FLOW_PUBLIC];

  for (const dir of targets) {
    const iconsDir = path.join(dir, 'icons');
    const imagesDir = path.join(dir, 'images');
    fs.mkdirSync(iconsDir, { recursive: true });
    fs.mkdirSync(imagesDir, { recursive: true });

    // Write root favicons and logos
    fs.writeFileSync(path.join(dir, 'favicon.ico'), faviconIcoBuf);
    fs.writeFileSync(path.join(dir, 'favicon.webp'), faviconWebp32);
    fs.writeFileSync(path.join(dir, 'favicon-32x32.webp'), faviconWebp32);
    fs.writeFileSync(path.join(dir, 'favicon-16x16.webp'), faviconWebp16);
    fs.writeFileSync(path.join(dir, 'apple-touch-icon.png'), appleTouchIconBuf);
    fs.writeFileSync(path.join(dir, 'icon.webp'), iconWebp256);
    fs.writeFileSync(path.join(dir, 'icon-128.webp'), iconWebp128);
    fs.writeFileSync(path.join(dir, 'icon-512.webp'), iconWebp512);

    // Logos
    fs.writeFileSync(path.join(dir, 'logo-dark.webp'), logoDarkBuf);
    fs.writeFileSync(path.join(dir, 'logo-light.webp'), logoLightBuf);
    fs.writeFileSync(path.join(dir, 'logo.webp'), logoDarkBuf);

    // Images directory copies for easy import
    fs.writeFileSync(path.join(imagesDir, 'logo-dark.webp'), logoDarkBuf);
    fs.writeFileSync(path.join(imagesDir, 'logo-light.webp'), logoLightBuf);
    fs.writeFileSync(path.join(imagesDir, 'icon.webp'), iconWebp256);

    // Icons directory
    fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleTouchIconBuf);
    fs.writeFileSync(path.join(iconsDir, 'pwa-192.png'), pwa192Png);
    fs.writeFileSync(path.join(iconsDir, 'pwa-512.png'), pwa512Png);
    fs.writeFileSync(path.join(iconsDir, 'pwa-maskable-512.png'), pwaMaskable512Png);
    fs.writeFileSync(path.join(iconsDir, 'pwa-192.webp'), iconWebp128);
    fs.writeFileSync(path.join(iconsDir, 'pwa-512.webp'), iconWebp512);

    console.log(`✓ Generated brand assets for: ${path.relative(ROOT_DIR, dir)}`);
  }

  console.log('All brand assets generated successfully!');
}

generateAssets().catch(err => {
  console.error('Failed to generate brand assets:', err);
  process.exit(1);
});
