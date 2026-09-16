// Portable gate: no legacy square/ink patterns remain in reworked files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'src/app/(promotor)/app/learners/page.tsx',
  'src/components/promotor/LearnerDetail.tsx',
  'src/components/promotor/WhatsAppDraftSheet.tsx',
  'src/components/promotor/BroadcastReminderSheet.tsx',
];
const banned = ['var(--sep-strong)', '2px solid var(--ink)', 'SegmentedControl', 'PageHeader'];
const hits = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const b of banned) {
    if (src.includes(b)) hits.push(f + ' still contains ' + b);
  }
}
if (hits.length) {
  console.log(hits.join('\n'));
  process.exit(1);
}
console.log('GATECHECK no legacy passed');
