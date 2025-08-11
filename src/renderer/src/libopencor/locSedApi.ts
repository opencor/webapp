import * as vue from 'vue'

import {
  _cppLocApi,
  _wasmLocApi,
  cppVersion,
  wasmIssuesToIssues,
  wasmVersion,
  type IIssue,
  type IWasmFile,
  type IWasmIssues
} from './locApi.js'

// SED-ML API.

class SedBase {
  protected _filePath: string

  constructor(filePath: string) {
    this._filePath = filePath
  }
}

class SedBaseIndex extends SedBase {
  protected _index: number

  constructor(filePath: string, index: number) {
    super(filePath)

    this._index = index
  }
}

export interface IWasmSedDocument {
  issues: IWasmIssues
  modelCount: number
  model(index: number): IWasmSedModel
  simulationCount: number
  simulation(index: number): IWasmSedSimulation
  instantiate(): IWasmSedInstance
}

export class SedDocument extends SedBase {
  private _wasmSedDocument: IWasmSedDocument = {} as IWasmSedDocument

  constructor(filePath: string, wasmFile: IWasmFile) {
    super(filePath)

    if (cppVersion()) {
      _cppLocApi.sedDocumentCreate(this._filePath)
    } else {
      this._wasmSedDocument = new _wasmLocApi.SedDocument(wasmFile)
    }
  }

  issues(): IIssue[] {
    return cppVersion()
      ? _cppLocApi.sedDocumentIssues(this._filePath)
      : wasmIssuesToIssues(this._wasmSedDocument.issues)
  }

  modelCount(): number {
    return cppVersion() ? _cppLocApi.sedDocumentModelCount(this._filePath) : this._wasmSedDocument.modelCount
  }

  model(index: number): SedModel {
    return new SedModel(this._filePath, index, this._wasmSedDocument)
  }

  simulationCount(): number {
    return cppVersion() ? _cppLocApi.sedDocumentSimulationCount(this._filePath) : this._wasmSedDocument.simulationCount
  }

  simulation(index: number): SedSimulation {
    let type: ESedSimulationType

    if (cppVersion()) {
      type = _cppLocApi.sedDocumentSimulationType(this._filePath, index)
    } else {
      switch (this._wasmSedDocument.simulation(index).constructor.name) {
        case 'SedAnalysis':
          type = ESedSimulationType.ANALYSIS

          break
        case 'SedSteadyState':
          type = ESedSimulationType.STEADY_STATE

          break
        case 'SedOneStep':
          type = ESedSimulationType.ONE_STEP

          break
        default: // 'SedUniformTimeCourse'.
          type = ESedSimulationType.UNIFORM_TIME_COURSE
      }
    }

    if (type === ESedSimulationType.ANALYSIS) {
      return new SedSimulationAnalysis(this._filePath, index, this._wasmSedDocument, type)
    }

    if (type === ESedSimulationType.STEADY_STATE) {
      return new SedSimulationSteadyState(this._filePath, index, this._wasmSedDocument, type)
    }

    if (type === ESedSimulationType.ONE_STEP) {
      return new SedSimulationOneStep(this._filePath, index, this._wasmSedDocument, type)
    }

    return new SedSimulationUniformTimeCourse(this._filePath, index, this._wasmSedDocument, type)
  }

  instantiate(): SedInstance {
    return new SedInstance(this._filePath, this._wasmSedDocument)
  }
}

export interface IWasmSedChangeAttribute {
  componentName: string
  variableName: string
  newValue: string
}

interface IWasmSedModel {
  addChange(change: IWasmSedChangeAttribute): void
  removeAllChanges(): void
}

export class SedModel extends SedBaseIndex {
  private _wasmSedModel: IWasmSedModel = {} as IWasmSedModel

  constructor(filePath: string, index: number, _wasmSedDocument: IWasmSedDocument) {
    super(filePath, index)

    if (wasmVersion()) {
      this._wasmSedModel = _wasmSedDocument.model(index)
    }
  }

  addChange(componentName: string, variableName: string, newValue: string): void {
    if (cppVersion()) {
      _cppLocApi.sedDocumentModelAddChange(this._filePath, this._index, componentName, variableName, newValue)
    } else {
      this._wasmSedModel.addChange(new _wasmLocApi.SedChangeAttribute(componentName, variableName, newValue))
    }
  }

