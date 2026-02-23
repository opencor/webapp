import * as vue from 'vue';

import * as common from './common.ts';
import * as dependencies from './dependencies.ts';
import { electronApi } from './electronApi.ts';

import * as locApi from '../libopencor/locApi.ts';

// Our different external dependencies.

type ExternalDependency = {
  name: string;
  url: string;
  assign: (module: dependencies.Module) => void;
  cssUrl?: string;
};

const externalDependencies: ExternalDependency[] = [
  {
    name: 'jsonschema',
    url: 'https://cdn.jsdelivr.net/npm/jsonschema@1.5.0/+esm',
    assign: (m) => dependencies.setJsonSchema(m)
  },
  {
    name: 'JSZip',
    url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm',
    assign: (m) => dependencies.setJsZip(m)
  },
  {
    name: 'Math.js',
    url: 'https://cdn.jsdelivr.net/npm/mathjs@15.1.1/+esm',
    assign: (m) => dependencies.setMathJs(m)
  },
  {
    name: 'Plotly.js',
    url: 'https://cdn.jsdelivr.net/npm/plotly.js-gl2d-dist-min@3.4.0/+esm',
    assign: (m) => dependencies.setPlotlyJs(m)
  },
  {
    name: 'VueTippy',
    url: 'https://cdn.jsdelivr.net/npm/vue-tippy@6.7.1/+esm',
    assign: (m) => dependencies.setVueTippy(m),
    cssUrl: 'https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/dist/tippy.css'
  }
];

// Some variables to keep track of the initialisation progress.
// Note: the 3 initial steps are to download libOpenCOR's WASM, import it, and then instantiate it. Then, we have one
//       step per external dependency, except VueTippy which has two steps (one for the JS and one for the CSS).

const crtNbOfSteps = vue.ref<number>(0);
const totalNbOfSteps = electronApi
  ? 0
  : 3 + externalDependencies.reduce((acc, dep) => acc + (dep.url ? 1 : 0) + (dep.cssUrl ? 1 : 0), 0);

// Retrieve the version of libOpenCOR that is to be used. Two options:
//  - OpenCOR: libOpenCOR can be accessed using window.locApi, which references our C++ API.
//  - OpenCOR's Web app: libOpenCOR can be accessed using our WebAssembly module.

const initialiseLocApiProgress = vue.ref<number>(0);

export const initialiseLocApi = async (): Promise<void> => {
  // @ts-expect-error (window.locApi may or may not be defined which is why we test it)
  if (window.locApi) {
    // We are running OpenCOR, so libOpenCOR can be accessed using window.locApi.

    // @ts-expect-error (window.locApi is defined)
    locApi.setCppLocApi(window.locApi);
  } else {
    // We are running OpenCOR's Web app, so we must import libOpenCOR's WebAssembly module.

    try {
      const data = await common.downloadRemoteFile(
        'https://unpkg.com/@opencor/libopencor@0.20260211.0/dist/libopencor.js',
        (percent: number) => {
          initialiseLocApiProgress.value = percent;
        }
      );

      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      try {
        const module = await import(/* @vite-ignore */ url);

        ++crtNbOfSteps.value;

        const libOpenCOR = module.default as () => Promise<locApi.IWasmLocApi>;
        const loc = await libOpenCOR();

        ++crtNbOfSteps.value;

        locApi.setWasmLocApi(loc);
      } catch (error: unknown) {
        console.error('Failed to load libOpenCOR:', common.formatError(error));

        throw error;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error: unknown) {
      console.error('Failed to download libOpenCOR:', common.formatError(error));

      throw error;
    }
  }
};

// A method to create a lazy initialiser for a module, which imports the module and optionally its CSS.

const injectedCss = new Set<string>();

const createLazyInitialiser = (
  name: string,
  url: string,
  assign: (module: dependencies.Module) => void,
  cssUrl?: string
) => {
  return async (): Promise<void> => {
    try {
      const module = await import(/* @vite-ignore */ url);

      assign((module as dependencies.Module).default ?? module);

      ++crtNbOfSteps.value;

      // Fetch any CSS for the module and inject it into the page if we haven't already done so.

      if (cssUrl) {
        if (!injectedCss.has(cssUrl)) {
          const response = await fetch(/* @vite-ignore */ cssUrl, { mode: 'cors' });

          if (!response.ok) {
            throw new Error(`Failed to load ${name ?? 'stylesheet'}: ${response.statusText}`);
          }

          const style = document.createElement('style');

          style.textContent = await response.text();

          document.head.appendChild(style);

          injectedCss.add(cssUrl);
        }

        ++crtNbOfSteps.value;
      }
    } catch (error: unknown) {
      console.error(`Failed to import ${name ?? url}:`, common.formatError(error));

      throw error;
    }
  };
};

// Initialise libOpenCOR and then our external dependencies.

const initialisationError = (error: unknown): void => {
  if (!issues.value.length) {
    issues.value.push({
      type: locApi.EIssueType.INFORMATION,
      description: 'An error occurred while initialising OpenCOR. Please check your setup and reload the page.'
    });
  }

  issues.value.splice(Math.max(0, issues.value.length - 1), 0, {
    type: locApi.EIssueType.ERROR,
    description: common.formatMessage(common.formatError(error))
  });

  failed.value = true;
};

initialiseLocApi().catch((error: unknown) => {
  initialisationError(error);
});

for (const externalDependency of externalDependencies) {
  createLazyInitialiser(
    externalDependency.name,
    externalDependency.url,
    externalDependency.assign,
    externalDependency.cssUrl
  )().catch((error: unknown) => {
    initialisationError(error);
  });
}

// Let people know whether initialisation is done and how it's progressing.

export const done = vue.computed(() => {
  return progress.value >= 100;
});
export const failed = vue.ref<boolean>(false);
export const issues = vue.ref<locApi.IIssue[]>([]);
export const progress = vue.computed(() => {
  return Math.round((100 * (crtNbOfSteps.value + 0.01 * initialiseLocApiProgress.value)) / totalNbOfSteps);
});
