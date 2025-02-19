import { electronAPI } from '../../../electronAPI'

export function onShow(): void {
  electronAPI?.disableMenu()
}

export function onHide(): void {
  electronAPI?.enableMenu()
}
