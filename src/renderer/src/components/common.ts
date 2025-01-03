import { electronAPI } from '../../../electronapi'

export function onShow() {
  electronAPI?.disableMenu()
}

export function onHide() {
  electronAPI?.enableMenu()
}
