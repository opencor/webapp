import { electronAPI } from '../../electronAPI'

export const toastLife = 3000

export function onShow(): void {
  electronAPI?.showDisabledMenu()
}

export function onHide(): void {
  electronAPI?.showEnabledMenu()
}

export function filePath(file: File): string {
  return electronAPI !== undefined ? electronAPI.filePath(file) : file.name
}

export function fileContents(fileOrUrl: File | string): Promise<Uint8Array> {
  if (typeof fileOrUrl === 'string') {
    return new Promise((resolve, reject) => {
      fetch(`https://corsproxy.io/${encodeURIComponent(fileOrUrl)}`)
        .then((response) => {
          if (response.ok) {
            return response.arrayBuffer()
          } else {
            throw new Error(`The server responded with a status of ${String(response.status)}.`)
          }
        })
        .then((arrayBuffer) => {
          resolve(new Uint8Array(arrayBuffer))
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
          resolve(new Uint8Array(arrayBuffer))
        })
        .catch((error: unknown) => {
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })
  }
}
