export type OpenCORTheme = 'light' | 'dark' | 'system';

export interface IOpenCORProps {
  omex?: string | Uint8Array;
  theme?: OpenCORTheme;
}

export interface IOpenCORExpose {
  trackSimulationData: (modelParameters: string[]) => void;
  untrackSimulationData: (modelParameters: string[]) => void;
  untrackAllSimulationData: () => void;
}

export interface IOpenCOREmits extends /* @vue-ignore */ Record<string, unknown[]> {
  simulationData: [IOpenCORSimulationDataEvent];
}

export interface IOpenCORSimulationDataValue {
  data: Float64Array;
  unit: string;
}

export type OpenCORSimulationData = Record<string, IOpenCORSimulationDataValue>;

export interface IOpenCORSimulationDataEvent {
  simulationData: OpenCORSimulationData;
  issues: string[];
}

export { default, default as OpenCOR } from './src/components/OpenCOR.vue';
