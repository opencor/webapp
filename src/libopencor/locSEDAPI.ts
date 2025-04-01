import { _locAPI, cppVersion, wasmIssuesToIssues, type IIssue, type IWasmFile, type IWasmIssues } from './locAPI'

// SED API.

interface IWasmSEDDocument {
  issues: IWasmIssues
  simulationCount: number
}

export class SEDDocument {
  private _filePath: string
  private _sedDocument: IWasmSEDDocument = {} as IWasmSEDDocument

  constructor(filePath: string, wasmFile: IWasmFile) {
    this._filePath = filePath

    if (cppVersion()) {
      _locAPI.sedDocumentCreate(this._filePath)
    } else {
      this._sedDocument = new _locAPI.SedDocument(wasmFile)
    }
  }

  issues(): IIssue[] {
    return cppVersion() ? _locAPI.sedDocumentIssues(this._filePath) : wasmIssuesToIssues(this._sedDocument.issues)
  }

  simulationCount(): number {
    return cppVersion() ? _locAPI.sedDocumentSimulationCount(this._filePath) : this._sedDocument.simulationCount
  }
}
