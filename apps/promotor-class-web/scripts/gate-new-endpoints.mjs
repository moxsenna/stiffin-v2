import fs from 'node:fs';

const apiAppFile = '../platform-api/src/app.ts';

if (!fs.existsSync(apiAppFile)) {
  console.error('Missing platform-api/src/app.ts');
  process.exit(1);
}

const apiContent = fs.readFileSync(apiAppFile, 'utf8');

const requiredEndpoints = [
  '/api/v1/learner/me/schedules',
  '/api/v1/learner/me/assignments',
  '/api/v1/public/workspaces/:workspaceSlug/programs/:programSlug/reviews',
  '/api/v1/public/workspaces/:workspaceSlug/programs/:programSlug/batches',
  '/api/v1/public/workspaces/:workspaceSlug/programs/:programSlug/mentors',
  '/api/v1/learner/me/orders',
];

for (const ep of requiredEndpoints) {
  if (!apiContent.includes(ep)) {
    console.error(`Missing required endpoint in platform-api: ${ep}`);
    process.exit(1);
  }
}

console.log('GATECHECK new endpoints passed');
