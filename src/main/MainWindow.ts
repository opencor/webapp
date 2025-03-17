import electron from 'electron'
import * as electronSettings from 'electron-settings'
import path from 'path'

import { FULL_URI_SCHEME } from '../constants'
import { isDevMode, isMacOs } from '../electron'

import icon from './assets/icon.png?asset'
import { ApplicationWindow } from './ApplicationWindow'
import { disableMainMenu, enableMainMenu } from './MainMenu'
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
        // The command line can either be a classical command line or an OpenCOR action (i.e. an opencor:// link). In
        // the former case, we need to remove one or two arguments while, in the latter case, nothing should be removed.

        if (!this.isAction(commandLine[0])) {
          commandLine.shift() // Remove the first argument, which is the path to OpenCOR.

          if (isDevMode()) {
            commandLine.shift() // Remove the second argument, which is the path to the renderer.
          }
        }

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

  isAction(argument: string): boolean {
    return argument.startsWith(FULL_URI_SCHEME)
  }

  handleArguments(commandLine: string[]): void {
    if (commandLine.length === 0) {
      return
    }

    commandLine.forEach((argument) => {
      if (this.isAction(argument)) {
        this.webContents.send('action', argument.slice(FULL_URI_SCHEME.length))
      } else if (argument !== '--allow-file-access-from-files' && argument !== '--enable-avfoundation') {
        // The argument is not an action (and not --allow-file-access-from-files or --enable-avfoundation either), so it
        // must be a file to open. But, first, check whether the argument is a relative path and, if so, convert it to
        // an absolute path.

        if (!path.isAbsolute(argument)) {
          argument = path.resolve(argument)
        }

        this.webContents.send('open', argument)
      }
    })
  }

  // Enable/disable our UI.

  enableUi(): void {
    enableMainMenu()

    this.webContents.send('enable-ui')
  }

  disableUi(): void {
    disableMainMenu()

    this.webContents.send('disable-ui')
  }

  // Handle our File|Open menu.

  open(): void {
    this.disableUi()

    electron.dialog
      .showOpenDialog({
        properties: ['openFile', 'multiSelections']
      })
      .then(({ filePaths }) => {
        for (const filePath of filePaths) {
          this.webContents.send('open', filePath)
        }

        this.enableUi()
      })
      .catch((error: unknown) => {
        console.error('Failed to open file(s):', error)

        this.enableUi()
      })
  }
}
