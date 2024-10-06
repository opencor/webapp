import { BrowserWindow, BrowserWindowConstructorOptions, nativeTheme } from 'electron'
import { join } from 'path'

export class ApplicationWindow extends BrowserWindow {
  alreadyShowedWindow: boolean = false

  constructor(options: BrowserWindowConstructorOptions) {
    // Add some common options and call our parent constructor.
    // Note: we use backgroundColor to minimise the flickering that may occur when first showing a window. This means
    //       that the colours used here should be the same as the ones used in our CSS file.

    options.backgroundColor = nativeTheme.shouldUseDarkColors ? '#24292e' : '#ffffff'
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
