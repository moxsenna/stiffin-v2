const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const appDir = path.join(projectRoot, 'apps', 'promotor-class-web');
const targetEnv = process.argv[2] === 'staging' ? 'staging' : 'production';
const apiUrl = targetEnv === 'staging' 
  ? 'https://stiffin-promotor-api-staging.moxsenna.workers.dev' 
  : 'https://stiffin-promotor-api.moxsenna.workers.dev';

console.log(`\n======================================================`);
console.log(`  Deploying PromotorClass to Cloudflare (${targetEnv.toUpperCase()})`);
console.log(`  API URL: ${apiUrl}`);
console.log(`======================================================\n`);

const dotNext = path.join(appDir, '.next');
const openNext = path.join(appDir, '.open-next');

// 1. Clean previous build folders safely
try {
  if (fs.existsSync(openNext)) {
    fs.rmSync(openNext, { recursive: true, force: true });
  }
} catch (e) {
  console.warn('Notice cleaning .open-next:', e.message);
}

// 2. Run Next.js production build
console.log('1. Building Next.js application...');
execSync('pnpm --filter @promotor/promotor-class-web build', {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_API_MODE: 'http',
    NEXT_PUBLIC_API_URL: apiUrl,
  }
});

// 3. Ensure standalone output has full .next folder on Windows
console.log('\n2. Syncing standalone artifacts for OpenNext...');
const standaloneAppDir = path.join(dotNext, 'standalone', 'apps', 'promotor-class-web');
const standaloneDotNext = path.join(standaloneAppDir, '.next');

fs.mkdirSync(standaloneDotNext, { recursive: true });

const items = fs.readdirSync(dotNext);
for (const item of items) {
  if (item === 'standalone') continue;
  const src = path.join(dotNext, item);
  const dst = path.join(standaloneDotNext, item);
  try {
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dst, { recursive: true, force: true });
    } else {
      fs.copyFileSync(src, dst);
    }
  } catch (err) {
    console.warn(`Warning copying ${item}:`, err.message);
  }
}

// 4. Run OpenNext Cloudflare build
console.log('\n3. Bundling Cloudflare Worker with OpenNext...');
execSync('pnpm --filter @promotor/promotor-class-web exec opennextjs-cloudflare build --skipNextBuild', {
  cwd: projectRoot,
  stdio: 'inherit',
});

// 5. Run Wrangler deploy
console.log('\n4. Uploading to Cloudflare Workers via Wrangler...');
const wranglerCmd = targetEnv === 'staging' 
  ? 'pnpm --filter @promotor/promotor-class-web exec wrangler deploy --env staging' 
  : 'pnpm --filter @promotor/promotor-class-web exec wrangler deploy';

execSync(wranglerCmd, {
  cwd: projectRoot,
  stdio: 'inherit',
});

console.log(`\n✅ Deployment to Cloudflare (${targetEnv.toUpperCase()}) completed successfully!\n`);
