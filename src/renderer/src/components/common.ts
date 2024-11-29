export function onShow() {
  // @ts-ignore (window.electronAPI may or not be defined and that is why we test it)
  const electronAPI = window.electronAPI

  if (electronAPI !== undefined) {
    electronAPI.disableMenu()
  }
}

export function onHide() {
  // @ts-ignore (window.electronAPI may or not be defined and that is why we test it)
  const electronAPI = window.electronAPI

  if (electronAPI !== undefined) {
    electronAPI.enableMenu()
  }
}
