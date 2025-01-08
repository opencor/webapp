interface ElectronAPI {
  // Renderer process asking the main process to do something for it.

  resetAll: () => void
  enableMenu: () => void
  disableMenu: () => void

  // Renderer process listening to the main process.

  onResetAll: (callback: () => void) => void
  onAbout: (callback: () => void) => void
}

interface Window {
  electronAPI: ElectronAPI
}

export const electronAPI: ElectronAPI | undefined = (window as unknown as Window).electronAPI
