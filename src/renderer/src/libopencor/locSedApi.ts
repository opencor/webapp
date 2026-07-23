import * as vue from 'vue';

import type {
  File as IWasmFile,
  SedDocument as IWasmSedDocument,
  SedInstance as IWasmSedInstance,
  SedInstanceTask as IWasmSedInstanceTask,
  SedModel as IWasmSedModel,
  SedOneStep as IWasmSedOneStep,
  SedUniformTimeCourse as IWasmSedUniformTimeCourse,
  SolverCvode as IWasmSolverCvode
} from '@opencor/libopencor-types';

import {
  _cppLocApi,
  _wasmLocApi,
  cppVersion,
  EIssueType,
  type File,
  fileManager,
  type IIssue,
  wasmIssuesToIssues,
  wasmVersion
} from './locApi';

// SED-ML API.

class SedIndex {
  protected _index: number;

  constructor(index: number) {
    this._index = index;
  }
}

export class SedDocument {
  private _cppDocumentId: number = -1;
  private _wasmSedDocument: IWasmSedDocument = {} as IWasmSedDocument;
  private _issues: IIssue[] = [];

  constructor(filePath: string, wasmFile: IWasmFile) {
    // Create the SED-ML document.

    if (cppVersion()) {
      this._cppDocumentId = _cppLocApi.sedDocumentCreate(filePath);
    } else {
      this._wasmSedDocument = new _wasmLocApi.SedDocument(wasmFile);
    }

    // Retrieve the issues.

    this._issues = cppVersion()
      ? _cppLocApi.sedDocumentIssues(this._cppDocumentId)
      : wasmIssuesToIssues(this._wasmSedDocument.issues);

    // TODO: we only support a limited subset of SED-ML for now, so we need to check a few more things. Might wnat to
    // check https://github.com/opencor/opencor/blob/master/src/plugins/support/SEDMLSupport/src/sedmlfile.cpp#L579-L1492.

    // Make sure that there is only one model.

    if (this.modelCount() !== 1) {
      this._issues.push({
        type: EIssueType.WARNING,
        description: 'Only SED-ML files with one model are currently supported.'
      });

      return;
    }

    // Make sure that the SED-ML file has only one simulation.

    if (this.simulationCount() !== 1) {
      this._issues.push({
        type: EIssueType.WARNING,
        description: 'Only SED-ML files with one simulation are currently supported.'
      });

      return;
    }

    // Make sure that the simulation is a uniform time course simulation.

    const simulation = this.simulation(0) as SedUniformTimeCourse;

    if (simulation.type() !== ESedSimulationType.UNIFORM_TIME_COURSE) {
      this._issues.push({
        type: EIssueType.WARNING,
        description: 'Only uniform time course simulations are currently supported.'
      });

      return;
    }

    // Make sure that the initial time and output start time are the same, that the output start time and output end
    // time are different, and that the number of steps is greater than zero.

    const initialTime = simulation.initialTime();
    const outputStartTime = simulation.outputStartTime();
    const outputEndTime = simulation.outputEndTime();
    const numberOfSteps = simulation.numberOfSteps();

    if (initialTime !== outputStartTime) {
      this._issues.push({
        type: EIssueType.WARNING,
        description: `Only uniform time course simulations with the same values for 'initialTime' (${initialTime}) and 'outputStartTime' (${outputStartTime}) are currently supported.`
      });
    }

    if (outputStartTime === outputEndTime) {
      this._issues.push({
        type: EIssueType.ERROR,
        description: `The uniform time course simulation must have different values for 'outputStartTime' (${outputStartTime}) and 'outputEndTime' (${outputEndTime}).`
      });
    }

    if (numberOfSteps <= 0) {
      this._issues.push({
        type: EIssueType.ERROR,
        description: `The uniform time course simulation must have a positive value for 'numberOfSteps' (${numberOfSteps}).`
      });
    }
  }

  issues(): IIssue[] {
    return this._issues;
  }

  modelCount(): number {
    return cppVersion() ? _cppLocApi.sedDocumentModelCount(this._cppDocumentId) : this._wasmSedDocument.modelCount;
  }

  model(index: number): SedModel {
    return new SedModel(this._cppDocumentId, this._wasmSedDocument, index);
  }

  simulationCount(): number {
    return cppVersion()
      ? _cppLocApi.sedDocumentSimulationCount(this._cppDocumentId)
      : this._wasmSedDocument.simulationCount;
  }

