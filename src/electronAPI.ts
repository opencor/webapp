interface ElectronAPI {
  // Note: src/preload/index.ts needs to be in sync with this file.

  // Some general methods.

  operatingSystem: () => string

  // Renderer process asking the main process to do something for it.

  enableMenu: () => void
  disableMenu: () => void
  filePath: (file: File) => string
  resetAll: () => void

  // Renderer process listening to the main process.

  onResetAll: (callback: () => void) => void
  onAbout: (callback: () => void) => void
}

interface Window {
  electronAPI: ElectronAPI
}

export const electronAPI: ElectronAPI | undefined = (window as unknown as Window).electronAPI
