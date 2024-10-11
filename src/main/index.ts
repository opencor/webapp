import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, ipcMain } from 'electron'
import * as settings from 'electron-settings'
import * as fs from 'fs'
import { join } from 'path'
import { MainWindow, resetAll } from './MainWindow'
import { SplashScreenWindow } from './SplashScreenWindow'

export function developmentMode(): boolean {
  return is.dev && process.env['ELECTRON_RENDERER_URL'] !== undefined
}

// Prettify our settings.

settings.configure({
  prettify: true
})

// Resetting all of our settings, if needed.

if (settings.getSync('resetAll')) {
  fs.rmSync(join(app.getPath('userData'), 'Preferences'))
  fs.rmSync(join(app.getPath('userData'), 'settings.json'))
}

// This method is called when Electron has finished its initialisation and is ready to create browser windows. Some APIs
// can only be used after this event occurs.

app.whenReady().then(() => {
  // Create our splash window, if we are not in development mode, and pass it our copyright and version values.

  let splashScreenWindow: SplashScreenWindow = null as unknown as SplashScreenWindow

  if (!developmentMode()) {
    const currentYear = new Date().getFullYear()

    splashScreenWindow = new SplashScreenWindow(currentYear === 2024 ? '2024' : `2024-${currentYear}`, app.getVersion())
  }

  // Set our app user model id for Windows.

  electronApp.setAppUserModelId('ws.opencor.app')

  // Enable the F12 shortcut (to show/hide the developer tools), if we are in development.

  if (developmentMode()) {
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })
  }

  // Handle some requests from our renderer process.

  ipcMain.handle('reset-all', resetAll)

  // Create our main window.

  new MainWindow(splashScreenWindow)
})
