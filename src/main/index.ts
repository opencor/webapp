import * as electronToolkitUtils from '@electron-toolkit/utils'

import electron from 'electron'
import * as electronSettings from 'electron-settings'
import fs from 'fs'
import * as nodeChildProcess from 'node:child_process'
import path from 'path'

import { isDevMode, isWindows, isLinux } from '../electron'

import { disableMainMenu, enableMainMenu } from './MainMenu'
import { MainWindow, resetAll } from './MainWindow'
import { SplashScreenWindow } from './SplashScreenWindow'

// Prettify our settings.

electronSettings.configure({
  prettify: true
})

// Resetting all of our settings, if needed.

if (electronSettings.getSync('resetAll')) {
  fs.rmSync(path.join(electron.app.getPath('userData'), 'Preferences'))
  fs.rmSync(path.join(electron.app.getPath('userData'), 'settings.json'))
}

// Register our URI scheme.

export const URI_SCHEME = 'opencor'

electron.app.setAsDefaultProtocolClient(URI_SCHEME, isWindows() ? process.execPath : undefined)

if (isLinux()) {
  // Make our application icon available so that it can be referenced by our desktop file.

  const localShareFolder = path.join(electron.app.getPath('home'), '.local/share')
  const localShareOpencorFolder = path.join(localShareFolder, URI_SCHEME)

  // Check whether localShareOpencorFolder exists and, if not, create it.

  if (!fs.existsSync(localShareOpencorFolder)) {
    fs.mkdirSync(localShareOpencorFolder)
  }

  fs.copyFileSync(
    path.join(import.meta.dirname, '../../src/main/assets/icon.png'),
    path.join(`${localShareOpencorFolder}/icon.png`)
  )

  // Create a desktop file for OpenCOR and its URI scheme.

  fs.writeFileSync(
    path.join(`${localShareFolder}/applications/${URI_SCHEME}.desktop`),
    `[Desktop Entry]
Type=Application
Name=OpenCOR
Exec=${process.execPath} %u
Icon=${localShareOpencorFolder}/icon.png
Terminal=false
MimeType=x-scheme-handler/${URI_SCHEME}`
  )

  // Update the desktop database.

  nodeChildProcess.exec('update-desktop-database ~/.local/share/applications', (error) => {
    if (error !== null) {
      console.error('Failed to update the desktop database:', error)
    }
  })
}

// Allow only one instance of OpenCOR.

export let mainWindow: MainWindow | null = null

if (!electron.app.requestSingleInstanceLock()) {
  electron.app.quit()
}

electron.app.on('second-instance', (_event, argv) => {
  if (mainWindow !== null) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()

    mainWindow.handleArguments(argv)
  }
})

// Handle the clicking of an opencor:// link.

let triggeringUrl: string | null = null

electron.app.on('open-url', (_, url) => {
  triggeringUrl = url

  mainWindow?.handleArguments([url])
})

// The app is ready, so finalise its initialisation.

electron.app
  .whenReady()
  .then(() => {
    // Set process.env.NODE_ENV to 'production' if we are not the default app.
    // Note: we do this because some packages rely on the value of process.env.NODE_ENV to determine whether they
    //       should run in development mode (default) or production mode.

    if (!process.defaultApp) {
      process.env.NODE_ENV = 'production'
    }

    // Create our splash window, if we are not in development mode, and pass it our copyright and version values.

    const splashScreenWindow: SplashScreenWindow | null = isDevMode() ? null : new SplashScreenWindow()

    // Set our app user model id for Windows.

    electronToolkitUtils.electronApp.setAppUserModelId('ws.opencor.app')

    // Enable the F12 shortcut (to show/hide the developer tools), if we are in development.

    if (isDevMode()) {
      electron.app.on('browser-window-created', (_, window) => {
        electronToolkitUtils.optimizer.watchWindowShortcuts(window)
      })
    }

    // Handle some requests from our renderer process.

    electron.ipcMain.handle('disable-main-menu', disableMainMenu)
    electron.ipcMain.handle('enable-main-menu', enableMainMenu)
    electron.ipcMain.handle('reset-all', resetAll)

    // Create our main window and pass to it our command line arguments or, if we got started via a URI scheme, the
    // triggering URL.

    mainWindow = new MainWindow(triggeringUrl !== null ? [triggeringUrl] : process.argv, splashScreenWindow)
  })
  .catch((error: unknown) => {
    console.error('Failed to create the main window:', error)
  })
