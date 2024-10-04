import { electronApp, is, optimizer, platform } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, Menu, MenuItemConstructorOptions, screen, shell } from 'electron'
import * as settings from 'electron-settings'
import * as fs from 'fs'
import { join } from 'path'
import icon from './assets/icon.png?asset'

function developmentMode(): boolean {
  return is.dev && process.env['ELECTRON_RENDERER_URL'] !== undefined
}

function configureMenu(mainWindow): void {
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
  // Retrieve our main window's state.

  const workAreaSize = screen.getPrimaryDisplay().workAreaSize
  const horizontalSpace = Math.round(workAreaSize.width / 13)
  const verticalSpace = Math.round(workAreaSize.height / 13)
  const x = settings.getSync('mainWindowState.x')
  const y = settings.getSync('mainWindowState.y')
  const width = settings.getSync('mainWindowState.width')
  const height = settings.getSync('mainWindowState.height')
  const isMaximized = settings.getSync('mainWindowState.isMaximized')
  const isFullScreen = settings.getSync('mainWindowState.isFullScreen')
  const mainWindowState = {
    x: x !== undefined && x !== null ? x : horizontalSpace,
    y: y !== undefined && y !== null ? y : verticalSpace,
    width: width !== undefined && width !== null ? width : workAreaSize.width - 2 * horizontalSpace,
    height: height !== undefined && height !== null ? height : workAreaSize.height - 2 * verticalSpace,
    isMaximized: isMaximized !== undefined && isMaximized !== null ? isMaximized : false,
    isFullScreen: isFullScreen !== undefined && isFullScreen !== null ? isFullScreen : false
  }

  // Create our main window.

  const mainWindow = new BrowserWindow({
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

  // Show our main window when we are ready to show it.

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  configureMenu(mainWindow)

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
