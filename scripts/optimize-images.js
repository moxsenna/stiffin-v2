const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imagesDir = path.join(__dirname, '../apps/promotor-class-web/public/images');

async function processImages() {
  console.log('Optimizing images to WebP format...');

  // 1. Profile image
  await sharp(path.join(imagesDir, 'promoter_profile_rina.png'))
    .resize(600, 750, { fit: 'cover', position: 'top' })
    .webp({ quality: 82 })
    .toFile(path.join(imagesDir, 'promoter_profile_rina.webp'));

  // 2. 7 Hari Cover
  await sharp(path.join(imagesDir, 'program_cover_7hari.png'))
    .resize(800, 500, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(imagesDir, 'program_cover_7hari.webp'));

  // 3. 30 Hari Cover
  await sharp(path.join(imagesDir, 'program_cover_30hari.png'))
    .resize(800, 500, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(imagesDir, 'program_cover_30hari.webp'));

  // 4. Parenting Cover
  await sharp(path.join(imagesDir, 'program_cover_parenting.png'))
    .resize(800, 500, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(imagesDir, 'program_cover_parenting.webp'));

  console.log('All images converted to lightweight WebP successfully!');
}

processImages().catch(err => {
  console.error('Error optimizing images:', err);
  process.exit(1);
});
