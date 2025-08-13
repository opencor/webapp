import jsCookie from 'js-cookie'

import { type ISettings, type ISettingsGeneral } from './common.js'
import { electronApi } from './electronApi.js'

class Settings {
  private static _instance: Settings | null = null
  private _settings!: ISettings
  private _isInitialised = false
  private _initialisationListeners: (() => void)[] = []

  private constructor() {
    // Start with some default settings and then load them.
    // Note: to have default settings is critical when running the desktop version of OpenCOR since they are loaded
    //       asynchronously, so we need to ensure that our settings are always defined. This is not the case for the
    //       web version of OpenCOR, where we can load our settings directly from the cookies.

    this.reset()
    this.load()
  }

  static instance(): Settings {
    this._instance ??= new Settings()

    return this._instance
  }

  private emitInitialised(): void {
    this._isInitialised = true

    this._initialisationListeners.forEach((callback) => {
      callback()
    })

    this._initialisationListeners = []
  }

  onInitialised(callback: () => void): void {
    if (this._isInitialised) {
      callback()
    } else {
      this._initialisationListeners.push(callback)
    }
  }

  load(): void {
    if (electronApi !== undefined) {
      void electronApi.loadSettings().then((settings: ISettings) => {
        this._settings = settings

        this.emitInitialised()
      })
    } else {
      const cookieData = jsCookie.get('settings')

      if (cookieData !== undefined) {
        try {
          this._settings = JSON.parse(cookieData)
        } catch (error: unknown) {
          console.error('Failed to parse settings from cookie, so resetting to defaults:', error)

          this.reset()
        }
      }

      this.emitInitialised()
    }
  }

  save(): void {
    if (electronApi !== undefined) {
      electronApi.saveSettings(this._settings)
    } else {
      jsCookie.set('settings', JSON.stringify(this._settings), { expires: 365 })
    }
  }

  reset(): void {
    this._settings = {
      general: {
        checkForUpdatesAtStartup: true
      }
    }
  }

  toString(): string {
    return JSON.stringify(this._settings, null, 2)
  }

  get general(): ISettingsGeneral {
    return this._settings.general
  }
}

export const settings = Settings.instance()
