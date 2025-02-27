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
  private _file: {
    contents(): Uint8Array
    setContents(ptr: number, length: number): void
  }

  constructor(path: string, contents?: Uint8Array) {
    if (cppVersion()) {
      this._file = new _locAPI.File(path)
    } else {
      if (contents === undefined) {
        throw new Error('The contents of the file must be provided.')
      }

      this._file = new _locAPI.File(path)

      const heapContentsPtr = _locAPI._malloc(contents.length)
      const heapContents = new Uint8Array(_locAPI.HEAPU8.buffer, heapContentsPtr, contents.length)

      heapContents.set(contents)

      this._file.setContents(heapContentsPtr, contents.length)
    }
  }

  contents(): Uint8Array {
    return this._file.contents()
  }
}
