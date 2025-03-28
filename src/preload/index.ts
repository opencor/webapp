import electron from 'electron'
import * as systemInformation from 'systeminformation'

import loc from '../../dist/libOpenCOR/Release/libOpenCOR.node'

// Some bridging between our main process and renderer process.
// Note: this must be in sync with src/electronAPI.ts.

const osInfo = await systemInformation.osInfo()

electron.contextBridge.exposeInMainWorld('electronAPI', {
  // Some general methods.

  operatingSystem: () => {
    const architecture = osInfo.arch === 'x64' ? 'Intel' : 'ARM'

    if (osInfo.platform === 'Windows') {
      // Note: osInfo.distro returns something like "Microsoft Windows 11 Pro", but we want it to return
      //       "Windows 11 Pro", so we remove the "Microsoft " part.

      return osInfo.distro.replace('Microsoft ', '') + ' (' + architecture + ')'
    }

    return osInfo.distro + ' ' + osInfo.release + ' (' + architecture + ')'
  },

  // Renderer process asking the main process to do something for it.

  enableDisableMainMenu: (enable: boolean) => electron.ipcRenderer.invoke('enable-disable-main-menu', enable),
  enableDisableFileCloseAndCloseAllMenuItems: (enable: boolean) =>
    electron.ipcRenderer.invoke('enable-disable-file-close-and-close-all-menu-items', enable),
  filePath: (file: File) => electron.webUtils.getPathForFile(file),
  resetAll: () => electron.ipcRenderer.invoke('reset-all'),

  // Renderer process listening to the main process.

  onAbout: (callback: () => void) =>
    electron.ipcRenderer.on('about', () => {
      callback()
    }),
  onAction: (callback: (action: string) => void) =>
    electron.ipcRenderer.on('action', (_event, action) => {
      callback(action)
    }),
  onCheckForUpdates: (callback: () => void) =>
    electron.ipcRenderer.on('check-for-updates', () => {
      callback()
    }),
  onEnableDisableUi: (callback: (enable: boolean) => void) =>
    electron.ipcRenderer.on('enable-disable-ui', (_event, enable: boolean) => {
      callback(enable)
    }),
  onOpen: (callback: (filePath: string) => void) =>
    electron.ipcRenderer.on('open', (_event, ...filePaths) => {
      for (const filePath of filePaths) {
        callback(filePath)
      }
    }),
  onOpenRemote: (callback: () => void) =>
    electron.ipcRenderer.on('open-remote', () => {
      callback()
    }),
  onClose: (callback: () => void) =>
    electron.ipcRenderer.on('close', () => {
      callback()
    }),
  onCloseAll: (callback: () => void) =>
    electron.ipcRenderer.on('close-all', () => {
      callback()
    }),
  onResetAll: (callback: () => void) =>
    electron.ipcRenderer.on('reset-all', () => {
      callback()
    }),
  onSettings: (callback: () => void) =>
    electron.ipcRenderer.on('settings', () => {
      callback()
    })
})

// Give our renderer process access to the native node module for libOpenCOR.
// Note: this must be in sync with src/libopencor/src/main.cpp.

electron.contextBridge.exposeInMainWorld('locAPI', {
  // Some general methods.

  version: () => loc.version(),

  // FileManager API.

  fileManagerUnmanage: (path: string) => loc.fileManagerUnmanage(path),

  // File API.

  fileContents: (path: string) => loc.fileContents(path),
  fileCreate: (path: string, contents: object) => loc.fileCreate(path, contents),
  fileIssues: (path: string) => loc.fileIssues(path),
  fileType: (path: string) => loc.fileType(path),

  // SED API.

  sedDocumentCreate: (path: string) => loc.sedDocumentCreate(path),
  sedDocumentIssues: (path: string) => loc.sedDocumentIssues(path)
})