  simulation(index: number): SedSimulation {
    let type: ESedSimulationType;

    if (cppVersion()) {
      type = _cppLocApi.sedDocumentSimulationType(this._cppDocumentId, index);
    } else {
      switch (this._wasmSedDocument.simulation(index)?.constructor.name) {
        case 'SedAnalysis':
          type = ESedSimulationType.ANALYSIS;

          break;
        case 'SedSteadyState':
          type = ESedSimulationType.STEADY_STATE;

          break;
        case 'SedOneStep':
          type = ESedSimulationType.ONE_STEP;

          break;
        default: // 'SedUniformTimeCourse'.
          type = ESedSimulationType.UNIFORM_TIME_COURSE;
      }
    }

    if (type === ESedSimulationType.ANALYSIS) {
      return new SedAnalysis(this._cppDocumentId, this._wasmSedDocument, index, type);
    }

    if (type === ESedSimulationType.STEADY_STATE) {
      return new SedSteadyState(this._cppDocumentId, this._wasmSedDocument, index, type);
    }

    if (type === ESedSimulationType.ONE_STEP) {
      return new SedOneStep(this._cppDocumentId, this._wasmSedDocument, index, type);
    }

    return new SedUniformTimeCourse(this._cppDocumentId, this._wasmSedDocument, index, type);
  }

  instantiate(): SedInstance {
    return new SedInstance(this._cppDocumentId, this._wasmSedDocument);
  }

  serialise(): string {
    return cppVersion() ? _cppLocApi.sedDocumentSerialise(this._cppDocumentId) : this._wasmSedDocument.serialise();
  }
}

export class SedModel extends SedIndex {
  private _cppDocumentId: number;
  private _wasmSedModel: IWasmSedModel = {} as IWasmSedModel;

  constructor(cppDocumentId: number, wasmSedDocument: IWasmSedDocument, index: number) {
    super(index);

    this._cppDocumentId = cppDocumentId;

    if (wasmVersion()) {
      this._wasmSedModel = wasmSedDocument.model(index) as IWasmSedModel;
    }
  }

  file(): File | null {
    if (cppVersion()) {
      return fileManager.file(_cppLocApi.sedModelFilePath(this._cppDocumentId, this._index));
    }

    return this._wasmSedModel.file?.path != null ? fileManager.file(this._wasmSedModel.file.path) : null;
  }

  addChange(componentName: string, variableName: string, newValue: string): void {
    if (cppVersion()) {
      _cppLocApi.sedModelAddChange(this._cppDocumentId, this._index, componentName, variableName, newValue);
    } else {
      this._wasmSedModel.addChange(new _wasmLocApi.SedChangeAttribute(componentName, variableName, newValue));
    }
  }

  removeAllChanges(): void {
    if (cppVersion()) {
      _cppLocApi.sedModelRemoveAllChanges(this._cppDocumentId, this._index);
    } else {
      this._wasmSedModel.removeAllChanges();
    }
  }
}

export enum ESedSimulationType {
  ANALYSIS,
  STEADY_STATE,
  ONE_STEP,
  UNIFORM_TIME_COURSE
}

export class SedSimulation extends SedIndex {
  protected _cppDocumentId: number;
  private _type: ESedSimulationType;

  constructor(cppDocumentId: number, _wasmSedDocument: IWasmSedDocument, index: number, type: ESedSimulationType) {
    super(index);

    this._cppDocumentId = cppDocumentId;
    this._type = type;
  }

  type(): ESedSimulationType {
    return this._type;
  }
}

export class SedAnalysis extends SedSimulation {}

export class SedSteadyState extends SedSimulation {}

export class SedOneStep extends SedSimulation {
  private _wasmSedOneStep: IWasmSedOneStep = {} as IWasmSedOneStep;

  constructor(cppDocumentId: number, wasmSedDocument: IWasmSedDocument, index: number, type: ESedSimulationType) {
    super(cppDocumentId, wasmSedDocument, index, type);

    if (wasmVersion()) {
      this._wasmSedOneStep = wasmSedDocument.simulation(index) as IWasmSedOneStep;
    }
  }

  step(): number {
    return cppVersion() ? _cppLocApi.sedOneStepStep(this._cppDocumentId, this._index) : this._wasmSedOneStep.step;
  }
}

export class SedUniformTimeCourse extends SedSimulation {
  private _wasmSedUniformTimeCourse: IWasmSedUniformTimeCourse = {} as IWasmSedUniformTimeCourse;

