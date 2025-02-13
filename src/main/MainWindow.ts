import * as electron from 'electron'
import * as electronSettings from 'electron-settings'
import * as fs from 'fs'
import * as path from 'path'

import { isDevMode, isMacOs } from '../electron'

import icon from './assets/icon.png?asset'
import { URI_SCHEME } from './index'
import { ApplicationWindow } from './ApplicationWindow'
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

function doEnableDisableMenu(enabled: boolean): void {
  const menu = electron.Menu.getApplicationMenu()

  if (menu) {
    menu.items.forEach((menuItem) => {
      menuItem.enabled = enabled
    })

    electron.Menu.setApplicationMenu(menu)
  }
}

export function enableMenu(): void {
  doEnableDisableMenu(true)
}

export function disableMenu(): void {
  doEnableDisableMenu(false)
}

export class MainWindow extends ApplicationWindow {
  splashScreenWindowClosed = false

  open(): void {
    electron.dialog
      .showOpenDialog({
        properties: ['openFile', 'multiSelections']
      })
      .then(({ filePaths }) => {
        for (const filePath of filePaths) {
          const fileName = path.basename(filePath)

          console.log(`---[ ${fileName} ]---[BEGIN]`)
          console.log(fs.readFileSync(filePath, 'base64'))
          console.log(`---[ ${fileName} ]---[END]`)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to open file(s):', error)
      })
  }

  configureMenu(): void {
    // Some common menu items.

    /*---OPENCOR---
    const settingsMenuItem = {
      label: 'Settings...',
      click: () => {
        console.log('Settings...')
      }
    }
    */
    /*---OPENCOR---
    const checkForUpdatesMenuItem = {
      label: 'Check For Updates...',
      click: () => {
        console.log('Check For Updates...')
      }
    }
    */
    const aboutOpencorMenuItem = {
      label: 'About OpenCOR',
      click: () => {
        this.webContents.send('about')
      }
    }

    // App menu.

    let appMenu: electron.MenuItemConstructorOptions = {}

    if (isMacOs()) {
      appMenu = {
        label: electron.app.name,
        submenu: [
          aboutOpencorMenuItem,
          /*---OPENCOR---
          checkForUpdatesMenuItem,
          */
          { type: 'separator' },
          /*---OPENCOR---
          settingsMenuItem,
          */
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }
    }

    // File menu.

    const fileSubMenu: electron.MenuItemConstructorOptions[] = []
    const fileMenu: electron.MenuItemConstructorOptions = {
      label: 'File',
      submenu: fileSubMenu
    }

    fileSubMenu.push({
      label: 'Open...',
      accelerator: 'CmdOrCtrl+O',
      click: () => {
        this.open()
      }
    })

    if (!isMacOs()) {
      fileSubMenu.push({ type: 'separator' })
      fileSubMenu.push({ role: 'quit' })
    }

    // View menu.

    const viewMenu: electron.MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }

    // Tools menu.

    const toolsSubMenu: electron.MenuItemConstructorOptions[] = []
    const toolsMenu: electron.MenuItemConstructorOptions = {
      label: 'Tools',
      submenu: toolsSubMenu
    }

    /*---OPENCOR---
    if (!isMacOs()) {
      toolsSubMenu.push(settingsMenuItem)
      toolsSubMenu.push({ type: 'separator' })
    }
    */

    toolsSubMenu.push({
      label: 'Reset All',
      click: () => {
        this.webContents.send('reset-all')
      }
    })

    // Help menu.

    const helpSubMenu: electron.MenuItemConstructorOptions[] = []
    const helpMenu: electron.MenuItemConstructorOptions = {
      label: 'Help',
      submenu: helpSubMenu
    }

    helpSubMenu.push({
      label: 'Home Page',
      click: () => {
        electron.shell.openExternal('https://opencor.ws/').catch((error: unknown) => {
          console.error('Failed to open the home page:', error)
        })
      }
    })
    helpSubMenu.push({ type: 'separator' })
    helpSubMenu.push({
      label: 'Report Issue',
      click: () => {
        electron.shell.openExternal('https://github.com/opencor/webapp/issues/new').catch((error: unknown) => {
          console.error('Failed to report an issue:', error)
        })
      }
    })

    if (!isMacOs()) {
      /*---OPENCOR---
      helpSubMenu.push({ type: 'separator' })
      helpSubMenu.push(checkForUpdatesMenuItem)
      */
      helpSubMenu.push({ type: 'separator' })
      helpSubMenu.push(aboutOpencorMenuItem)
    }

    // Set our menu.

    const menu: electron.MenuItemConstructorOptions[] = []

    if (isMacOs()) {
      menu.push(appMenu)
    }

    menu.push(fileMenu)
    menu.push(viewMenu)
    menu.push(toolsMenu)
    menu.push(helpMenu)

    electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(menu))

    // Make sure that our menu bar is always visible.

    this.setAutoHideMenuBar(false)
    this.setMenuBarVisibility(true)
  }

  handleArguments(commandLine: string[]): void {
    if (commandLine.length === 0) {
      return
    }

    // Handle every command line argument.

    commandLine.forEach((argument) => {
      if (argument.startsWith(`${URI_SCHEME}://`)) {
        function isAction(action: string, expectedAction: string): boolean {
          return action.localeCompare(expectedAction, undefined, { sensitivity: 'base' }) === 0
        }

        // We have been launched with a URL, so we need to parse it and act accordingly.

        const parsedUrl = new URL(argument)

        if (isAction(parsedUrl.hostname, 'openAboutDialog')) {
          // Open our about dialog.

          this.webContents.send('about')
        } else if (isAction(parsedUrl.hostname, 'openPreferencesDialog')) {
          // Open our preferences dialog.
          //---OPENCOR--- To be disabled once we have a preferences dialog.
          // this.webContents.send('preferences')
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
    })
  }

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

      if (!this.splashScreenWindowClosed && !!splashScreenWindow) {
        const SHORT_DELAY = 369

        this.splashScreenWindowClosed = true

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

    // Configure our menu.

    this.configureMenu()

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
}
