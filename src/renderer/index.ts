import OpenCOR from './src/components/OpenCOR.vue';

export type Theme = 'light' | 'dark' | 'system';

export interface IOpenCORProps {
  omex?: string;
  theme?: Theme;
}

export { OpenCOR };
export default OpenCOR;
