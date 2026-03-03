export type Theme = 'light' | 'dark' | 'system';

export interface IOpenCORProps {
  omex?: string | Uint8Array;
  theme?: Theme;
}

export { default, default as OpenCOR } from './src/components/OpenCOR.vue';