  constructor(cppDocumentId: number, wasmSedDocument: IWasmSedDocument, index: number, type: ESedSimulationType) {
    super(cppDocumentId, wasmSedDocument, index, type);

    if (wasmVersion()) {
      this._wasmSedUniformTimeCourse = wasmSedDocument.simulation(index) as IWasmSedUniformTimeCourse;
    }
  }

  initialTime(): number {
    return cppVersion()
      ? _cppLocApi.sedUniformTimeCourseInitialTime(this._cppDocumentId, this._index)
      : this._wasmSedUniformTimeCourse.initialTime;
  }

  setInitialTime(value: number): void {
    if (cppVersion()) {
      _cppLocApi.sedUniformTimeCourseSetInitialTime(this._cppDocumentId, this._index, value);
    } else {
      this._wasmSedUniformTimeCourse.initialTime = value;
    }
  }

  outputStartTime(): number {
    return cppVersion()
      ? _cppLocApi.sedUniformTimeCourseOutputStartTime(this._cppDocumentId, this._index)
      : this._wasmSedUniformTimeCourse.outputStartTime;
  }

  setOutputStartTime(value: number): void {
    if (cppVersion()) {
      _cppLocApi.sedUniformTimeCourseSetOutputStartTime(this._cppDocumentId, this._index, value);
    } else {
      this._wasmSedUniformTimeCourse.outputStartTime = value;
    }
  }

  outputEndTime(): number {
    return cppVersion()
      ? _cppLocApi.sedUniformTimeCourseOutputEndTime(this._cppDocumentId, this._index)
      : this._wasmSedUniformTimeCourse.outputEndTime;
  }

  setOutputEndTime(value: number): void {
    if (cppVersion()) {
      _cppLocApi.sedUniformTimeCourseSetOutputEndTime(this._cppDocumentId, this._index, value);
    } else {
      this._wasmSedUniformTimeCourse.outputEndTime = value;
    }
  }

  numberOfSteps(): number {
    return cppVersion()
      ? _cppLocApi.sedUniformTimeCourseNumberOfSteps(this._cppDocumentId, this._index)
      : this._wasmSedUniformTimeCourse.numberOfSteps;
  }

  setNumberOfSteps(value: number): void {
    if (cppVersion()) {
      _cppLocApi.sedUniformTimeCourseSetNumberOfSteps(this._cppDocumentId, this._index, value);
    } else {
      this._wasmSedUniformTimeCourse.numberOfSteps = value;
    }
  }

  cvode(): SolverCvode {
    return new SolverCvode(this._cppDocumentId, this._wasmSedUniformTimeCourse, this._index);
  }
}

export class SolverCvode extends SedIndex {
  private _cppDocumentId: number;
  private _wasmSolverCvode: IWasmSolverCvode = {} as IWasmSolverCvode;

  constructor(cppDocumentId: number, wasmSedUniformTimeCourse: IWasmSedUniformTimeCourse, index: number) {
    super(index);

    this._cppDocumentId = cppDocumentId;

    if (wasmVersion()) {
      this._wasmSolverCvode = wasmSedUniformTimeCourse.odeSolver as IWasmSolverCvode;
    }
  }

  // TODO: this is only temporary until we have full support for our different solvers.

  maximumStep(): number {
    return cppVersion()
      ? _cppLocApi.solverCvodeMaximumStep(this._cppDocumentId, this._index)
      : this._wasmSolverCvode.maximumStep;
  }

  setMaximumStep(value: number): void {
    if (cppVersion()) {
      _cppLocApi.solverCvodeSetMaximumStep(this._cppDocumentId, this._index, value);
    } else {
      this._wasmSolverCvode.maximumStep = value;
    }
  }
}

export enum ESedInstanceStatus {
  IDLE,
  RUNNING,
  PAUSED
}

export class SedInstance {
  private _cppInstanceId: number = -1;
  private _wasmSedInstance: IWasmSedInstance = {} as IWasmSedInstance;

  constructor(cppDocumentId: number, wasmSedDocument: IWasmSedDocument) {
    if (cppVersion()) {
      this._cppInstanceId = _cppLocApi.sedDocumentInstantiate(cppDocumentId);
    } else {
      this._wasmSedInstance = vue.markRaw(wasmSedDocument.instantiate() as IWasmSedInstance);
    }
  }

  hasIssues(): boolean {
    return cppVersion() ? _cppLocApi.sedInstanceHasIssues(this._cppInstanceId) : this._wasmSedInstance.hasIssues;
  }

  issues(): IIssue[] {
    return cppVersion()
      ? _cppLocApi.sedInstanceIssues(this._cppInstanceId)
      : wasmIssuesToIssues(this._wasmSedInstance.issues);
  }

