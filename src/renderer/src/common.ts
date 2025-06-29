import { UAParser } from 'ua-parser-js'
import * as vue from 'vue'

import { electronApi } from '../../electronApi'
import * as locApi from '../../libopencor/locApi'

// Some methods to determine the operating system, whether the application is running on a mobile device, etc.

const uaParser = new UAParser()

export function isWindows(): boolean {
  return uaParser.getOS().name === 'Windows'
}

export function isLinux(): boolean {
  return uaParser.getOS().name === 'Linux'
}

export function isMacOs(): boolean {
  return uaParser.getOS().name === 'macOS'
}

export function isMobile(): boolean {
  return uaParser.getDevice().type === 'mobile'
}

// Some constants to know whether the operating system uses light mode or dark mode.

const prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)')

export const isLightMode = vue.ref(prefersColorScheme.matches)
export const isDarkMode = vue.ref(!prefersColorScheme.matches)

prefersColorScheme.addEventListener('change', (event) => {
  isLightMode.value = event.matches
  isDarkMode.value = !event.matches
})

// A method to determine whether the Ctrl or Cmd key is pressed, depending on the operating system.

export function isCtrlOrCmd(event: KeyboardEvent): boolean {
  return isMacOs() ? event.metaKey : event.ctrlKey
}

// A method to enable/disable the main menu.

export function enableDisableMainMenu(enable: boolean): void {
  electronApi?.enableDisableMainMenu(enable)
}

// Some file-related methods.

export function isRemoteFilePath(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://')
}

export function filePath(fileOrFilePath: string | File): string {
  return fileOrFilePath instanceof File
    ? electronApi !== undefined
      ? electronApi.filePath(fileOrFilePath)
      : fileOrFilePath.name
    : fileOrFilePath
}

export function file(fileOrFilePath: string | File): Promise<locApi.File> {
  if (typeof fileOrFilePath === 'string') {
    if (isRemoteFilePath(fileOrFilePath)) {
      return new Promise((resolve, reject) => {
        fetch(`https://corsproxy.io/?url=${fileOrFilePath}`)
          .then((response) => {
            if (response.ok) {
              return response.arrayBuffer()
            }

            throw new Error(`The server responded with a status of ${String(response.status)}.`)
          })
          .then((arrayBuffer) => {
            const fileContents = new Uint8Array(arrayBuffer)

            resolve(new locApi.File(filePath(fileOrFilePath), fileContents))
          })
          .catch((error: unknown) => {
            reject(error instanceof Error ? error : new Error(String(error)))
          })
      })
    }

    return new Promise((resolve, reject) => {
      if (electronApi !== undefined) {
        resolve(new locApi.File(filePath(fileOrFilePath)))
      } else {
        reject(new Error('Local files cannot be opened.'))
      }
    })
  }

  return new Promise((resolve, reject) => {
    fileOrFilePath
      .arrayBuffer()
      .then((arrayBuffer) => {
        const fileContents = new Uint8Array(arrayBuffer)

        resolve(new locApi.File(filePath(fileOrFilePath), fileContents))
      })
      .catch((error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)))
      })
  })
}

// A method to track the height of a given element.

export function trackElementHeight(id: string): void {
  vue.onMounted(() => {
    const element = document.getElementById(id)

    if (element !== null) {
      const observer = new ResizeObserver(() => {
        let elementHeight = window.getComputedStyle(element).height

        if (elementHeight === '' || elementHeight === 'auto') {
          elementHeight = '0px'
        }

        const cssVariableName =
          '--' +
          id
            .split('_')[0]
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase() +
          '-height'
        const oldElementHeight = window.getComputedStyle(document.documentElement).getPropertyValue(cssVariableName)

        if (oldElementHeight === '' || (elementHeight !== '0px' && oldElementHeight !== elementHeight)) {
          document.documentElement.style.setProperty(cssVariableName, elementHeight)
        }
      })

      observer.observe(element)

      vue.onUnmounted(() => {
        observer.disconnect()
      })
    }
  })
}

// A method to format a given number of milliseconds into a string.

