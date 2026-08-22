const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');

function resolveRealTarget(target, dest) {
  let resolved = path.isAbsolute(target) ? target : path.resolve(path.dirname(dest), target);
  if (fs.existsSync(resolved)) return resolved;

  // Try resolving via project node_modules
  const pkgName = path.basename(dest);
  const fromCwd = path.join(process.cwd(), 'node_modules', pkgName);
  if (fs.existsSync(fromCwd)) {
    try {
      return fs.realpathSync(fromCwd);
    } catch (e) {
      return fromCwd;
    }
  }

  const fromRoot = path.join(projectRoot, 'node_modules', pkgName);
  if (fs.existsSync(fromRoot)) {
    try {
      return fs.realpathSync(fromRoot);
    } catch (e) {
      return fromRoot;
    }
  }

  return resolved;
}

function safeCopy(target, dest) {
  try {
    const resolvedTarget = resolveRealTarget(target, dest);
    if (!fs.existsSync(resolvedTarget)) return;
    const stat = fs.statSync(resolvedTarget);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      fs.cpSync(resolvedTarget, dest, { recursive: true, force: true });
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(resolvedTarget, dest);
    }
  } catch (e) {
    // ignore
  }
}

// On Windows, always safeCopy instead of creating potentially broken symlinks
fs.symlinkSync = function (target, dest, type) {
  safeCopy(target, dest);
};

fs.symlink = function (target, dest, type, cb) {
  if (typeof type === 'function') {
    cb = type;
  }
  safeCopy(target, dest);
  if (cb) cb(null);
};

if (fs.promises) {
  fs.promises.symlink = async function (target, dest, type) {
    safeCopy(target, dest);
  };
}

// Windows rmSync safe fallback
const origRmSync = fs.rmSync;
fs.rmSync = function (targetPath, options) {
  try {
    return origRmSync(targetPath, options);
  } catch (err) {
    try {
      if (process.platform === 'win32' && fs.existsSync(targetPath)) {
        execSync(`cmd /c "rmdir /s /q \\"${targetPath}\\""`, { stdio: 'ignore' });
        return;
      }
    } catch (e) {}
  }
};

// Ensure standalone sync on exit
process.on('exit', () => {
  try {
    const cwd = process.cwd();
    const appName = path.basename(cwd);
    const dotNext = path.join(cwd, '.next');
    const standaloneAppDotNext = path.join(dotNext, 'standalone', 'apps', appName, '.next');
    if (fs.existsSync(dotNext) && fs.existsSync(path.join(dotNext, 'standalone'))) {
      fs.mkdirSync(standaloneAppDotNext, { recursive: true });
      const itemsToCopy = ['BUILD_ID', 'prerender-manifest.json', 'routes-manifest.json', 'app-build-manifest.json', 'build-manifest.json', 'server'];
      for (const item of itemsToCopy) {
        const src = path.join(dotNext, item);
        const dst = path.join(standaloneAppDotNext, item);
        if (fs.existsSync(src) && !fs.existsSync(dst)) {
          safeCopy(src, dst);
        }
      }
    }
  } catch (e) {}
});
