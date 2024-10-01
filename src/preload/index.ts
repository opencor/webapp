import { contextBridge } from 'electron'
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
