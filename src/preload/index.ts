import { contextBridge, ipcRenderer } from 'electron'
import { default as loc } from '../../out/libOpenCOR/Release/libOpenCOR.node'

// Some bridging between our main process and renderer process.

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer process asking the main process to do something for it.

  resetAll: () => ipcRenderer.invoke('reset-all'),
  enableMenu: () => ipcRenderer.invoke('enable-menu'),
  disableMenu: () => ipcRenderer.invoke('disable-menu'),

  // Renderer process listening to the main process.

  onInitSplashScreenWindow: (callback: (info: { message: string }) => void) =>
    ipcRenderer.on('init-splash-screen-window', (_event, info) => callback(info)),
  onResetAll: (callback: (info: { message: string }) => void) =>
    ipcRenderer.on('reset-all', (_event, info) => callback(info)),
  onAbout: (callback: (info: { message: string }) => void) => ipcRenderer.on('about', (_event, info) => callback(info))
})

// Give our renderer process access to the C++ version of libOpenCOR.

contextBridge.exposeInMainWorld('libOpenCOR', {
  version: () => loc.version()
})
