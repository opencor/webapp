import { _locAPI, cppVersion, wasmIssuesToIssues, type IIssue, type IWasmFile, type IWasmIssues } from './locAPI'

// SED API.

interface IWasmSEDDocument {
  issues: IWasmIssues
  simulationCount: number
  simulation(index: number): IWasmSEDSimulation
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

  simulation(index: number): SEDSimulation {
    return new SEDSimulation(this._filePath, this._sedDocument, index)
  }
}

export enum SEDSimulationType {
  Analysis,
  SteadyState,
  OneStep,
  UniformTimeCourse
}

interface IWasmSEDSimulation {}

export class SEDSimulation {
  private _filePath: string
  private _index: number
  private _wasmSEDSimulation: IWasmSEDSimulation = {} as IWasmSEDSimulation
  private _type: SEDSimulationType

  constructor(filePath: string, sedDocument: IWasmSEDDocument, index: number) {
    this._filePath = filePath
    this._index = index

    if (cppVersion()) {
      this._type = _locAPI.sedDocumentSimulationType(filePath, this._index)
    } else {
      this._wasmSEDSimulation = sedDocument.simulation(index)

      switch (this._wasmSEDSimulation.constructor.name) {
        case 'SedAnalysis':
          this._type = SEDSimulationType.Analysis

          break
        case 'SedSteadyState':
          this._type = SEDSimulationType.SteadyState

          break
        case 'SedOneStep':
          this._type = SEDSimulationType.OneStep

          break
        default: // 'SedUniformTimeCourse'.
          this._type = SEDSimulationType.UniformTimeCourse
      }
    }
  }

  type(): SEDSimulationType {
    return this._type
  }
}