  removeAllChanges(): void {
    if (cppVersion()) {
      _cppLocApi.sedDocumentModelRemoveAllChanges(this._filePath, this._index)
    } else {
      this._wasmSedModel.removeAllChanges()
    }
  }
}

export enum ESedSimulationType {
  ANALYSIS,
  STEADY_STATE,
  ONE_STEP,
  UNIFORM_TIME_COURSE
}

interface IWasmSedSimulation {
  type: ESedSimulationType
}

export class SedSimulation extends SedBaseIndex {
  private _type: ESedSimulationType

  constructor(filePath: string, index: number, _wasmSedDocument: IWasmSedDocument, type: ESedSimulationType) {
    super(filePath, index)

    this._type = type
  }

  type(): ESedSimulationType {
    return this._type
  }
}

export class SedSimulationAnalysis extends SedSimulation {}

export class SedSimulationSteadyState extends SedSimulation {}

interface IWasmSedSimulationOneStep extends IWasmSedSimulation {
  step: number
}

export class SedSimulationOneStep extends SedSimulation {
  private _wasmSedSimulationOneStep: IWasmSedSimulationOneStep = {} as IWasmSedSimulationOneStep

  constructor(filePath: string, index: number, _wasmSedDocument: IWasmSedDocument, type: ESedSimulationType) {
    super(filePath, index, _wasmSedDocument, type)

    if (wasmVersion()) {
      this._wasmSedSimulationOneStep = _wasmSedDocument.simulation(index) as IWasmSedSimulationOneStep
    }
  }

  step(): number {
    return cppVersion()
      ? _cppLocApi.sedDocumentSimulationOneStepStep(this._filePath, this._index)
      : this._wasmSedSimulationOneStep.step
  }
}

interface IWasmSedSimulationUniformTimeCourse extends IWasmSedSimulation {
  initialTime: number
  outputStartTime: number
  outputEndTime: number
  numberOfSteps: number
}

export class SedSimulationUniformTimeCourse extends SedSimulation {
  private _wasmSedSimulationUniformTimeCourse: IWasmSedSimulationUniformTimeCourse =
    {} as IWasmSedSimulationUniformTimeCourse

  constructor(filePath: string, index: number, _wasmSedDocument: IWasmSedDocument, type: ESedSimulationType) {
    super(filePath, index, _wasmSedDocument, type)

    if (wasmVersion()) {
      this._wasmSedSimulationUniformTimeCourse = _wasmSedDocument.simulation(
        index
      ) as IWasmSedSimulationUniformTimeCourse
    }
  }

  initialTime(): number {
    return cppVersion()
      ? _cppLocApi.sedDocumentSimulationUniformTimeCourseInitialTime(this._filePath, this._index)
      : this._wasmSedSimulationUniformTimeCourse.initialTime
  }

  outputStartTime(): number {
    return cppVersion()
      ? _cppLocApi.sedDocumentSimulationUniformTimeCourseOutputStartTime(this._filePath, this._index)
      : this._wasmSedSimulationUniformTimeCourse.outputStartTime
  }

  setOutputStartTime(value: number): void {
    if (cppVersion()) {
      _cppLocApi.sedDocumentSimulationUniformTimeCourseSetOutputStartTime(this._filePath, this._index, value)
    } else {
      this._wasmSedSimulationUniformTimeCourse.outputStartTime = value
    }
  }

  outputEndTime(): number {
    return cppVersion()
      ? _cppLocApi.sedDocumentSimulationUniformTimeCourseOutputEndTime(this._filePath, this._index)
      : this._wasmSedSimulationUniformTimeCourse.outputEndTime
  }

  setOutputEndTime(value: number): void {
    if (cppVersion()) {
      _cppLocApi.sedDocumentSimulationUniformTimeCourseSetOutputEndTime(this._filePath, this._index, value)
    } else {
      this._wasmSedSimulationUniformTimeCourse.outputEndTime = value
    }
  }

  numberOfSteps(): number {
    return cppVersion()
      ? _cppLocApi.sedDocumentSimulationUniformTimeCourseNumberOfSteps(this._filePath, this._index)
      : this._wasmSedSimulationUniformTimeCourse.numberOfSteps
  }

