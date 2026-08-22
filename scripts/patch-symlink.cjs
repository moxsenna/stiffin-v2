const fs = require('fs');
const path = require('path');

const origSymlink = fs.symlink;
const origSymlinkSync = fs.symlinkSync;

function safeCopy(target, dest) {
  try {
    const resolvedTarget = path.isAbsolute(target) ? target : path.resolve(path.dirname(dest), target);
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

fs.symlinkSync = function (target, dest, type) {
  try {
    const resolvedTarget = path.isAbsolute(target) ? target : path.resolve(path.dirname(dest), target);
    const isDir = fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory();
    // On Windows, directory junctions do NOT require privileges
    const symlinkType = type || (isDir ? 'junction' : 'file');
    return origSymlinkSync(target, dest, symlinkType);
  } catch (err) {
    safeCopy(target, dest);
  }
};

fs.symlink = function (target, dest, type, cb) {
  if (typeof type === 'function') {
    cb = type;
    type = undefined;
  }
  try {
    fs.symlinkSync(target, dest, type);
    if (cb) cb(null);
  } catch (err) {
    safeCopy(target, dest);
    if (cb) cb(null);
  }
};

if (fs.promises) {
  fs.promises.symlink = async function (target, dest, type) {
    try {
      fs.symlinkSync(target, dest, type);
    } catch (err) {
      safeCopy(target, dest);
    }
  };
}

// Ensure standalone sync on exit
process.on('exit', () => {
  try {
    const cwd = process.cwd();
    const dotNext = path.join(cwd, '.next');
    const standaloneAppDotNext = path.join(dotNext, 'standalone', 'apps', 'promotor-class-web', '.next');
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
