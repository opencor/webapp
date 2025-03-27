import { _locAPI } from './locAPI'

import * as locLoggerAPI from './locLoggerAPI'
import * as locVersionAPI from './locVersionAPI'

// FileManager API.

class FileManager {
  private _fileManager = locVersionAPI.cppVersion() ? undefined : _locAPI.FileManager.instance()

  unmanage(path: string): void {
    if (locVersionAPI.cppVersion()) {
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
  issues: locLoggerAPI.IWasmIssues
  contents(): Uint8Array
  setContents(ptr: number, length: number): void
}

export class File {
  private _path: string
  private _file: IWasmFile = {} as IWasmFile

  constructor(path: string, contents: Uint8Array | undefined = undefined) {
    this._path = path

    if (locVersionAPI.cppVersion()) {
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

  type(): FileType {
    return locVersionAPI.cppVersion() ? _locAPI.fileType(this._path) : this._file.type.value
  }

  path(): string {
    return this._path
  }

  issues(): locLoggerAPI.IIssue[] {
    if (locVersionAPI.cppVersion()) {
      return _locAPI.fileIssues(this._path)
    }

    const res = []
    const issues = this._file.issues

    for (let i = 0; i < issues.size(); ++i) {
      const issue = issues.get(i)

      res.push({
        type: issue.type.value,
        typeAsString: issue.typeAsString,
        description: issue.description
      })
    }

    return res
  }

  contents(): Uint8Array {
    return locVersionAPI.cppVersion() ? _locAPI.fileContents(this._path) : this._file.contents()
  }
}
