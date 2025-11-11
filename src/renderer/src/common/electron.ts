import electron from 'electron';

export function isPackaged(): boolean {
  return electron.app.isPackaged;
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isLinux(): boolean {
  return process.platform === 'linux';
}

export function isMacOs(): boolean {
  return process.platform === 'darwin';
}
