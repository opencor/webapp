import { UAParser } from 'ua-parser-js'

import { electronAPI } from '../../electronAPI'
import * as locAPI from '../../libopencor/locAPI'

export const toastLife = 3000

const uaParser = new UAParser()

export function isWindows(): boolean {
  return uaParser.getOS().name === 'Windows'
}

export function isLinux(): boolean {
  return uaParser.getOS().name === 'Linux'
}

export function isMacOS(): boolean {
  return uaParser.getOS().name === 'macOS'
}

export function isMobile(): boolean {
  return uaParser.getDevice().type === 'mobile'
}

export function isCtrlOrCmd(event: KeyboardEvent): boolean {
  return isMacOS() ? event.metaKey : event.ctrlKey
}

export function disableMainMenu(): void {
  electronAPI?.disableMainMenu()
}

export function enableMainMenu(): void {
  electronAPI?.enableMainMenu()
}

export function isRemoteFilePath(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://')
}

export function filePath(fileOrFilePath: string | File): string {
  return fileOrFilePath instanceof File
    ? electronAPI !== undefined
      ? electronAPI.filePath(fileOrFilePath)
      : fileOrFilePath.name
    : fileOrFilePath
}

export function file(fileOrFilePath: string | File): Promise<locAPI.File> {
  if (typeof fileOrFilePath === 'string') {
    if (isRemoteFilePath(fileOrFilePath)) {
      return new Promise((resolve, reject) => {
        fetch(`https://corsproxy.io/${encodeURIComponent(fileOrFilePath)}`)
          .then((response) => {
            if (response.ok) {
              return response.arrayBuffer()
            } else {
              throw new Error(`The server responded with a status of ${String(response.status)}.`)
            }
          })
          .then((arrayBuffer) => {
            const fileContents = new Uint8Array(arrayBuffer)

            resolve(new locAPI.File(filePath(fileOrFilePath), fileContents))
          })
          .catch((error: unknown) => {
            reject(error instanceof Error ? error : new Error(String(error)))
          })
      })
    }
    return new Promise((resolve) => {
      resolve(new locAPI.File(filePath(fileOrFilePath)))
    })
  } else {
    return new Promise((resolve, reject) => {
      fileOrFilePath
        .arrayBuffer()
        .then((arrayBuffer) => {
          const fileContents = new Uint8Array(arrayBuffer)

          resolve(new locAPI.File(filePath(fileOrFilePath), fileContents))
        })
        .catch((error: unknown) => {
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })
  }
}
