import { electronApp, is, optimizer, platform } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, Menu, MenuItemConstructorOptions, screen, shell } from 'electron'
import * as settings from 'electron-settings'
import * as fs from 'fs'
import { join } from 'path'
import icon from './assets/icon.png?asset'

let readyToShow: boolean = false
let didFinishLoad: boolean = false
let alreadyShowedMainWindowAndClosedSplashScreenWindow: boolean = false
let mainWindow: BrowserWindow = null as unknown as BrowserWindow
let splashScreenWindow: BrowserWindow = null as unknown as BrowserWindow

function developmentMode(): boolean {
  return is.dev && process.env['ELECTRON_RENDERER_URL'] !== undefined
}

function showMainWindowAndCloseSplashScreenWindow(): void {
  if (readyToShow && didFinishLoad) {
    alreadyShowedMainWindowAndClosedSplashScreenWindow = true

    mainWindow.show()

    if (splashScreenWindow !== null) {
      setTimeout(() => {
        splashScreenWindow.close()
      }, 369)
    }
  }
}

function retrieveMainWindowState(): {
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

function createSplashScreenWindow(): BrowserWindow {
  // Create our splash window.

  const width = 640
  const height = 480
  const mainWindowState = retrieveMainWindowState()
  const splashScreenWindow = new BrowserWindow({
    x: Math.round((mainWindowState.x + mainWindowState.width - width) / 2),
    y: Math.round((mainWindowState.y + mainWindowState.height - height) / 2),
    width: width,
    height: height,
    frame: false,
    alwaysOnTop: true
  })

  splashScreenWindow.loadFile(join(__dirname, '../renderer/splashscreen.html'))

  // Show our splash window when we are ready to show it.
  // Note: unlike for our main window, we don't need to handle both ready-to-show and did-finish-load. Our splash screen
  //       window is very simple and is ready to show as soon as it has been created.

  splashScreenWindow.on('ready-to-show', () => {
    splashScreenWindow.show()
  })

  return splashScreenWindow
}

function configureMenu(): void {
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
        dialog.showMessageBoxSync(mainWindow, {
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

  // Set our main window's menu.

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

  // Make sure that our main window's menu bar is always visible.

  mainWindow.setAutoHideMenuBar(false)
  mainWindow.setMenuBarVisibility(true)
}

function createMainWindow(): void {
  // Create our main window.

  const mainWindowState = retrieveMainWindowState()

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: false,
    ...(!platform.isMacOS ? { icon: icon } : {}),
    useContentSize: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Set our dock icon (macOS only).

  if (platform.isMacOS) {
    app.dock.setIcon(icon)
  }

  // Restore our main window's state, if needed.

  if (mainWindowState.isMaximized) {
    mainWindow.maximize()
  } else if (mainWindowState.isFullScreen) {
    mainWindow.setFullScreen(true)
  }

  // Show our main window and close our splash screen window when we are ready to show our main window AND when our
  // main window's contents has been fully loaded.
  // Note #1: indeed, sometimes ready-to-show is emitted before did-finish-load, and sometimes it is the other way
  //          around.
  // Note #2: we need to keep track of whether we have already shown our main window and closed our splash screen window
  //          because ready-to-show and did-finish-load can be emitted multiple times (e.g., when returning from sleep
  //          mode).

  mainWindow.on('ready-to-show', () => {
    if (!alreadyShowedMainWindowAndClosedSplashScreenWindow) {
      readyToShow = true

      showMainWindowAndCloseSplashScreenWindow()
    }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (!alreadyShowedMainWindowAndClosedSplashScreenWindow) {
      didFinishLoad = true

      showMainWindowAndCloseSplashScreenWindow()
    }
  })

  // Keep track of our main window's new state upon closing.

  mainWindow.on('close', () => {
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized() && !mainWindow.isFullScreen()) {
      mainWindowState.x = mainWindow.getPosition()[0]
      mainWindowState.y = mainWindow.getPosition()[1]
      mainWindowState.width = mainWindow.getContentSize()[0]
      mainWindowState.height = mainWindow.getContentSize()[1]
    }

    mainWindowState.isMaximized = mainWindow.isMaximized()
    mainWindowState.isFullScreen = mainWindow.isFullScreen()

    settings.setSync('mainWindowState', mainWindowState)
  })

  // Configure our menu.

  configureMenu()

  // Open external links in the default browser.

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)

    return {
      action: 'deny'
    }
  })

  // Load the remote URL for development or the local HTML file for production.

  if (developmentMode()) {
    // @ts-ignore (developmentMode() is true which means that process.env['ELECTRON_RENDERER_URL'] is defined)
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
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
  // Create our splash window, if we are not in development mode.

  if (!developmentMode()) {
    splashScreenWindow = createSplashScreenWindow()
  }

  // Set our app user model id for Windows.

  electronApp.setAppUserModelId('ws.opencor.app')

  // Enable the F12 shortcut (to show/hide the developer tools) if we are in development.

  if (developmentMode()) {
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })
  }

  // Create our main window.

  createMainWindow()
})
