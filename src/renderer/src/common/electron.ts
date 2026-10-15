import electron from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export const isPackaged = (): boolean => {
  return electron.app.isPackaged;
};

export const isWindows = (): boolean => {
  return process.platform === 'win32';
};

export const isLinux = (): boolean => {
  return process.platform === 'linux';
};

export const isMacOs = (): boolean => {
  return process.platform === 'darwin';
};

// Return the path of the AppImage from which OpenCOR is running, if any.
// Note: the AppImage runtime provides the path of the AppImage and of its temporary mount point through the APPIMAGE
//       and APPDIR environment variables, respectively. However, those environment variables are inherited by all the
//       processes started from an AppImage (e.g., OpenCOR started from a terminal within an IDE that is itself an
//       AppImage), so we only trust them if OpenCOR is actually running from within APPDIR.

export const appImagePath = (): string | null => {
  const appImage = process.env.APPIMAGE;
  const appDir = process.env.APPDIR;

  if (!isLinux() || !appImage || !appDir) {
    return null;
  }

  try {
    return fs.realpathSync(process.execPath).startsWith(path.join(fs.realpathSync(appDir), path.sep)) ? appImage : null;
  } catch {
    return null;
  }
};