  setNumberOfSteps(value: number): void {
    if (cppVersion()) {
      _cppLocApi.sedDocumentSimulationUniformTimeCourseSetNumberOfSteps(this._filePath, this._index, value)
    } else {
      this._wasmSedSimulationUniformTimeCourse.numberOfSteps = value
    }
  }
}

interface IWasmSedInstance {
  issues: IWasmIssues
  task(index: number): IWasmSedInstanceTask
  run(): number
}

export class SedInstance extends SedBase {
  private _wasmSedInstance: IWasmSedInstance = {} as IWasmSedInstance

  constructor(filePath: string, wasmSedDocument: IWasmSedDocument) {
    super(filePath)

    if (cppVersion()) {
      _cppLocApi.sedDocumentInstantiate(this._filePath)
    } else {
      this._wasmSedInstance = vue.markRaw(wasmSedDocument.instantiate())
    }
  }

  issues(): IIssue[] {
    return cppVersion()
      ? _cppLocApi.sedInstanceIssues(this._filePath)
      : wasmIssuesToIssues(this._wasmSedInstance.issues)
  }

  task(index: number): SedInstanceTask {
    return new SedInstanceTask(this._filePath, index, this._wasmSedInstance)
  }

  run(): number {
    return cppVersion() ? _cppLocApi.sedInstanceRun(this._filePath) : this._wasmSedInstance.run()
  }
}

interface IWasmSedInstanceTask {
  voiName: string
  voiUnit: string
  voiAsArray: number[]
  stateCount: number
  stateName(index: number): string
  stateUnit(index: number): string
  stateAsArray(index: number): number[]
  rateCount: number
  rateName(index: number): string
  rateUnit(index: number): string
  rateAsArray(index: number): number[]
  constantCount: number
  constantName(index: number): string
  constantUnit(index: number): string
  constantAsArray(index: number): number[]
  computedConstantCount: number
  computedConstantName(index: number): string
  computedConstantUnit(index: number): string
  computedConstantAsArray(index: number): number[]
  algebraicCount: number
  algebraicName(index: number): string
  algebraicUnit(index: number): string
  algebraicAsArray(index: number): number[]
}

export class SedInstanceTask extends SedBaseIndex {
  private _wasmSedInstanceTask: IWasmSedInstanceTask = {} as IWasmSedInstanceTask

  constructor(filePath: string, index: number, wasmSedInstance: IWasmSedInstance) {
    super(filePath, index)

    if (wasmVersion()) {
      this._wasmSedInstanceTask = wasmSedInstance.task(index)
    }
  }

  voiName(): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskVoiName(this._filePath, this._index)
      : this._wasmSedInstanceTask.voiName
  }

  voiUnit(): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskVoiUnit(this._filePath, this._index)
      : this._wasmSedInstanceTask.voiUnit
  }

  voi(): number[] {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskVoi(this._filePath, this._index)
      : this._wasmSedInstanceTask.voiAsArray
  }

  stateCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskStateCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.stateCount
  }

  stateName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskStateName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.stateName(index)
  }

  stateUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskStateUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.stateUnit(index)
  }

  state(index: number): number[] {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskState(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.stateAsArray(index)
  }

  rateCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskRateCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.rateCount
  }

  rateName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskRateName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.rateName(index)
  }

  rateUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskRateUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.rateUnit(index)
  }

  rate(index: number): number[] {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskRate(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.rateAsArray(index)
  }

  constantCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskConstantCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.constantCount
  }

  constantName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskConstantName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.constantName(index)
  }

  constantUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskConstantUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.constantUnit(index)
  }

  constant(index: number): number[] {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskConstant(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.constantAsArray(index)
  }

  computedConstantCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskComputedConstantCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.computedConstantCount
  }

  computedConstantName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskComputedConstantName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.computedConstantName(index)
  }

  computedConstantUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskComputedConstantUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.computedConstantUnit(index)
  }

  computedConstant(index: number): number[] {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskComputedConstant(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.computedConstantAsArray(index)
  }

  algebraicCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskAlgebraicCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.algebraicCount
  }

  algebraicName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskAlgebraicName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.algebraicName(index)
  }

  algebraicUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskAlgebraicUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.algebraicUnit(index)
  }

  algebraic(index: number): number[] {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskAlgebraic(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.algebraicAsArray(index)
  }
}
