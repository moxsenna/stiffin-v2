import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

async function sliceImage(filePath, prefix) {
  const meta = await sharp(filePath).metadata();
  const height = meta.height;
  const width = meta.width;
  const sliceHeight = 900;
  let idx = 0;

  for (let top = 0; top < height; top += sliceHeight) {
    const currentH = Math.min(sliceHeight, height - top);
    const outPath = path.join(path.dirname(filePath), `${prefix}-slice-${idx}.png`);
    await sharp(filePath)
      .extract({ left: 0, top, width, height: currentH })
      .toFile(outPath);
    console.log(`Saved ${outPath}`);
    idx++;
  }
}

async function main() {
  const dir = path.join(process.cwd(), 'tests', 'visual', 'audit-output');
  await sliceImage(path.join(dir, 'class-mobile-full.png'), 'class');
  await sliceImage(path.join(dir, 'flow-mobile-full.png'), 'flow');
}

main().catch(console.error);
