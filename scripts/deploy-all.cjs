const { spawnSync } = require('child_process');
const path = require('path');

// Clean out any conflicting API token so Wrangler uses the OAuth credentials from default.toml
delete process.env.CLOUDFLARE_API_TOKEN;

console.log('=== 1. DEPLOYING PLATFORM API ===');
const apiDir = path.resolve(__dirname, '../apps/platform-api');
const apiRes = spawnSync('npx', ['wrangler', 'deploy'], {
  cwd: apiDir,
  env: process.env,
  stdio: 'inherit',
  shell: true,
});

if (apiRes.status !== 0) {
  console.error('API deployment failed with code:', apiRes.status);
  process.exit(apiRes.status || 1);
}

console.log('\n=== 2. BUILDING PROMOTOR CLASS WEB ===');
const webDir = path.resolve(__dirname, '../apps/promotor-class-web');
const buildRes = spawnSync('npx', ['opennextjs-cloudflare', 'build'], {
  cwd: webDir,
  env: {
    ...process.env,
    NEXT_PUBLIC_API_MODE: 'http',
    NEXT_PUBLIC_API_URL: 'https://stiffin-promotor-api.moxsenna.workers.dev',
    NODE_OPTIONS: '-r ../../scripts/patch-symlink.cjs',
  },
  stdio: 'inherit',
  shell: true,
});

if (buildRes.status !== 0) {
  console.error('Web build failed with code:', buildRes.status);
  process.exit(buildRes.status || 1);
}

console.log('\n=== 3. DEPLOYING PROMOTOR CLASS WEB ===');
const webRes = spawnSync('npx', ['opennextjs-cloudflare', 'deploy'], {
  cwd: webDir,
  env: {
    ...process.env,
    NEXT_PUBLIC_API_MODE: 'http',
    NEXT_PUBLIC_API_URL: 'https://stiffin-promotor-api.moxsenna.workers.dev',
  },
  stdio: 'inherit',
  shell: true,
});

if (webRes.status !== 0) {
  console.error('Web deployment failed with code:', webRes.status);
  process.exit(webRes.status || 1);
}

console.log('\n=== ALL SERVICES DEPLOYED SUCCESSFULLY ===');
