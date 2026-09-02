const fs = require('fs');
const fsp = require('fs/promises');
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

function ensureParentDir(filePath) {
  try {
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
  } catch (e) {}
}

const origCopyFileSync = fs.copyFileSync;
fs.copyFileSync = function (src, dest, mode) {
  ensureParentDir(dest);
  return origCopyFileSync(src, dest, mode);
};

const origCopyFile = fs.copyFile;
fs.copyFile = function (src, dest, mode, cb) {
  if (typeof mode === 'function') {
    cb = mode;
    mode = 0;
  }
  ensureParentDir(dest);
  return origCopyFile(src, dest, mode, cb);
};

const origPromisesCopyFile = fsp.copyFile;
const patchedPromisesCopyFile = async function (src, dest, mode) {
  ensureParentDir(dest);
  return origPromisesCopyFile(src, dest, mode);
};
fsp.copyFile = patchedPromisesCopyFile;
if (fs.promises) {
  fs.promises.copyFile = patchedPromisesCopyFile;
}

const origRenameSync = fs.renameSync;
fs.renameSync = function (oldPath, newPath) {
  ensureParentDir(newPath);
  return origRenameSync(oldPath, newPath);
};

const origRename = fs.rename;
fs.rename = function (oldPath, newPath, cb) {
  ensureParentDir(newPath);
  return origRename(oldPath, newPath, cb);
};

const origPromisesRename = fsp.rename;
const patchedPromisesRename = async function (oldPath, newPath) {
  ensureParentDir(newPath);
  return origPromisesRename(oldPath, newPath);
};
fsp.rename = patchedPromisesRename;
if (fs.promises) {
  fs.promises.rename = patchedPromisesRename;
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
      ensureParentDir(dest);
      origCopyFileSync(resolvedTarget, dest);
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

const patchedPromisesSymlink = async function (target, dest, type) {
  safeCopy(target, dest);
};
fsp.symlink = patchedPromisesSymlink;
if (fs.promises) {
  fs.promises.symlink = patchedPromisesSymlink;
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
