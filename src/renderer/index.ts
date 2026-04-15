export type OpenCORTheme = 'light' | 'dark' | 'system';

export interface IOpenCORProps {
  omex?: string | Uint8Array;
  theme?: OpenCORTheme;
}

export interface IOpenCORExpose {
  addExternalData: (csv: string, voiExpression: string | undefined, modelParameters: string[]) => void;
  trackSimulationData: (modelParameters: string[]) => void;
  untrackSimulationData: (modelParameters: string[]) => void;
  untrackAllSimulationData: () => void;
}

export interface IOpenCOREmits extends /* @vue-ignore */ Record<string, unknown[]> {
  externalData: [IOpenCORExternalDataEvent];
  simulationData: [IOpenCORSimulationDataEvent];
}

export interface IOpenCORSimulationDataValue {
  data: Float64Array;
  unit: string;
}

export type OpenCORExternalDataEventType = 'added' | 'issue';

export interface IOpenCORExternalDataEvent {
  type: OpenCORExternalDataEventType;
  csv: string;
  issues: string[];
}

export type OpenCORSimulationDataEventType = 'updated' | 'issue';
export type OpenCORSimulationData = Record<string, IOpenCORSimulationDataValue>;

export interface IOpenCORSimulationDataEvent {
  type: OpenCORSimulationDataEventType;
  simulationData: OpenCORSimulationData;
  issues: string[];
}

export { default, default as OpenCOR } from './src/components/OpenCOR.vue';
