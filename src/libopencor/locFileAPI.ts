import libOpenCOR from 'libopencor'

import { cppVersion, SEDDocument, wasmIssuesToIssues, type IIssue, type IWasmIssues } from './locAPI'

// @ts-expect-error (window.locAPI may or may not be defined and that is why we test it)
export const _locAPI = window.locAPI ?? (await libOpenCOR())

// FileManager API.

class FileManager {
  private _fileManager = cppVersion() ? undefined : _locAPI.FileManager.instance()

  unmanage(path: string): void {
    if (cppVersion()) {
      _locAPI.fileManagerUnmanage(path)
    } else {
      const files = this._fileManager.files

      for (let i = 0; i < files.size(); ++i) {
        const file = files.get(i)

        if (file.fileName === path) {
          this._fileManager.unmanage(file)

          break
        }
      }
    }
  }
}

export const fileManager = new FileManager()

// File API.

export enum FileType {
  UnknownFile,
  CellMLFile,
  SEDMLFile,
  COMBINEArchive,
  IrretrievableFile
}

interface IWasmFile {
  type: { value: FileType }
  issues: IWasmIssues
  contents(): Uint8Array
  setContents(ptr: number, length: number): void
}

export class File {
  private _path: string
  private _wasmFile: IWasmFile = {} as IWasmFile
  private _sedDocument: SEDDocument = {} as SEDDocument
  private _issues: IIssue[] = []

  constructor(path: string, contents: Uint8Array | undefined = undefined) {
    this._path = path

    if (cppVersion()) {
      _locAPI.fileCreate(path, contents)

      this._issues = _locAPI.fileIssues(path)
    } else if (contents !== undefined) {
      this._wasmFile = new _locAPI.File(path)

      const heapContentsPtr = _locAPI._malloc(contents.length)
      const heapContents = new Uint8Array(_locAPI.HEAPU8.buffer, heapContentsPtr, contents.length)

      heapContents.set(contents)

      this._wasmFile.setContents(heapContentsPtr, contents.length)

      this._issues = wasmIssuesToIssues(this._wasmFile.issues)
    } else {
      // Note: we should never reach this point since we should always provide some file contents when using the WASM
      //       version of libOpenCOR.

      console.error(`No contents provided for file '${path}'.`)

      return
    }

    // Retrieve the SED-ML file associated with this file, if there are no issues with it.

    if (this._issues.length === 0) {
      this._sedDocument = new SEDDocument(this)
      this._issues = this._sedDocument.issues()
    }
  }

  type(): FileType {
    return cppVersion() ? _locAPI.fileType(this._path) : this._wasmFile.type.value
  }

  wasmFile(): IWasmFile {
    return this._wasmFile
  }

  path(): string {
    return this._path
  }

  issues(): IIssue[] {
    return this._issues
  }

  contents(): Uint8Array {
    return cppVersion() ? _locAPI.fileContents(this._path) : this._wasmFile.contents()
  }
}
