import electron from 'electron'
import * as systemInformation from 'systeminformation'

import loc from '../../dist/libOpenCOR/Release/libOpenCOR.node'

// Some bridging between our main process and renderer process.
// Note: src/electronAPI.ts needs to be in sync with this file.

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

  disableMenu: () => electron.ipcRenderer.invoke('disable-menu'),
  enableMenu: () => electron.ipcRenderer.invoke('enable-menu'),
  filePath: (file: File) => electron.webUtils.getPathForFile(file),
  resetAll: () => electron.ipcRenderer.invoke('reset-all'),

  // Renderer process listening to the main process.

  onAbout: (callback: () => void) =>
    electron.ipcRenderer.on('about', () => {
      callback()
    }),
  onResetAll: (callback: () => void) =>
    electron.ipcRenderer.on('reset-all', () => {
      callback()
    })
})

// Give our renderer process access to the C++ version of libOpenCOR.
// Note: src/libopencor/locAPI.ts needs to be in sync with this file.

electron.contextBridge.exposeInMainWorld('locAPI', {
  versionString: () => loc.version()
})
