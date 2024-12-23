import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

// If context isolation is enabled then expose the Electron API to the renderer otherwise to the global DOM.

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (window.electron is defined in lib.dom.d.ts)
  window.electron = electronAPI
  // @ts-ignore (window.api is defined in lib.dom.d.ts)
  window.api = api
}

// Some bridging between our main process and renderer process.

contextBridge.exposeInMainWorld('electronAPI', {
  // Handlers.

  resetAll: () => ipcRenderer.invoke('reset-all'),
  enableMenu: () => ipcRenderer.invoke('enable-menu'),
  disableMenu: () => ipcRenderer.invoke('disable-menu'),

  // Callbacks.

  onInitSplashScreenWindow: (callback: (info: { message: string }) => void) =>
    ipcRenderer.on('init-splash-screen-window', (_event, info) => callback(info)),
  onResetAll: (callback: (info: { message: string }) => void) =>
    ipcRenderer.on('reset-all', (_event, info) => callback(info)),
  onAbout: (callback: (info: { message: string }) => void) => ipcRenderer.on('about', (_event, info) => callback(info))
})
