import fs from 'node:fs';

const filesToCheck = [
  'src/components/learner/YoutubeLessonPlayer.tsx',
  'src/components/platform/PlatformFooter.tsx',
  'src/components/platform/PlatformHeader.tsx',
  'src/components/ui/index.tsx',
];

for (const f of filesToCheck) {
  if (!fs.existsSync(f)) {
    console.error(`Missing file ${f}`);
    process.exit(1);
  }
  const content = fs.readFileSync(f, 'utf8');
  // Check for raw <img> tags (ignoring comments or Image)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/<img\s/i.test(line) && !line.includes('//') && !line.includes('/*')) {
      console.error(`Raw <img> still found in ${f}:${i + 1}: ${line}`);
      process.exit(1);
    }
  }
}

console.log('GATECHECK images migrated passed');
