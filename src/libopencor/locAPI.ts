import { electronAPI } from '../electronAPI'

import libOpenCOR from 'libopencor'

// @ts-expect-error (window.locAPI may or may not be defined and that is why we test it)
const _locAPI = window.locAPI ?? (await libOpenCOR())

// Some general methods.

export function cppVersion(): boolean {
  return electronAPI !== undefined
}

export function wasmVersion(): boolean {
  return !cppVersion()
}

export function version(): string {
  return cppVersion() ? _locAPI.version() : _locAPI.versionString()
}

// File API.

export class File {
  _path: string
  _contents: Uint8Array

  constructor(path: string, contents?: Uint8Array) {
    this._path = path
    this._contents = contents ?? new Uint8Array()
  }

  contents(): Uint8Array {
    return this._contents
  }
}
