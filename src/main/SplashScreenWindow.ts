import { join } from 'path'
import { ApplicationWindow } from './ApplicationWindow'
import { retrieveMainWindowState } from './MainWindow'

export class SplashScreenWindow extends ApplicationWindow {
  constructor() {
    // Initialise ourselves.

    const width = 640
    const height = 480
    const mainWindowState = retrieveMainWindowState()

    super({
      x: Math.round((mainWindowState.x + mainWindowState.width - width) / 2),
      y: Math.round((mainWindowState.y + mainWindowState.height - height) / 2),
      width: width,
      height: height,
      frame: false,
      alwaysOnTop: true
    })

    this.loadFile(join(__dirname, './assets/splashscreen.html'))
  }
}
