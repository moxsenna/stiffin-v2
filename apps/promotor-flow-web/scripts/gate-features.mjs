import fs from 'fs';
import assert from 'assert';

const contactsPage = fs.readFileSync('src/app/(promotor)/app/contacts/page.tsx', 'utf8');
assert(contactsPage.includes('handleExportCsv'), 'Missing handleExportCsv in contacts page');
assert(contactsPage.includes('handleBatchBroadcast'), 'Missing handleBatchBroadcast in contacts page');
assert(contactsPage.includes('isBatchMode'), 'Missing isBatchMode in contacts page');
assert(contactsPage.includes('selectedIds'), 'Missing selectedIds in contacts page');

const toastFile = fs.readFileSync('src/components/ui/Toast.tsx', 'utf8');
assert(toastFile.includes('ToastProvider'), 'Missing ToastProvider in Toast.tsx');
assert(toastFile.includes('useToast'), 'Missing useToast in Toast.tsx');

const offlineFile = fs.readFileSync('src/components/ui/OfflineBanner.tsx', 'utf8');
assert(offlineFile.includes('OfflineBanner'), 'Missing OfflineBanner in OfflineBanner.tsx');

const appShell = fs.readFileSync('src/components/layout/AppShell.tsx', 'utf8');
assert(appShell.includes('ToastProvider'), 'AppShell must render ToastProvider');
assert(appShell.includes('OfflineBanner'), 'AppShell must render OfflineBanner');
assert(appShell.includes("window.addEventListener('storage'"), 'AppShell must listen to multi-tab storage events');

console.log('GATECHECK features passed');
