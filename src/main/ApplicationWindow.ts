import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'

export class ApplicationWindow extends BrowserWindow {
  alreadyShowedWindow: boolean = false

  constructor(options: BrowserWindowConstructorOptions) {
    // Add some common options and call our parent constructor.

    options.show = false
    options.useContentSize = true
    options.webPreferences = {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }

    super(options)

    // Show our window when we are ready to show it.
    // Note: we need to keep track of whether we have already shown our window because ready-to-show can be emitted
    //       multiple times (e.g., when returning from sleep mode on macOS).

    this.on('ready-to-show', () => {
      if (!this.alreadyShowedWindow) {
        this.alreadyShowedWindow = true

        this.show()
      }
    })
  }
}
