import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const BRAND = '#2563EB';
const INK = '#0F172A';

function iconSvg({ size, maskable }) {
  const pad = maskable ? size * 0.18 : size * 0.14;
  const inner = size - pad * 2;
  const stroke = Math.max(3, Math.round(size * 0.045));

  // Abstract mark: white frame + centered dot — clean, brand-neutral
  const frame = inner * 0.78;
  const fx = (size - frame) / 2;
  const dot = frame * 0.34;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <rect x="${fx}" y="${fx}" width="${frame}" height="${frame}" fill="none" stroke="#FFFFFF" stroke-width="${stroke}"/>
  <rect x="${(size - dot) / 2}" y="${(size - dot) / 2}" width="${dot}" height="${dot}" fill="#FFFFFF"/>
</svg>`;
}

const targets = [
  { app: 'apps/promotor-class-web', letter: 'PC' },
  { app: 'apps/promotor-flow-web', letter: 'PF' },
];

for (const { app, letter } of targets) {
  const dir = path.resolve(process.cwd(), app, 'public', 'icons');
  fs.mkdirSync(dir, { recursive: true });

  const variants = [
    { file: 'pwa-192.png', size: 192, maskable: false },
    { file: 'pwa-512.png', size: 512, maskable: false },
    { file: 'pwa-maskable-512.png', size: 512, maskable: true },
    { file: 'apple-touch-icon.png', size: 180, maskable: false },
  ];

  for (const v of variants) {
    const svg = Buffer.from(iconSvg({ size: v.size, maskable: v.maskable }));
    const out = path.join(dir, v.file);
    await sharp(svg).png().toFile(out);
    const stat = fs.statSync(out);
    console.log(`OK ${app} ${v.file} ${stat.size}b`);
  }
}
console.log('DONE');
