// Retrieve the version of libOpenCOR that is to be used. Two options:
//  - OpenCOR: libOpenCOR can be accessed using window.locApi.
//  - OpenCOR's Web app: libOpenCOR must be imported as a WebAssembly module.

export let _locApi = undefined

export async function initialiseLocApi() {
  // @ts-expect-error (window.locApi may or may not be defined which is why we test it)
  if (window.locApi !== undefined) {
    // We are running OpenCOR, so libOpenCOR can be accessed using window.locApi.

    // @ts-expect-error (window.locApi is defined)
    _locApi = window.locApi
  } else {
    // We are running OpenCOR's Web app, so we must import libOpenCOR's WebAssembly module.

    try {
      const libOpenCOR = (await import('libopencor')).default

      _locApi = await libOpenCOR()
    } catch (error) {
      console.error("Failed to load libOpenCOR's WebAssembly module:", error)
    }
  }

  return _locApi
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
