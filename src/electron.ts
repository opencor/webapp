import { is } from '@electron-toolkit/utils'

export function isDevMode() {
  return is.dev && !!process.env.ELECTRON_RENDERER_URL
}

export function isWindows() {
  return process.platform === 'win32'
}

export function isLinux() {
  return process.platform === 'linux'
}

export function isMacOs() {
  return process.platform === 'darwin'
}