export function formatTime(time: number): string {
  const ms = Math.floor(time % 1000)
  const s = Math.floor((time / 1000) % 60)
  const m = Math.floor((time / (1000 * 60)) % 60)
  const h = Math.floor((time / (1000 * 60 * 60)) % 24)
  const d = Math.floor((time / (1000 * 60 * 60 * 24)) % 24)
  let res = ''

  if (d !== 0 || ((h !== 0 || m !== 0 || s !== 0 || ms !== 0) && res !== '')) {
    res += (res === '' ? '' : ' ') + d.toString() + 'd'
  }

  if (h !== 0 || ((m !== 0 || s !== 0 || ms !== 0) && res !== '')) {
    res += (res === '' ? '' : ' ') + h.toString() + 'h'
  }

  if (m !== 0 || ((s !== 0 || ms !== 0) && res !== '')) {
    res += (res === '' ? '' : ' ') + m.toString() + 'm'
  }

  if (s !== 0 || (ms !== 0 && res !== '')) {
    res += (res === '' ? '' : ' ') + s.toString() + 's'
  }

  if (ms !== 0 || res === '') {
    res += (res === '' ? '' : ' ') + ms.toString() + 'ms'
  }

  return res
}

// A method to format an issue, i.e. make sure that it starts with a capital letter and ends with a period.

export function formatIssue(issue: string): string {
  issue = issue.charAt(0).toUpperCase() + issue.slice(1)

  return issue.endsWith('.') ? issue : issue + '.'
}

// A method to retrieve the simulation data information for a given name from an instance task.

export enum ESimulationDataInfoType {
  UNKNOWN,
  VOI,
  STATE,
  RATE,
  CONSTANT,
  COMPUTED_CONSTANT,
  ALGEBRAIC
}

export interface ISimulationDataInfo {
  type: ESimulationDataInfoType
  index: number
}

export function simulationDataInfo(instanceTask: locApi.SedInstanceTask, name: string): ISimulationDataInfo {
  if (name === '') {
    return {
      type: ESimulationDataInfoType.UNKNOWN,
      index: -1
    }
  }

  if (name === instanceTask.voiName()) {
    return {
      type: ESimulationDataInfoType.VOI,
      index: -1
    }
  }

  for (let i = 0; i < instanceTask.stateCount(); i++) {
    if (name === instanceTask.stateName(i)) {
      return {
        type: ESimulationDataInfoType.STATE,
        index: i
      }
    }
  }

  for (let i = 0; i < instanceTask.rateCount(); i++) {
    if (name === instanceTask.rateName(i)) {
      return {
        type: ESimulationDataInfoType.RATE,
        index: i
      }
    }
  }

  for (let i = 0; i < instanceTask.constantCount(); i++) {
    if (name === instanceTask.constantName(i)) {
      return {
        type: ESimulationDataInfoType.CONSTANT,
        index: i
      }
    }
  }

  for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
    if (name === instanceTask.computedConstantName(i)) {
      return {
        type: ESimulationDataInfoType.COMPUTED_CONSTANT,
        index: i
      }
    }
  }

  for (let i = 0; i < instanceTask.algebraicCount(); i++) {
    if (name === instanceTask.algebraicName(i)) {
      return {
        type: ESimulationDataInfoType.ALGEBRAIC,
        index: i
      }
    }
  }

  return {
    type: ESimulationDataInfoType.UNKNOWN,
    index: -1
  }
}

// A method to retrieve the simulation data for a given name from an instance task.

export function simulationData(instanceTask: locApi.SedInstanceTask, info: ISimulationDataInfo): number[] {
  switch (info.type) {
    case ESimulationDataInfoType.VOI:
      return instanceTask.voi()
    case ESimulationDataInfoType.STATE:
      return instanceTask.state(info.index)
    case ESimulationDataInfoType.RATE:
      return instanceTask.rate(info.index)
    case ESimulationDataInfoType.CONSTANT:
      return instanceTask.constant(info.index)
    case ESimulationDataInfoType.COMPUTED_CONSTANT:
      return instanceTask.computedConstant(info.index)
    case ESimulationDataInfoType.ALGEBRAIC:
      return instanceTask.algebraic(info.index)
    default:
      return []
  }
}
