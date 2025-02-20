interface ElectronAPI {
  // Note: src/preload/index.ts needs to be in sync with this file.

  // Some general methods.

  operatingSystem: () => string

  // Renderer process asking the main process to do something for it.

  filePath: (file: File) => string
  resetAll: () => void
  showDisabledMenu: () => void
  showEnabledMenu: () => void

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
