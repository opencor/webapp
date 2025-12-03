import OpenCOR from './src/components/OpenCOR.vue';

export type Theme = 'light' | 'dark' | 'system';

export interface IOpenCORProps {
  omex?: string | Uint8Array;
  theme?: Theme;
}

export { OpenCOR };
export default OpenCOR;
