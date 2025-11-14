import { proxyUrl } from '../common/common.js';

import type { EFileType, IWasmFile, IWasmFileManager } from './locFileApi.js';
import type { IIssue } from './locLoggerApi.js';
import type { IWasmSedChangeAttribute, IWasmSedDocument } from './locSedApi.js';

export interface ICppLocApi {
  // FileManager API.

  fileManagerUnmanage: (path: string) => void;

  // File API.

  fileContents: (path: string) => Uint8Array;
  fileCreate: (path: string, contents?: Uint8Array) => void;
  fileIssues: (path: string) => IIssue[];
  fileType: (path: string) => EFileType;
  fileUiJson: (path: string) => Uint8Array | undefined;

  // SedDocument API.

  sedDocumentCreate: (path: string) => void;
  sedDocumentInstantiate: (path: string) => void;
  sedDocumentIssues: (path: string) => IIssue[];
  sedDocumentModelCount: (path: string) => number;
  sedDocumentModelAddChange: (
    path: string,
    index: number,
    componentName: string,
    variableName: string,
    newValue: string
  ) => void;
  sedDocumentModelRemoveAllChanges: (path: string, index: number) => void;
  sedDocumentSimulationCount: (path: string) => number;
  sedDocumentSimulationType: (path: string, index: number) => number;
  sedDocumentSimulationUniformTimeCourseInitialTime: (path: string, index: number) => number;
  sedDocumentSimulationUniformTimeCourseOutputStartTime: (path: string, index: number) => number;
  sedDocumentSimulationUniformTimeCourseSetOutputStartTime: (path: string, index: number, value: number) => void;
  sedDocumentSimulationUniformTimeCourseOutputEndTime: (path: string, index: number) => number;
  sedDocumentSimulationUniformTimeCourseSetOutputEndTime: (path: string, index: number, value: number) => void;
  sedDocumentSimulationUniformTimeCourseNumberOfSteps: (path: string, index: number) => number;
  sedDocumentSimulationUniformTimeCourseSetNumberOfSteps: (path: string, index: number, value: number) => void;
  sedDocumentSimulationOneStepStep: (path: string, index: number) => number;

  // SedInstance API.

  sedInstanceHasIssues: (path: string) => boolean;
  sedInstanceIssues: (path: string) => IIssue[];
  sedInstanceRun: (path: string) => number;

  // SedInstanceTask API.

  sedInstanceTaskVoiName: (path: string, index: number) => string;
  sedInstanceTaskVoiUnit: (path: string, index: number) => string;
  sedInstanceTaskVoi: (path: string, index: number) => number[];
  sedInstanceTaskStateCount: (path: string, index: number) => number;
  sedInstanceTaskStateName: (path: string, index: number, stateIndex: number) => string;
  sedInstanceTaskStateUnit: (path: string, index: number, stateIndex: number) => string;
  sedInstanceTaskState: (path: string, index: number, stateIndex: number) => number[];
  sedInstanceTaskRateCount: (path: string, index: number) => number;
  sedInstanceTaskRateName: (path: string, index: number, rateIndex: number) => string;
  sedInstanceTaskRateUnit: (path: string, index: number, rateIndex: number) => string;
  sedInstanceTaskRate: (path: string, index: number, rateIndex: number) => number[];
  sedInstanceTaskConstantCount: (path: string, index: number) => number;
  sedInstanceTaskConstantName: (path: string, index: number, constantIndex: number) => string;
  sedInstanceTaskConstantUnit: (path: string, index: number, constantIndex: number) => string;
  sedInstanceTaskConstant: (path: string, index: number, constantIndex: number) => number[];
  sedInstanceTaskComputedConstantCount: (path: string, index: number) => number;
  sedInstanceTaskComputedConstantName: (path: string, index: number, computedConstantIndex: number) => string;
  sedInstanceTaskComputedConstantUnit: (path: string, index: number, computedConstantIndex: number) => string;
  sedInstanceTaskComputedConstant: (path: string, index: number, computedConstantIndex: number) => number[];
  sedInstanceTaskAlgebraicCount: (path: string, index: number) => number;
  sedInstanceTaskAlgebraicName: (path: string, index: number, algebraicIndex: number) => string;
  sedInstanceTaskAlgebraicUnit: (path: string, index: number, algebraicIndex: number) => string;
  sedInstanceTaskAlgebraic: (path: string, index: number, algebraicIndex: number) => number[];

  // Version API.

  version: () => string;
}

export interface IWasmLocApi {
  // Memory management.

  HEAPU8: Uint8Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;

  // FileManager API.

  FileManager: IWasmFileManager;

  // File API.

  File: new (
    path: string
  ) => IWasmFile;

  // SedDocument API

  SedDocument: new (
    wasmFile: IWasmFile
  ) => IWasmSedDocument;
  SedChangeAttribute: new (componentName: string, variableName: string, newValue: string) => IWasmSedChangeAttribute;

  // Version API.

  versionString: () => string;
}

// Retrieve the version of libOpenCOR that is to be used. Two options:
//  - OpenCOR: libOpenCOR can be accessed using window.locApi, which references our C++ API.
//  - OpenCOR's Web app: libOpenCOR can be accessed using our WebAssembly module.

export let _cppLocApi = {} as ICppLocApi;
export let _wasmLocApi = {} as IWasmLocApi;

export async function initialiseLocApi() {
  // @ts-expect-error (window.locApi may or may not be defined which is why we test it)
  if (window.locApi !== undefined) {
    // We are running OpenCOR, so libOpenCOR can be accessed using window.locApi.

    // @ts-expect-error (window.locApi is defined)
    _cppLocApi = window.locApi;
  } else {
    // We are running OpenCOR's Web app, so we must import libOpenCOR's WebAssembly module.

    try {
      const libOpenCOR = (
        await import(
          /* @vite-ignore */ proxyUrl('https://opencor.ws/libopencor/downloads/wasm/libopencor-0.20251027.0.js')
        )
      ).default;

      _wasmLocApi = (await libOpenCOR()) as IWasmLocApi;
    } catch (error) {
      console.error("Failed to load libOpenCOR's WebAssembly module:", error);
    }
  }
}

// Logger API.

export { EIssueType, type IIssue, type IWasmIssues, wasmIssuesToIssues } from './locLoggerApi.js';

// File API.

export { EFileType, File, fileManager, type IWasmFile } from './locFileApi.js';

// SED-ML API.

export {
  ESedSimulationType,
  SedDocument,
  SedInstance,
  SedInstanceTask,
  SedSimulationUniformTimeCourse
} from './locSedApi.js';

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
} from './locUiJsonApi.js';

// Version API.

export { cppVersion, version, wasmVersion } from './locVersionApi.js';