  task(index: number): SedInstanceTask {
    return new SedInstanceTask(this._cppInstanceId, index, this._wasmSedInstance);
  }

  status(): ESedInstanceStatus {
    return cppVersion() ? _cppLocApi.sedInstanceStatus(this._cppInstanceId) : this._wasmSedInstance.status.value;
  }

  progress(): number {
    return cppVersion() ? _cppLocApi.sedInstanceProgress(this._cppInstanceId) : this._wasmSedInstance.progress;
  }

  startRun(): boolean {
    return cppVersion() ? _cppLocApi.sedInstanceStartRun(this._cppInstanceId) : this._wasmSedInstance.startRun();
  }

  waitForRun(): number {
    return cppVersion() ? _cppLocApi.sedInstanceWaitForRun(this._cppInstanceId) : this._wasmSedInstance.waitForRun();
  }

  pauseRun(): void {
    if (cppVersion()) {
      _cppLocApi.sedInstancePauseRun(this._cppInstanceId);
    } else {
      this._wasmSedInstance.pauseRun();
    }
  }

  resumeRun(): void {
    if (cppVersion()) {
      _cppLocApi.sedInstanceResumeRun(this._cppInstanceId);
    } else {
      this._wasmSedInstance.resumeRun();
    }
  }

  stopRun(): void {
    if (cppVersion()) {
      _cppLocApi.sedInstanceStopRun(this._cppInstanceId);
    } else {
      this._wasmSedInstance.stopRun();
    }
  }
}

export class SedInstanceTask extends SedIndex {
  private _cppInstanceId: number;
  private _wasmSedInstanceTask: IWasmSedInstanceTask = {} as IWasmSedInstanceTask;

  constructor(cppInstanceId: number, index: number, wasmSedInstance: IWasmSedInstance) {
    super(index);

    this._cppInstanceId = cppInstanceId;

    if (wasmVersion()) {
      this._wasmSedInstanceTask = wasmSedInstance.task(index) as IWasmSedInstanceTask;
    }
  }

  voiName(): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskVoiName(this._cppInstanceId, this._index)
      : this._wasmSedInstanceTask.voiName;
  }

  voiUnit(): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskVoiUnit(this._cppInstanceId, this._index)
      : this._wasmSedInstanceTask.voiUnit;
  }

  voi(): Float64Array {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskVoi(this._cppInstanceId, this._index)
      : this._wasmSedInstanceTask.voi;
  }

  stateCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskStateCount(this._cppInstanceId, this._index)
      : this._wasmSedInstanceTask.stateCount;
  }

  stateName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskStateName(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.stateName(index);
  }

  stateUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskStateUnit(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.stateUnit(index);
  }

  state(index: number): Float64Array {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskState(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.state(index);
  }

  rateCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskRateCount(this._cppInstanceId, this._index)
      : this._wasmSedInstanceTask.rateCount;
  }

  rateName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskRateName(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.rateName(index);
  }

  rateUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskRateUnit(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.rateUnit(index);
  }

  rate(index: number): Float64Array {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskRate(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.rate(index);
  }

  constantCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskConstantCount(this._cppInstanceId, this._index)
      : this._wasmSedInstanceTask.constantCount;
  }

  constantName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskConstantName(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.constantName(index);
  }

  constantUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskConstantUnit(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.constantUnit(index);
  }

  constant(index: number): Float64Array {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskConstant(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.constant(index);
  }

  computedConstantCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskComputedConstantCount(this._cppInstanceId, this._index)
      : this._wasmSedInstanceTask.computedConstantCount;
  }

  computedConstantName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskComputedConstantName(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.computedConstantName(index);
  }

  computedConstantUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskComputedConstantUnit(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.computedConstantUnit(index);
  }

  computedConstant(index: number): Float64Array {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskComputedConstant(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.computedConstant(index);
  }

  algebraicVariableCount(): number {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskAlgebraicVariableCount(this._cppInstanceId, this._index)
      : this._wasmSedInstanceTask.algebraicVariableCount;
  }

  algebraicVariableName(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskAlgebraicVariableName(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.algebraicVariableName(index);
  }

  algebraicVariableUnit(index: number): string {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskAlgebraicVariableUnit(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.algebraicVariableUnit(index);
  }

  algebraicVariable(index: number): Float64Array {
    return cppVersion()
      ? _cppLocApi.sedInstanceTaskAlgebraicVariable(this._cppInstanceId, this._index, index)
      : this._wasmSedInstanceTask.algebraicVariable(index);
  }
}
