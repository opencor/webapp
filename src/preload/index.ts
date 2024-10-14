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

  // Callbacks.

  onInitSplashScreenWindow: (callback) => ipcRenderer.on('init-splash-screen-window', (_event, info) => callback(info)),
  onResetAll: (callback) => ipcRenderer.on('reset-all', () => callback()),
  onAbout: (callback) => ipcRenderer.on('about', () => callback())
})
