import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, ipcMain } from 'electron'
import * as settings from 'electron-settings'
import * as fs from 'fs'
import * as path from 'path'
import { isDevMode, isWindows } from '../electron'
import { disableMenu, enableMenu, MainWindow, resetAll } from './MainWindow'
import { SplashScreenWindow } from './SplashScreenWindow'

// Prettify our settings.

settings.configure({
  prettify: true
})

// Resetting all of our settings, if needed.

if (settings.getSync('resetAll')) {
  fs.rmSync(path.join(app.getPath('userData'), 'Preferences'))
  fs.rmSync(path.join(app.getPath('userData'), 'settings.json'))
}

// Allow only one instance of OpenCOR.

const singleInstanceLock = app.requestSingleInstanceLock()

if (!singleInstanceLock) {
  app.quit()
}

let mainWindow: MainWindow | null = null

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()
  }
})

// This method is called when Electron has finished its initialisation and is ready to create browser windows. Some APIs
// can only be used after this event occurs.

app
  .whenReady()
  .then(() => {
    // Register our URI scheme.

    const URI_SCHEME = 'opencor'
    app.setAsDefaultProtocolClient(URI_SCHEME, isWindows() ? process.execPath : undefined)

    // Create our splash window, if we are not in development mode, and pass it our copyright and version values.

    const splashScreenWindow: SplashScreenWindow | null = isDevMode() ? null : new SplashScreenWindow()

    // Set our app user model id for Windows.

    electronApp.setAppUserModelId('ws.opencor.app')

    // Enable the F12 shortcut (to show/hide the developer tools), if we are in development.

    if (isDevMode()) {
      app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
      })
    }

    // Handle some requests from our renderer process.

    ipcMain.handle('reset-all', resetAll)
    ipcMain.handle('enable-menu', enableMenu)
    ipcMain.handle('disable-menu', disableMenu)

    // Create our main window.

    mainWindow = new MainWindow(splashScreenWindow)
  })
  .catch((err: unknown) => {
    console.error('Failed to create the main window:', err)
  })
