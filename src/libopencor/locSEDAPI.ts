import { _locAPI, cppVersion, File, wasmIssuesToIssues, type IIssue, type IWasmIssues } from './locAPI'

// SED API.

interface IWasmSEDDocument {
  issues: IWasmIssues
  simulationCount: number
}

export class SEDDocument {
  private _file: File = {} as File
  private _sedDocument: IWasmSEDDocument = {} as IWasmSEDDocument

  constructor(file: File) {
    this._file = file

    if (cppVersion()) {
      _locAPI.sedDocumentCreate(file.path())
    } else {
      this._sedDocument = new _locAPI.SedDocument(file.wasmFile())
    }
  }

  issues(): IIssue[] {
    if (cppVersion()) {
      return _locAPI.sedDocumentIssues(this._file.path())
    }

    return wasmIssuesToIssues(this._sedDocument.issues)
  }

  simulationCount(): number {
    if (cppVersion()) {
      return _locAPI.sedDocumentSimulationCount(this._file.path())
    }

    return this._sedDocument.simulationCount
  }
}
