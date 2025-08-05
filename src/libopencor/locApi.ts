import libOpenCOR from 'libopencor'

// @ts-expect-error (window.locApi may or may not be defined and that is why we test it)
export let _locApi = window.locApi

if (_locApi === undefined) {
  libOpenCOR().then((locApi: unknown) => {
    _locApi = locApi
  })
}

// Logger API.

export { EIssueType, wasmIssuesToIssues, type IIssue, type IWasmIssues } from './locLoggerApi'

// File API.

export { EFileType, File, fileManager, type IWasmFile } from './locFileApi'

// SED-ML API.

export {
  ESedSimulationType,
  SedDocument,
  SedInstance,
  SedInstanceTask,
  SedSimulationUniformTimeCourse
} from './locSedApi'

// UI JSON API.

export {
  type IUiJson,
  type IUiJsonDiscreteInputPossibleValue,
  type IUiJsonInput,
  type IUiJsonOutput,
  type IUiJsonOutputData,
  type IUiJsonOutputPlot,
  type IUiJsonParameter,
  uiJsonIssues
} from './locUiJsonApi'

// Version API.

export { cppVersion, wasmVersion, version } from './locVersionApi'
