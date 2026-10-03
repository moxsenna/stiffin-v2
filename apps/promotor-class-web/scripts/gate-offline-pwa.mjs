import fs from 'node:fs';

const swFile = 'public/sw.js';
const offlineManagerFile = 'src/lib/offline/offline-manager.ts';

if (!fs.existsSync(swFile) || !fs.existsSync(offlineManagerFile)) {
  console.error('Missing public/sw.js or offline-manager.ts');
  process.exit(1);
}

const swContent = fs.readFileSync(swFile, 'utf8');
const offlineContent = fs.readFileSync(offlineManagerFile, 'utf8');

const hasInstallCache = swContent.includes('caches.open') && swContent.includes('CACHE_NAME');
const hasFetchHandler = swContent.includes('addEventListener(\'fetch\'') || swContent.includes('addEventListener("fetch"');
const hasModuleCacheDownload = offlineContent.includes('downloadLessonForOffline') && offlineContent.includes('isLessonAvailableOffline');

if (!hasInstallCache || !hasFetchHandler) {
  console.error('Service Worker does not implement proper cache or fetch strategy');
  process.exit(1);
}
if (!hasModuleCacheDownload) {
  console.error('Offline manager lacks downloadLessonForOffline or isLessonAvailableOffline methods');
  process.exit(1);
}

console.log('GATECHECK offline pwa passed');
