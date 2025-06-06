interface IElectronApi {
  // Note: this must be in sync with src/preload/index.ts.

  // Some general methods.

  operatingSystem: () => string

  // Renderer process asking the main process to do something for it.

  enableDisableMainMenu: (enable: boolean) => void
  enableDisableFileCloseAndCloseAllMenuItems: (enable: boolean) => void
  fileClosed: (filePath: string) => void
  fileIssue: (filePath: string) => void
  fileOpened: (filePath: string) => void
  filePath: (file: File) => string
  fileSelected(filePath: string): void
  filesOpened(filePaths: string[]): void
  resetAll: () => void

  // Renderer process listening to the main process.

  onAbout: (callback: () => void) => void
  onAction: (callback: (action: string) => void) => void
  onCheckForUpdates: (callback: () => void) => void
  onEnableDisableUi: (callback: (enable: boolean) => void) => void
  onOpen: (callback: (filePath: string) => void) => void
  onOpenRemote: (callback: () => void) => void
  onClose: (callback: () => void) => void
  onCloseAll: (callback: () => void) => void
  onResetAll: (callback: () => void) => void
  onSelect: (callback: (filePath: string) => void) => void
  onSettings: (callback: () => void) => void
}

interface IWindow {
  electronApi: IElectronApi
}

export const electronApi: IElectronApi | undefined = (window as unknown as IWindow).electronApi
