declare module 'crypto-js/sha256' {
  import type { WordArray } from 'crypto-js';

  function SHA256(message: string | WordArray): WordArray;

  export default SHA256;
}

declare module 'libopencor' {
  const libOpenCOR: () => Promise<unknown>;

  export default libOpenCOR;
}

declare module 'plotly.js-gl2d-dist-min' {
  export default Plotly;
}
