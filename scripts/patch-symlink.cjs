/**
 * Monkey-patches fs.symlink and fs.symlinkSync to gracefully fallback to copy
 * on Windows systems where symlink creation lacks OS privileges (EPERM).
 */
const fs = require('fs');
const path = require('path');

const originalSymlinkSync = fs.symlinkSync;
fs.symlinkSync = function (target, dest, type) {
  try {
    return originalSymlinkSync.call(fs, target, dest, type);
  } catch (err) {
    if (err && (err.code === 'EPERM' || err.code === 'EEXIST')) {
      try {
        const resolvedTarget = path.isAbsolute(target)
          ? target
          : path.resolve(path.dirname(dest), target);

        if (fs.existsSync(dest)) {
          fs.rmSync(dest, { recursive: true, force: true });
        }

        const stat = fs.statSync(resolvedTarget);
        if (stat.isDirectory()) {
          fs.cpSync(resolvedTarget, dest, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(resolvedTarget, dest);
        }
        return;
      } catch (copyErr) {
        // if copy also fails, throw original error
        throw err;
      }
    }
    throw err;
  }
};

const originalPromisesSymlink = fs.promises.symlink;
if (originalPromisesSymlink) {
  fs.promises.symlink = async function (target, dest, type) {
    try {
      return await originalPromisesSymlink.call(fs.promises, target, dest, type);
    } catch (err) {
      if (err && (err.code === 'EPERM' || err.code === 'EEXIST')) {
        try {
          const resolvedTarget = path.isAbsolute(target)
            ? target
            : path.resolve(path.dirname(dest), target);

          if (fs.existsSync(dest)) {
            await fs.promises.rm(dest, { recursive: true, force: true });
          }

          const stat = await fs.promises.stat(resolvedTarget);
          if (stat.isDirectory()) {
            await fs.promises.cp(resolvedTarget, dest, { recursive: true });
          } else {
            await fs.promises.mkdir(path.dirname(dest), { recursive: true });
            await fs.promises.copyFile(resolvedTarget, dest);
          }
          return;
        } catch (copyErr) {
          throw err;
        }
      }
      throw err;
    }
  };
}
