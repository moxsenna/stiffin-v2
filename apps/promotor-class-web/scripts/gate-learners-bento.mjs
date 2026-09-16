// Portable gate: learners page uses the new bento system
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root, 'src/app/(promotor)/app/learners/page.tsx'), 'utf8');
const required = ['pwa-screen', 'pwa-card', 'PwaChips', 'LearnerDetail'];
const missing = required.filter((token) => !page.includes(token));
if (missing.length) {
  console.log('missing: ' + missing.join(', '));
  process.exit(1);
}
console.log('GATECHECK learners bento passed');
