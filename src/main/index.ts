import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, ipcMain } from 'electron'
import * as settings from 'electron-settings'
import * as fs from 'fs'
import * as path from 'path'
import { isDevMode, isWindows } from '../electron'
import { disableMenu, enableMenu, MainWindow, resetAll } from './MainWindow'
import { SplashScreenWindow } from './SplashScreenWindow'

function log(message: string) {
  fs.writeFileSync('/Users/Alan/Desktop/WebApp.txt', message, { flag: 'a' })
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

// Allow only one instance of OpenCOR.

function opencorUrl(url: string[]): string | undefined {
  return url.find((url) => isOpencorUrl(url))
}

const singleInstanceLock = app.requestSingleInstanceLock()

if (!singleInstanceLock) {
  app.quit()
}

let mainWindow: MainWindow | null = null

app.on('second-instance', (_event, commandLine) => {
  log('- second-instance\n')

  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()
  }

  const url = opencorUrl(commandLine)

  if (url) {
    handleOpencorUrl(url)
  }
})

// Handle the OpenCOR URI scheme.

const URI_SCHEME = 'opencor'

function isOpencorUrl(url: string): boolean {
  return url.startsWith(`${URI_SCHEME}://`)
}

function handleOpencorUrl(url: string) {
  if (!app.isReady()) {
    app.once('ready', () => {
      handleOpencorUrl(url)
    })

    return
  }

  function isAction(action: string, expectedAction: string): boolean {
    return action.localeCompare(expectedAction, undefined, { sensitivity: 'base' }) === 0
  }

  // We have been launched with a URL, so we need to parse it and act accordingly.
  log('------------------\n')
  log(`- url: ${url}\n`)

  const parsedUrl = new URL(url)

  if (isAction(parsedUrl.hostname, 'openAboutDialog')) {
    // Open our about dialog.

    mainWindow?.webContents.send('about')
  } else if (isAction(parsedUrl.hostname, 'openPreferencesDialog')) {
    // Open our preferences dialog.
    //---OPENCOR--- To be disabled once we have a preferences dialog.
    // mainWindow?.webContents.send('preferences')
  } else {
    // Check whether we have files to open.

    const paths = parsedUrl.pathname.substring(1).split('%7C')

    if (
      (isAction(parsedUrl.hostname, 'openFile') && paths.length === 1) ||
      (isAction(parsedUrl.hostname, 'openFiles') && paths.length > 1)
    ) {
      // Open the given file(s).
      //---OPENCOR--- To be done.
    }
  }
}

// The app is ready, so finalise its initialisation.

let mainIsReadyResolver: () => void
const mainIsReadyPromise = new Promise<void>((resolve) => (mainIsReadyResolver = resolve))

function mainIsReady() {
  mainIsReadyResolver()
}

app
  .whenReady()
  .then(async () => {
    // Set process.env.NODE_ENV to 'production' if we are not the default app.
    // Note: we do this because some packages rely on the value of process.env.NODE_ENV to determine whether they
    //       should run in development mode (default) or production mode.

    if (!process.defaultApp) {
      process.env.NODE_ENV = 'production'
    }

    // Register our URI scheme.

    app.setAsDefaultProtocolClient(URI_SCHEME, isWindows() ? process.execPath : undefined)

    app.on('open-url', (_, url) => {
      if (isOpencorUrl(url)) {
        handleOpencorUrl(url)
      }
    })

    if (isWindows()) {
      const url = opencorUrl(process.argv)

      if (url) {
        handleOpencorUrl(url)
      }
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

    // Create our main window.

    mainIsReady()

    await mainIsReadyPromise

    mainWindow = new MainWindow(splashScreenWindow)
  })
  .catch((err: unknown) => {
    console.error('Failed to create the main window:', err)
  })
