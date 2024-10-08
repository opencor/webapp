import { platform } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, Menu, MenuItemConstructorOptions, screen, shell } from 'electron'
import * as settings from 'electron-settings'
import { join } from 'path'
import icon from './assets/icon.png?asset'
import { ApplicationWindow } from './ApplicationWindow'
import { developmentMode } from './index'

export function retrieveMainWindowState(): {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
  isFullScreen: boolean
} {
  const workAreaSize = screen.getPrimaryDisplay().workAreaSize
  const horizontalSpace = Math.round(workAreaSize.width / 13)
  const verticalSpace = Math.round(workAreaSize.height / 13)
  const x = settings.getSync('mainWindowState.x')
  const y = settings.getSync('mainWindowState.y')
  const width = settings.getSync('mainWindowState.width')
  const height = settings.getSync('mainWindowState.height')
  const isMaximized = settings.getSync('mainWindowState.isMaximized')
  const isFullScreen = settings.getSync('mainWindowState.isFullScreen')

  return {
    x: (x !== undefined && x !== null ? x : horizontalSpace) as number,
    y: (y !== undefined && y !== null ? y : verticalSpace) as number,
    width: (width !== undefined && width !== null ? width : workAreaSize.width - 2 * horizontalSpace) as number,
    height: (height !== undefined && height !== null ? height : workAreaSize.height - 2 * verticalSpace) as number,
    isMaximized: (isMaximized !== undefined && isMaximized !== null ? isMaximized : false) as boolean,
    isFullScreen: (isFullScreen !== undefined && isFullScreen !== null ? isFullScreen : false) as boolean
  }
}

export class MainWindow extends ApplicationWindow {
  splashScreenWindowClosed: boolean = false

  configureMenu(): void {
    // Some common menu items.

    const settingsMenuItem = {
      label: 'Settings...',
      click: () => {
        console.log('Settings...')
      }
    }
    const checkForUpdatesMenuItem = {
      label: 'Check For Updates...',
      click: () => {
        console.log('Check For Updates...')
      }
    }
    const aboutOpencorMenuItem = {
      label: 'About OpenCOR',
      click: () => {
        console.log('About OpenCOR...')
      }
    }

    // App menu.

    let appMenu: MenuItemConstructorOptions = {}

    if (platform.isMacOS) {
      appMenu = {
        label: app.name,
        submenu: [
          aboutOpencorMenuItem,
          checkForUpdatesMenuItem,
          { type: 'separator' },
          settingsMenuItem,
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

    const fileMenu: MenuItemConstructorOptions = {
      label: 'File',
      submenu: [{ role: 'quit' }]
    }

    // View menu.

    const viewMenu: MenuItemConstructorOptions = {
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

    const toolsSubMenu: MenuItemConstructorOptions[] = []
    const toolsMenu: MenuItemConstructorOptions = {
      label: 'Tools',
      submenu: toolsSubMenu
    }

    if (!platform.isMacOS) {
      toolsSubMenu.push(settingsMenuItem)
      toolsSubMenu.push({ type: 'separator' })
    }

    toolsSubMenu.push({
      label: 'Reset All',
      click: () => {
        if (
          dialog.showMessageBoxSync(this, {
            type: 'question',
            title: 'Reset All',
            icon: icon,
            message: 'You are about to reset all of your settings. Do you want to proceed?',
            buttons: ['OK', 'Cancel'],
            defaultId: 0
          }) === 0
        ) {
          settings.setSync('resetAll', true)

          app.relaunch()
          app.quit()
        }
      }
    })

    // Help menu.

    const helpSubMenu: MenuItemConstructorOptions[] = []
    const helpMenu: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: helpSubMenu
    }

    helpSubMenu.push({
      label: 'Home Page',
      click: () => {
        shell.openExternal('https://opencor.ws/')
      }
    })
    helpSubMenu.push({ type: 'separator' })
    helpSubMenu.push({
      label: 'Report Issue',
      click: () => {
        shell.openExternal('https://github.com/opencor/webapp/issues/new')
      }
    })

    if (!platform.isMacOS) {
      helpSubMenu.push({ type: 'separator' })
      helpSubMenu.push(checkForUpdatesMenuItem)
      helpSubMenu.push({ type: 'separator' })
      helpSubMenu.push(aboutOpencorMenuItem)
    }

    // Set our menu.

    const menu: MenuItemConstructorOptions[] = []

    if (platform.isMacOS) {
      menu.push(appMenu)
    } else {
      menu.push(fileMenu)
    }

    menu.push(viewMenu)
    menu.push(toolsMenu)
    menu.push(helpMenu)

    Menu.setApplicationMenu(Menu.buildFromTemplate(menu))

    // Make sure that our menu bar is always visible.

    this.setAutoHideMenuBar(false)
    this.setMenuBarVisibility(true)
  }

  constructor(splashScreenWindow: BrowserWindow) {
    // Initialise ourselves.

    const mainWindowState = retrieveMainWindowState()

    super({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      ...(!platform.isMacOS ? { icon: icon } : {})
    })

    // Set our dock icon (macOS only).

    if (platform.isMacOS) {
      app.dock.setIcon(icon)
    }

    // Restore our state, if needed.

    if (mainWindowState.isMaximized) {
      this.maximize()
    } else if (mainWindowState.isFullScreen) {
      this.setFullScreen(true)
    }

    // Ask for the splash screen window to be closed with a short delay once we are visible.

    this.once('show', () => {
      if (!this.splashScreenWindowClosed && splashScreenWindow !== null) {
        this.splashScreenWindowClosed = true

        setTimeout(() => {
          splashScreenWindow.close()
        }, 369)
      }
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

      settings.setSync('mainWindowState', mainWindowState)
    })

    // Configure our menu.

    this.configureMenu()

    // Open external links in the default browser.

    this.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)

      return {
        action: 'deny'
      }
    })

    // Load the remote URL for development or the local HTML file for production.

    if (developmentMode()) {
      // @ts-ignore (developmentMode() is true which means that process.env['ELECTRON_RENDERER_URL'] is defined)
      this.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }
}
