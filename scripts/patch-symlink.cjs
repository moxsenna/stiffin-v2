const fs = require('fs');
const path = require('path');

const origSymlink = fs.symlink;
const origSymlinkSync = fs.symlinkSync;
const origPromisesSymlink = fs.promises ? fs.promises.symlink : null;

function safeCopy(target, dest) {
  try {
    const resolvedTarget = path.isAbsolute(target) ? target : path.resolve(path.dirname(dest), target);
    const stat = fs.statSync(resolvedTarget);
    if (stat.isDirectory()) {
      try {
        fs.mkdirSync(dest, { recursive: true });
        fs.cpSync(resolvedTarget, dest, { recursive: true });
      } catch {}
    } else {
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(resolvedTarget, dest);
      } catch {}
    }
  } catch (e) {
    // ignore
  }
}

fs.symlinkSync = function (target, dest, type) {
  try {
    const resolvedTarget = path.isAbsolute(target) ? target : path.resolve(path.dirname(dest), target);
    const isDir = fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory();
    return origSymlinkSync(target, dest, type || (isDir ? 'junction' : 'file'));
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EEXIST') {
      safeCopy(target, dest);
      return;
    }
    throw err;
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
    if (cb) cb(err);
  }
};

if (fs.promises) {
  fs.promises.symlink = async function (target, dest, type) {
    try {
      fs.symlinkSync(target, dest, type);
    } catch (err) {
      if (err.code === 'EPERM' || err.code === 'EEXIST') {
        safeCopy(target, dest);
        return;
      }
      throw err;
    }
  };
}
