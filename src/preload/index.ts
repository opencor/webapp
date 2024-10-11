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
  // @ts-ignore (defined in lib.dom.d.ts)
  window.electron = electronAPI
  // @ts-ignore (defined in lib.dom.d.ts)
  window.api = api
}

// Some bridging between our main process and renderer process.

contextBridge.exposeInMainWorld('electronAPI', {
  // Handlers.

  resetAll: () => ipcRenderer.invoke('reset-all'),

  // Callbacks.

  onInitSplashScreenWindow: (callback) =>
    ipcRenderer.on('init-splash-screen-window', (_event, value) => callback(value)),
  onResetAll: (callback) => ipcRenderer.on('reset-all', () => callback())
})
