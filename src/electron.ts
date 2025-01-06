import { is } from '@electron-toolkit/utils'

export function isDevMode() {
  return is.dev && !!process.env.ELECTRON_RENDERER_URL
}
