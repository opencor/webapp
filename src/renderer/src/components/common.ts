import { electronAPI } from '../../../electronAPI'

export const toastLife = 3000

export function onShow(): void {
  electronAPI?.disableMenu()
}

export function onHide(): void {
  electronAPI?.enableMenu()
}

export function filePath(file: File): string {
  return electronAPI !== undefined ? electronAPI.filePath(file) : file.name
}

export function fileContents(fileOrUrl: File | string): Promise<string> {
  if (typeof fileOrUrl === 'string') {
    return new Promise((resolve, reject) => {
      fetch(fileOrUrl)
        .then((response) => {
          if (response.ok) {
            return response.arrayBuffer()
          } else {
            throw new Error(`The server responded with a status of ${String(response.status)}.`)
          }
        })
        .then((arrayBuffer) => {
          const uint8Array = new Uint8Array(arrayBuffer)

          resolve(btoa(uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')))
        })
        .catch((error: unknown) => {
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })
  } else {
    return new Promise((resolve, reject) => {
      fileOrUrl
        .arrayBuffer()
        .then((arrayBuffer) => {
          const uint8Array = new Uint8Array(arrayBuffer)

          resolve(btoa(uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')))
        })
        .catch((error: unknown) => {
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })
  }
}
