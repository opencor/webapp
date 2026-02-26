import * as vue from 'vue';

import * as common from './common.ts';
import * as dependencies from './dependencies.ts';
import { electronApi } from './electronApi.ts';

import * as locApi from '../libopencor/locApi.ts';

// Our different external dependencies.

type ExternalDependency = {
  name: string;
  url: string;
  set: (module: dependencies.Module) => void;
  cssUrl?: string;
};

const externalDependencies: ExternalDependency[] = [
  {
    name: 'jsonschema',
    url: 'https://cdn.jsdelivr.net/npm/jsonschema@1.5.0/+esm',
    set: (m) => dependencies.setJsonSchema(m)
  },
  {
    name: 'JSZip',
    url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm',
    set: (m) => dependencies.setJsZip(m)
  },
  {
    name: 'Math.js',
    url: 'https://cdn.jsdelivr.net/npm/mathjs@15.1.1/+esm',
    set: (m) => dependencies.setMathJs(m)
  },
  {
    name: 'Plotly.js',
    url: 'https://cdn.jsdelivr.net/npm/plotly.js-gl2d-dist-min@3.4.0/+esm',
    set: (m) => dependencies.setPlotlyJs(m)
  },
  {
    name: 'VueTippy',
    url: 'https://cdn.jsdelivr.net/npm/vue-tippy@6.7.1/+esm',
    set: (m) => dependencies.setVueTippy(m),
    cssUrl: 'https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/dist/tippy.css'
  }
];

// Some variables to keep track of the initialisation progress.
// Note: the 2 initial steps are to import libOpenCOR's WASM and to instantiate it. We then have one or two steps per
//       external dependency, depending on whether it has an associated CSS file or not. Finally, we have one step to
//       initialise xxHash.

const crtNbOfSteps = vue.ref<number>(0);
const totalNbOfSteps =
  (electronApi ? 0 : 2) +
  externalDependencies.reduce((acc, dep) => acc + (dep.url ? 1 : 0) + (dep.cssUrl ? 1 : 0), 0) +
  1;

// Retrieve the version of libOpenCOR that is to be used. Two options:
//  - OpenCOR: libOpenCOR can be accessed using window.locApi, which references our C++ API.
//  - OpenCOR's Web app: libOpenCOR can be accessed using our WebAssembly module.

export const initialiseLocApi = async (): Promise<void> => {
  // @ts-expect-error (window.locApi may or may not be defined which is why we test it)
  if (window.locApi) {
    // We are running OpenCOR, so libOpenCOR can be accessed using window.locApi.

    // @ts-expect-error (window.locApi is defined)
    locApi.setCppLocApi(window.locApi);
  } else {
    // We are running OpenCOR's Web app, so we must import libOpenCOR's WebAssembly module.

    try {
      const libOpenCOR = (
        await import(
          /* @vite-ignore */ common.corsProxyUrl(
            'https://opencor.ws/libopencor/downloads/wasm/libopencor-0.20260226.0.js'
          )
        )
      ).default;

      ++crtNbOfSteps.value;

      locApi.setWasmLocApi(await libOpenCOR());

      ++crtNbOfSteps.value;
    } catch (error: unknown) {
      console.error('Failed to load libOpenCOR:', common.formatError(error));

      throw error;
    }
  }
};

// A method to create a lazy initialiser, which imports an external dependency and optionally its CSS.

const injectedCss = new Set<string>();

const createLazyInitialiser = (
  name: string,
  url: string,
  set: (module: dependencies.Module) => void,
  cssUrl?: string
) => {
  return async (): Promise<void> => {
    try {
      // Import the exteral dependency and set it.

      const module = await import(/* @vite-ignore */ url);

      set((module as dependencies.Module).default ?? module);

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

// A method to handle any error that occurs during initialisation.

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

// Initialise libOpenCOR, our external dependencies, and xxHash.

initialiseLocApi().catch((error: unknown) => {
  initialisationError(error);
});

for (const externalDependency of externalDependencies) {
  createLazyInitialiser(
    externalDependency.name,
    externalDependency.url,
    externalDependency.set,
    externalDependency.cssUrl
  )().catch((error: unknown) => {
    initialisationError(error);
  });
}

dependencies.initialiseXxhash
  .then(() => {
    ++crtNbOfSteps.value;
  })
  .catch((error: unknown) => {
    initialisationError(error);
  });

// Let people know whether initialisation is done and how it's progressing.

export const done = vue.computed<boolean>(() => {
  return progress.value >= 100;
});
export const failed = vue.ref<boolean>(false);
export const issues = vue.ref<locApi.IIssue[]>([]);
export const progress = vue.computed<number>(() => {
  return Math.round((100 * crtNbOfSteps.value) / totalNbOfSteps);
});
