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

interface IFile {
  contents(): Uint8Array
  setContents(ptr: number, length: number): void
}

export class File {
  private _path?: string
  private _file: IFile = {} as IFile

  constructor(path: string, contents: Uint8Array | undefined = undefined) {
    if (cppVersion()) {
      this._path = path

      _locAPI.fileCreate(path, contents)
    } else if (contents !== undefined) {
      this._file = new _locAPI.File(path)

      const heapContentsPtr = _locAPI._malloc(contents.length)
      const heapContents = new Uint8Array(_locAPI.HEAPU8.buffer, heapContentsPtr, contents.length)

      heapContents.set(contents)

      this._file.setContents(heapContentsPtr, contents.length)
    } else {
      // Note: we should never reach this point since we should always provide some file contents when using the WASM
      //       version of libOpenCOR.

      console.error(`No contents provided for file '${path}'.`)
    }
  }

  contents(): Uint8Array {
    return cppVersion() ? _locAPI.fileContents(this._path) : this._file.contents()
  }
}
