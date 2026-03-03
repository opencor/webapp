export type OpenCORTheme = 'light' | 'dark' | 'system';

export interface IOpenCORProps {
  omex?: string | Uint8Array;
  theme?: OpenCORTheme;
}

export type OpenCORSimulationData = Record<string, Float64Array | undefined>;

export interface IOpenCORSimulationData {
  simulationData: OpenCORSimulationData;
  issues: string[];
}

export { default, default as OpenCOR } from './src/components/OpenCOR.vue';
