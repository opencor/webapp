import { electronAPI } from '../electronAPI'

import libOpenCOR from 'libopencor'

// @ts-expect-error (window.locAPI may or may not be defined and that is why we test it)
const _locAPI = window.locAPI ?? (await libOpenCOR())

class LOCAPI {
  // Some general methods.

  cppVersion(): boolean {
    return electronAPI !== undefined
  }

  wasmVersion(): boolean {
    return !this.cppVersion()
  }

  version(): string {
    return this.cppVersion() ? _locAPI.version() : _locAPI.versionString()
  }
}

export const locAPI: LOCAPI = new LOCAPI()
