import electron from 'electron'

import { isMacOs } from '../electron'

import { mainWindow } from './index'

let _enabledMenu: electron.Menu | null = null
let _disabledMenu: electron.Menu | null = null

export function enableDisableMainMenu(enable: boolean): void {
  // Build our menu, if needed.

  if (enable && _enabledMenu !== null) {
    electron.Menu.setApplicationMenu(_enabledMenu)
  } else if (!enable && _disabledMenu !== null) {
    electron.Menu.setApplicationMenu(_disabledMenu)
  } else {
    // Some common menu items.

    const settingsMenuItem: electron.MenuItemConstructorOptions = {
      label: 'Settings...',
      accelerator: 'CmdOrCtrl+,',
      click: () => {
        mainWindow?.webContents.send('settings')
      }
    }

    const checkForUpdatesMenuItem: electron.MenuItemConstructorOptions = {
      label: 'Check For Updates...',
      click: () => {
        mainWindow?.webContents.send('check-for-updates')
      }
    }

    const aboutOpencorMenuItem: electron.MenuItemConstructorOptions = {
      label: 'About OpenCOR',
      click: () => {
        mainWindow?.webContents.send('about')
      }
    }

    // App menu.

    const appSubMenu: electron.MenuItemConstructorOptions[] = []
    const appMenu: electron.MenuItemConstructorOptions = {
      label: electron.app.name,
      submenu: appSubMenu
    }

    if (isMacOs()) {
      if (enable) {
        appSubMenu.push(aboutOpencorMenuItem)
        appSubMenu.push({ type: 'separator' })
        appSubMenu.push(checkForUpdatesMenuItem)
        appSubMenu.push({ type: 'separator' })
        appSubMenu.push(settingsMenuItem)
        appSubMenu.push({ type: 'separator' })
      }

      appSubMenu.push({ role: 'hide' })
      appSubMenu.push({ role: 'hideOthers' })
      appSubMenu.push({ role: 'unhide' })

      if (enable) {
        appSubMenu.push({ type: 'separator' })
        appSubMenu.push({ role: 'quit' })
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
        mainWindow?.open()
      }
    })
    fileSubMenu.push({
      label: 'Open Remote...',
      accelerator: 'CmdOrCtrl+Shift+O',
      click: () => {
        mainWindow?.webContents.send('open-remote')
      }
    })
    fileSubMenu.push({ type: 'separator' })
    fileSubMenu.push({
      id: 'fileClose',
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      click: () => {
        mainWindow?.webContents.send('close')
      },
      enabled: false
    })
    fileSubMenu.push({
      id: 'fileCloseAll',
      label: 'Close All',
      click: () => {
        mainWindow?.webContents.send('close-all')
      },
      enabled: false
    })

    if (!isMacOs()) {
      fileSubMenu.push({ type: 'separator' })
      fileSubMenu.push({ role: 'quit' })
    }

    // Edit menu.

    const editMenu: electron.MenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete', accelerator: 'Delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
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

    if (!isMacOs()) {
      toolsSubMenu.push(settingsMenuItem)
      toolsSubMenu.push({ type: 'separator' })
    }

    toolsSubMenu.push({
      label: 'Reset All...',
      click: () => {
        mainWindow?.webContents.send('reset-all')
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
      helpSubMenu.push({ type: 'separator' })
      helpSubMenu.push(checkForUpdatesMenuItem)
      helpSubMenu.push({ type: 'separator' })
      helpSubMenu.push(aboutOpencorMenuItem)
    }

    // Set our menu.

    const menu: electron.MenuItemConstructorOptions[] = []

    if (enable) {
      if (isMacOs()) {
        menu.push(appMenu)
      }

      menu.push(fileMenu)
      menu.push(editMenu)
      menu.push(viewMenu)
      menu.push(toolsMenu)
      menu.push(helpMenu)

      _enabledMenu = electron.Menu.buildFromTemplate(menu)
    } else {
      if (isMacOs()) {
        menu.push(appMenu)
      }

      menu.push(editMenu)

      _disabledMenu = electron.Menu.buildFromTemplate(menu)
    }

    electron.Menu.setApplicationMenu(enable ? _enabledMenu : _disabledMenu)
  }
}

export function enableDisableFileCloseAndCloseAllMenuItems(enable: boolean): void {
  if (_enabledMenu !== null) {
    const fileMenu = _enabledMenu.getMenuItemById('fileClose')
    const fileCloseAllMenu = _enabledMenu.getMenuItemById('fileCloseAll')

    if (fileMenu !== null && fileCloseAllMenu !== null) {
      fileMenu.enabled = enable
      fileCloseAllMenu.enabled = enable
    }
  }
}
