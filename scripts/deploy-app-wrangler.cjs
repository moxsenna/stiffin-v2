const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const appName = process.argv[2] || 'class'; // 'api', 'class', or 'flow'
const targetEnv = process.argv[3] === 'staging' ? 'staging' : 'production';

const appDirMap = {
  api: path.join(projectRoot, 'apps', 'platform-api'),
  class: path.join(projectRoot, 'apps', 'promotor-class-web'),
  flow: path.join(projectRoot, 'apps', 'promotor-flow-web'),
};

const pkgNameMap = {
  api: '@promotor/platform-api',
  class: '@promotor/promotor-class-web',
  flow: '@promotor/promotor-flow-web',
};

const appDir = appDirMap[appName];
const pkgName = pkgNameMap[appName];

if (!appDir || !pkgName) {
  console.error(`Invalid app name: "${appName}". Use "api", "class", or "flow".`);
  process.exit(1);
}

const apiUrl = targetEnv === 'staging'
  ? 'https://stiffin-promotor-api-staging.moxsenna.workers.dev'
  : 'https://stiffin-promotor-api.moxsenna.workers.dev';

console.log(`\n======================================================`);
console.log(`  Deploying ${pkgName} to Cloudflare (${targetEnv.toUpperCase()})`);
console.log(`  API URL: ${apiUrl}`);
console.log(`======================================================\n`);

if (appName === 'api') {
  // Deploy Hono Platform API Worker
  const wranglerCmd = targetEnv === 'staging'
    ? `pnpm --filter ${pkgName} exec wrangler deploy --env staging`
    : `pnpm --filter ${pkgName} exec wrangler deploy`;

  console.log('1. Deploying platform-api Worker via Wrangler...');
  execSync(wranglerCmd, { cwd: projectRoot, stdio: 'inherit' });
  console.log(`\n✅ Platform API deployment to Cloudflare (${targetEnv.toUpperCase()}) completed!\n`);
  process.exit(0);
}

// For Next.js OpenNext Apps (class, flow):
const dotNext = path.join(appDir, '.next');
const openNext = path.join(appDir, '.open-next');

// 1. Clean previous build folders safely
try {
  if (fs.existsSync(openNext)) {
    if (process.platform === 'win32') {
      execSync(`powershell -NoProfile -Command "if (Test-Path '${openNext}') { Remove-Item -Path '${openNext}' -Recurse -Force }"`, { stdio: 'ignore' });
    } else {
      fs.rmSync(openNext, { recursive: true, force: true });
    }
  }
} catch (e) {
  console.warn('Notice cleaning .open-next:', e.message);
}

// 2. Run Next.js production build
console.log(`1. Building Next.js application (${pkgName})...`);
execSync(`pnpm --filter ${pkgName} build`, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_API_MODE: 'http',
    NEXT_PUBLIC_API_URL: apiUrl,
  },
});

// 3. Ensure standalone output has full .next folder on Windows
console.log('\n2. Syncing standalone artifacts for OpenNext...');
const folderName = path.basename(appDir);
const standaloneAppDir = path.join(dotNext, 'standalone', 'apps', folderName);
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
execSync(`pnpm --filter ${pkgName} exec opennextjs-cloudflare build --skipNextBuild`, {
  cwd: projectRoot,
  stdio: 'inherit',
});

// 5. Run Wrangler deploy
console.log('\n4. Uploading to Cloudflare Workers via Wrangler...');
const wranglerCmd = targetEnv === 'staging'
  ? `pnpm --filter ${pkgName} exec wrangler deploy --env staging`
  : `pnpm --filter ${pkgName} exec wrangler deploy`;

execSync(wranglerCmd, {
  cwd: projectRoot,
  stdio: 'inherit',
});

console.log(`\n✅ Deployment of ${pkgName} to Cloudflare (${targetEnv.toUpperCase()}) completed successfully!\n`);
