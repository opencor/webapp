import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, ipcMain } from 'electron'
import * as settings from 'electron-settings'
import * as fs from 'fs'
import { exec } from 'node:child_process'
import * as os from 'os'
import * as path from 'path'
import { isDevMode, isWindows, isLinux } from '../electron'
import { disableMenu, enableMenu, MainWindow, resetAll } from './MainWindow'
import { SplashScreenWindow } from './SplashScreenWindow'

export function log(message: string) {
  fs.writeFileSync(path.join(os.homedir() + '/Desktop/WebApp.txt'), message, { flag: 'a' })
}

// Prettify our settings.

settings.configure({
  prettify: true
})

// Resetting all of our settings, if needed.

if (settings.getSync('resetAll')) {
  fs.rmSync(path.join(app.getPath('userData'), 'Preferences'))
  fs.rmSync(path.join(app.getPath('userData'), 'settings.json'))
}

// Register our URI scheme.

export const URI_SCHEME = 'opencor'

let mainWindow: MainWindow | null = null
let triggeringUrl: string | null = null

app.setAsDefaultProtocolClient(URI_SCHEME, isWindows() ? process.execPath : undefined)

app.on('open-url', (_, url) => {
  log('- open-url\n')
  log(`  - url: ${url}\n`)

  triggeringUrl = url

  mainWindow?.handleArguments([url])
})

if (isLinux()) {
  // Make our application icon available so that it can be referenced by our desktop file.

  const localShareFolder = path.join(app.getPath('home'), '.local/share')

  exec(`mkdir ${localShareFolder}/${URI_SCHEME}`, (error) => {
    if (error !== null) {
      console.error('Failed to create the directory for the URI scheme icon.')
    }
  })

  fs.copyFileSync(
    path.join(import.meta.dirname, '../../src/main/assets/icon.png'),
    path.join(`${localShareFolder}/${URI_SCHEME}/icon.png`)
  )

  // Create a desktop file for OpenCOR and its URI scheme.

  fs.writeFileSync(
    path.join(`${localShareFolder}/applications/${URI_SCHEME}.desktop`),
    `[Desktop Entry]
Type=Application
Name=OpenCOR
Exec=${process.execPath} %u
Icon=${localShareFolder}/${URI_SCHEME}/icon.png
Terminal=false
MimeType=x-scheme-handler/${URI_SCHEME}`
  )

  // Update the desktop database.

  exec('update-desktop-database ~/.local/share/applications', (error) => {
    if (error !== null) {
      console.error('Failed to update the desktop database.')
    }
  })
}

// Allow only one instance of OpenCOR.

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('second-instance', (_event, argv) => {
  log('- second-instance\n')

  if (argv.length === 0) {
    log(`   - No command line arguments\n`)
  } else {
    log(`   - Command line:\n      - ${argv.join('\n      - ')}\n`)
  }

  if (mainWindow !== null) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()

    mainWindow.handleArguments(argv)
  }
})

// The app is ready, so finalise its initialisation.

app
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

    // Create our main window and pass to it our command line arguments or, if we got started via a URI scheme, the
    // triggering URL.

    mainWindow = new MainWindow(triggeringUrl !== null ? [triggeringUrl] : process.argv, splashScreenWindow)
  })
  .catch((err: unknown) => {
    console.error('Failed to create the main window:', err)
  })
