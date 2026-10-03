import fs from 'node:fs';

const pushManagerFile = 'src/lib/notifications/push-manager.ts';
const storefrontQueries = 'src/modules/public-storefront/queries.ts';

if (!fs.existsSync(pushManagerFile) || !fs.existsSync(storefrontQueries)) {
  console.error('Missing push-manager.ts or public-storefront/queries.ts');
  process.exit(1);
}

const pushContent = fs.readFileSync(pushManagerFile, 'utf8');
const sfQueriesContent = fs.readFileSync(storefrontQueries, 'utf8');

const hasPushSubscription = pushContent.includes('requestNotificationPermission') && pushContent.includes('scheduleLocalReminder');
const hasServerFilter = sfQueriesContent.includes('search') && sfQueriesContent.includes('category');

if (!hasPushSubscription) {
  console.error('Push manager missing permission or local reminder capability');
  process.exit(1);
}
if (!hasServerFilter) {
  console.error('Catalog query does not support server-side search and category filtering');
  process.exit(1);
}

console.log('GATECHECK search push passed');
