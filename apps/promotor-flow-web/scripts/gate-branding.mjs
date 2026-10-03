import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('Testing G4: Ralivo Flow Branding & Visual Code Completeness...');

// 1. Check layout & metadata
const layoutPath = path.join(root, 'src/app/layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
assert.ok(layoutContent.includes('Ralivo Flow'), 'layout.tsx must contain "Ralivo Flow"');

// 2. Check manifest.ts
const manifestPath = path.join(root, 'src/app/manifest.ts');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
assert.ok(manifestContent.includes('Ralivo Flow'), 'manifest.ts must contain "Ralivo Flow"');

// 3. Check BrandKicker in ui/index.tsx
const uiIndexPath = path.join(root, 'src/components/ui/index.tsx');
const uiIndexContent = fs.readFileSync(uiIndexPath, 'utf8');
assert.ok(uiIndexContent.includes('export function BrandKicker'), 'BrandKicker must be exported');
assert.ok(uiIndexContent.includes('/icons/pwa-192.png'), 'BrandKicker must reference /icons/pwa-192.png');
assert.ok(uiIndexContent.includes('Ralivo Flow'), 'BrandKicker must display Ralivo Flow');

// 4. Verify no remaining "PromotorFlow PWA" in pages
const pagesToCheck = [
  'src/app/(promotor)/app/page.tsx',
  'src/app/(promotor)/app/calendar/page.tsx',
  'src/app/(promotor)/app/contacts/page.tsx',
  'src/app/(promotor)/app/contacts/[contactId]/page.tsx',
  'src/app/(promotor)/app/pipeline/page.tsx',
  'src/app/(promotor)/app/templates/page.tsx',
];

for (const p of pagesToCheck) {
  const content = fs.readFileSync(path.join(root, p), 'utf8');
  assert.ok(!content.includes('PromotorFlow PWA'), `${p} must not contain "PromotorFlow PWA"`);
  assert.ok(content.includes('BrandKicker'), `${p} must use BrandKicker`);
}

// 5. Check official logo and icon assets exist
assert.ok(fs.existsSync(path.join(root, 'public/images/ralivo-logo.webp')), 'ralivo-logo.webp exists');
assert.ok(fs.existsSync(path.join(root, 'public/icons/pwa-192.png')), 'pwa-192.png exists');

console.log('GATECHECK branding passed: Ralivo Flow branding and visual components 100% verified.');
