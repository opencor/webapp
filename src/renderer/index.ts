export type OpenCORTheme = 'light' | 'dark' | 'system';

export interface IOpenCORProps {
  omex?: string | Uint8Array;
  theme?: OpenCORTheme;
}

export { default, default as OpenCOR } from './src/components/OpenCOR.vue';
