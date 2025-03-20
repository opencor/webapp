interface IElectronAPI {
  // Note: this must be in sync with src/preload/index.ts.

  // Some general methods.

  operatingSystem: () => string

  // Renderer process asking the main process to do something for it.

  disableMainMenu: () => void
  enableMainMenu: () => void
  filePath: (file: File) => string
  resetAll: () => void

  // Renderer process listening to the main process.

  onAbout: (callback: () => void) => void
  onAction: (callback: (action: string) => void) => void
  onCheckForUpdates: (callback: () => void) => void
  onDisableUi: (callback: () => void) => void
  onEnableUi: (callback: () => void) => void
  onOpen: (callback: (filePath: string) => void) => void
  onOpenRemote: (callback: () => void) => void
  onClose: (callback: () => void) => void
  onCloseAll: (callback: () => void) => void
  onResetAll: (callback: () => void) => void
  onSettings: (callback: () => void) => void
}

interface IWindow {
  electronAPI: IElectronAPI
}

export const electronAPI: IElectronAPI | undefined = (window as unknown as IWindow).electronAPI
