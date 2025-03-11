import electron from 'electron'
import * as electronSettings from 'electron-settings'

import { isDevMode, isMacOs } from '../electron'

import icon from './assets/icon.png?asset'
import { URI_SCHEME } from './index'
import { ApplicationWindow } from './ApplicationWindow'
import { disableUi, enableMainMenu, enableUi } from './MainMenu'
import type { SplashScreenWindow } from './SplashScreenWindow'

export function retrieveMainWindowState(): {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
  isFullScreen: boolean
} {
  const workAreaSize = electron.screen.getPrimaryDisplay().workAreaSize
  const horizontalSpace = Math.round(workAreaSize.width / 13)
  const verticalSpace = Math.round(workAreaSize.height / 13)
  const x = electronSettings.getSync('mainWindowState.x')
  const y = electronSettings.getSync('mainWindowState.y')
  const width = electronSettings.getSync('mainWindowState.width')
  const height = electronSettings.getSync('mainWindowState.height')
  const isMaximized = electronSettings.getSync('mainWindowState.isMaximized')
  const isFullScreen = electronSettings.getSync('mainWindowState.isFullScreen')

  return {
    x: (x ?? horizontalSpace) as number,
    y: (y ?? verticalSpace) as number,
    width: (width ?? workAreaSize.width - 2 * horizontalSpace) as number,
    height: (height ?? workAreaSize.height - 2 * verticalSpace) as number,
    isMaximized: (isMaximized ?? false) as boolean,
    isFullScreen: (isFullScreen ?? false) as boolean
  }
}

export function resetAll(): void {
  electronSettings.setSync('resetAll', true)

  electron.app.relaunch()
  electron.app.quit()
}

export class MainWindow extends ApplicationWindow {
  // Properties.

  private _splashScreenWindowClosed = false

  // Constructor.

  constructor(commandLine: string[], splashScreenWindow: SplashScreenWindow | null) {
    // Initialise ourselves.

    const mainWindowState = retrieveMainWindowState()

    super({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: 640,
      minHeight: 480,
      ...(isMacOs() ? {} : { icon: icon })
    })

    // Set our dock icon (macOS only).

    if (isMacOs()) {
      electron.app.dock.setIcon(icon)
    }

    // Restore our state, if needed.

    if (mainWindowState.isMaximized) {
      this.maximize()
    } else if (mainWindowState.isFullScreen) {
      this.setFullScreen(true)
    }

    // Ask for the splash screen window to be closed with a short delay once we are visible and handle our command line
    // (also with a short delay if needed).

    this.once('show', () => {
      let handleCommandLineDelay = 0

      if (!this._splashScreenWindowClosed && !!splashScreenWindow) {
        const SHORT_DELAY = 369

        this._splashScreenWindowClosed = true

        handleCommandLineDelay = SHORT_DELAY

        setTimeout(() => {
          splashScreenWindow.close()
        }, SHORT_DELAY)
      }

      setTimeout(() => {
        this.handleArguments(commandLine)
      }, handleCommandLineDelay)
    })

    // Keep track of our new state upon closing.

    this.on('close', () => {
      if (!this.isMaximized() && !this.isMinimized() && !this.isFullScreen()) {
        mainWindowState.x = this.getPosition()[0]
        mainWindowState.y = this.getPosition()[1]
        mainWindowState.width = this.getContentSize()[0]
        mainWindowState.height = this.getContentSize()[1]
      }

      mainWindowState.isMaximized = this.isMaximized()
      mainWindowState.isFullScreen = this.isFullScreen()

      electronSettings.setSync('mainWindowState', mainWindowState)
    })

    // Enable our main menu.

    enableMainMenu()

    // Make sure that our menu bar is always visible.

    this.setAutoHideMenuBar(false)
    this.setMenuBarVisibility(true)

    // Open external links in the default browser.

    this.webContents.setWindowOpenHandler((details) => {
      electron.shell.openExternal(details.url).catch((error: unknown) => {
        console.error('Failed to open external URL:', error)
      })

      return {
        action: 'deny'
      }
    })

    // Load the remote URL for development or the local HTML file for production.

    if (isDevMode()) {
      // @ts-expect-error (isDevMode() is true which means that process.env.ELECTRON_RENDERER_URL is defined)
      this.loadURL(process.env.ELECTRON_RENDERER_URL).catch((error: unknown) => {
        console.error('Failed to load URL:', error)
      })
    } else {
      this.loadFile('./out/renderer/index.html').catch((error: unknown) => {
        console.error('Failed to load file:', error)
      })
    }
  }

  // Handle our command line arguments.

  handleArguments(commandLine: string[]): void {
    if (commandLine.length === 0) {
      return
    }

    commandLine.forEach((argument) => {
      if (argument.startsWith(`${URI_SCHEME}://`)) {
        function isAction(action: string, expectedAction: string): boolean {
          return action.localeCompare(expectedAction, undefined, { sensitivity: 'base' }) === 0
        }

        // We have been launched with a URL, so we need to parse it and act accordingly.

        const parsedUrl = new URL(argument)

        if (isAction(parsedUrl.hostname, 'openAboutDialog')) {
          // Ask our renderer to open our about dialog.

          this.webContents.send('about')
        } else if (isAction(parsedUrl.hostname, 'openSettingsDialog')) {
          // Ask our renderer to open our settings dialog.

          this.webContents.send('settings')
        } else {
          // Check whether we have files to open.

          const filePaths = parsedUrl.pathname.substring(1).split('%7C')

          if (
            (isAction(parsedUrl.hostname, 'openFile') && filePaths.length === 1) ||
            (isAction(parsedUrl.hostname, 'openFiles') && filePaths.length > 1)
          ) {
            // Ask our renderer to open the given file(s).

            for (const filePath of filePaths) {
              this.webContents.send('open', filePath)
            }
          }
        }
      }
    })
  }

  // Handle our File|Open menu.

  open(): void {
    disableUi()

    electron.dialog
      .showOpenDialog({
        properties: ['openFile', 'multiSelections']
      })
      .then(({ filePaths }) => {
        for (const filePath of filePaths) {
          this.webContents.send('open', filePath)
        }

        enableUi()
      })
      .catch((error: unknown) => {
        console.error('Failed to open file(s):', error)

        enableUi()
      })
  }
}
