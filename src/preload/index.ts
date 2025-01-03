import { contextBridge, ipcRenderer } from 'electron'
import loc from '../../out/libOpenCOR/Release/libOpenCOR.node'

// Some bridging between our main process and renderer process.
// Note: ../electronapi.ts needs to be in sync with this file.

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer process asking the main process to do something for it.

  resetAll: () => ipcRenderer.invoke('reset-all'),
  enableMenu: () => ipcRenderer.invoke('enable-menu'),
  disableMenu: () => ipcRenderer.invoke('disable-menu'),

  // Renderer process listening to the main process.

  onInitSplashScreenWindow: (callback: (info: unknown) => void) =>
    ipcRenderer.on('init-splash-screen-window', (_event, info) => {
      callback(info)
    }),
  onResetAll: (callback: () => void) =>
    ipcRenderer.on('reset-all', () => {
      callback()
    }),
  onAbout: (callback: () => void) =>
    ipcRenderer.on('about', () => {
      callback()
    })
})

// Give our renderer process access to the C++ version of libOpenCOR.

contextBridge.exposeInMainWorld('libOpenCOR', {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  versionString: () => loc.version()
})
