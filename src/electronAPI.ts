interface ElectronAPI {
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
  onCheckForUpdates: (callback: () => void) => void
  onOpen: (callback: (filePath: string) => void) => void
  onOpenRemote: (callback: () => void) => void
  onResetAll: (callback: () => void) => void
  onSettings: (callback: () => void) => void
}

interface Window {
  electronAPI: ElectronAPI
}

export const electronAPI: ElectronAPI | undefined = (window as unknown as Window).electronAPI
