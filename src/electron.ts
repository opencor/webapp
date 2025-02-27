import { is } from '@electron-toolkit/utils'

export function isDevMode(): boolean {
  return is.dev && !!process.env.ELECTRON_RENDERER_URL
}

export function isWindows(): boolean {
  return process.platform === 'win32'
}

export function isLinux(): boolean {
  return process.platform === 'linux'
}

export function isMacOs(): boolean {
  return process.platform === 'darwin'
}
