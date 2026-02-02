import { corsProxyUrl, formatError, sha256 } from '../common/common.ts';
import * as locApi from '../libopencor/locApi.ts';

import { electronApi } from './electronApi.ts';

// Some file-related methods.

export function isRemoteFilePath(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://');
}

export function filePath(fileFilePathOrFileContents: string | Uint8Array | File): string {
  return fileFilePathOrFileContents instanceof File
    ? electronApi
      ? electronApi.filePath(fileFilePathOrFileContents)
      : fileFilePathOrFileContents.name
    : typeof fileFilePathOrFileContents === 'string'
      ? fileFilePathOrFileContents
      : sha256(fileFilePathOrFileContents);
}

export function file(fileFilePathOrFileContents: string | Uint8Array | File): Promise<locApi.File> {
  if (typeof fileFilePathOrFileContents === 'string') {
    if (isRemoteFilePath(fileFilePathOrFileContents)) {
      return new Promise((resolve, reject) => {
        // First try fetching the URL through OpenCOR's CORS proxy.

        fetch(corsProxyUrl(fileFilePathOrFileContents))
          .then((response) => {
            if (response.ok) {
              return response.arrayBuffer();
            }

            throw new Error(
              `Failed to fetch the file through OpenCOR's CORS proxy. The server responded with a status of ${String(response.status)}.`
            );
          })
          .catch((error: unknown) => {
            // A network/CORS error is an instance of TypeError in fetch. So, if this is the case then we try fetching
            // the file directly otherwise we re-throw the error.

            if (!(error instanceof TypeError)) {
              throw new Error(formatError(error));
            }

            return fetch(fileFilePathOrFileContents).then((response) => {
              if (response.ok) {
                return response.arrayBuffer();
              }

              throw new Error(
                `Failed to fetch the file directly. The server responded with a status of ${String(response.status)}.`
              );
            });
          })
          .then((arrayBuffer) => {
            const fileContents = new Uint8Array(arrayBuffer);

            resolve(new locApi.File(filePath(fileFilePathOrFileContents), fileContents));
          })
          .catch((error: unknown) => {
            reject(new Error(formatError(error)));
          });
      });
    }

    return new Promise((resolve, reject) => {
      if (electronApi) {
        resolve(new locApi.File(filePath(fileFilePathOrFileContents)));
      } else {
        reject(new Error('Local files cannot be opened.'));
      }
    });
  }

  if (fileFilePathOrFileContents instanceof Uint8Array) {
    return new Promise((resolve) => {
      resolve(new locApi.File(filePath(fileFilePathOrFileContents), fileFilePathOrFileContents));
    });
  }

  return new Promise((resolve, reject) => {
    fileFilePathOrFileContents
      .arrayBuffer()
      .then((arrayBuffer) => {
        const fileContents = new Uint8Array(arrayBuffer);

        resolve(new locApi.File(filePath(fileFilePathOrFileContents), fileContents));
      })
      .catch((error: unknown) => {
        reject(new Error(formatError(error)));
      });
  });
}

// A method to retrieve the simulation data information for a given name from an instance task.

export enum ESimulationDataInfoType {
  UNKNOWN,
  VOI,
  STATE,
  RATE,
  CONSTANT,
  COMPUTED_CONSTANT,
  ALGEBRAIC
}

export interface ISimulationDataInfo {
  type: ESimulationDataInfoType;
  index: number;
}

export function simulationDataInfo(instanceTask: locApi.SedInstanceTask, name: string): ISimulationDataInfo {
  if (!name) {
    return {
      type: ESimulationDataInfoType.UNKNOWN,
      index: -1
    };
  }

  if (name === instanceTask.voiName()) {
    return {
      type: ESimulationDataInfoType.VOI,
      index: -1
    };
  }

  for (let i = 0; i < instanceTask.stateCount(); i++) {
    if (name === instanceTask.stateName(i)) {
      return {
        type: ESimulationDataInfoType.STATE,
        index: i
      };
    }
  }

  for (let i = 0; i < instanceTask.rateCount(); i++) {
    if (name === instanceTask.rateName(i)) {
      return {
        type: ESimulationDataInfoType.RATE,
        index: i
      };
    }
  }

  for (let i = 0; i < instanceTask.constantCount(); i++) {
    if (name === instanceTask.constantName(i)) {
      return {
        type: ESimulationDataInfoType.CONSTANT,
        index: i
      };
    }
  }

  for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
    if (name === instanceTask.computedConstantName(i)) {
      return {
        type: ESimulationDataInfoType.COMPUTED_CONSTANT,
        index: i
      };
    }
  }

  for (let i = 0; i < instanceTask.algebraicVariableCount(); i++) {
    if (name === instanceTask.algebraicVariableName(i)) {
      return {
        type: ESimulationDataInfoType.ALGEBRAIC,
        index: i
      };
    }
  }

  return {
    type: ESimulationDataInfoType.UNKNOWN,
    index: -1
  };
}

// A method to retrieve the simulation data for a given name from an instance task.

export function simulationData(instanceTask: locApi.SedInstanceTask, info: ISimulationDataInfo): Float64Array {
  switch (info.type) {
    case ESimulationDataInfoType.VOI:
      return instanceTask.voi();
    case ESimulationDataInfoType.STATE:
      return instanceTask.state(info.index);
    case ESimulationDataInfoType.RATE:
      return instanceTask.rate(info.index);
    case ESimulationDataInfoType.CONSTANT:
      return instanceTask.constant(info.index);
    case ESimulationDataInfoType.COMPUTED_CONSTANT:
      return instanceTask.computedConstant(info.index);
    case ESimulationDataInfoType.ALGEBRAIC:
      return instanceTask.algebraicVariable(info.index);
    default:
      return [];
  }
}
