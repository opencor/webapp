import * as vue from 'vue';

import * as common from './common.ts';
import * as dependencies from './dependencies.ts';
import { electronApi } from './electronApi.ts';

import * as locApi from '../libopencor/locApi.ts';

// libOpenCOR.

const LIBOPENCOR = 'libOpenCOR';

// URLs for libOpenCOR and our external dependencies.

const LIBOPENCOR_WASM = 'https://unpkg.com/@opencor/libopencor@0.20260211.0/dist/libopencor.js';
const JSONSCHEMA_ESM = 'https://cdn.jsdelivr.net/npm/jsonschema@1.5.0/+esm';
const JSZIP_ESM = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';
const MATHJS_ESM = 'https://cdn.jsdelivr.net/npm/mathjs@15.1.1/+esm';
const PLOTLYJS_ESM = 'https://cdn.jsdelivr.net/npm/plotly.js-gl2d-dist-min@3.4.0/+esm';
const VUETIPPY_ESM = 'https://cdn.jsdelivr.net/npm/vue-tippy@6.7.1/+esm';
const TIPPY_CSS = 'https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/dist/tippy.css';

// descriptors for each lazily‑loaded external script; used both for loading and
// for computing expected initialisation counts.

type ExternalDependency = {
  name: string;
  url: string;
  assign: (module: dependencies.Module) => void;
  cssUrl?: string;
};

const externalDependencies: ExternalDependency[] = [
  {
    name: 'jsonschema',
    url: JSONSCHEMA_ESM,
    assign: (m) => dependencies.setJsonSchema(m)
  },
  {
    name: 'JSZip',
    url: JSZIP_ESM,
    assign: (m) => dependencies.setJsZip(m)
  },
  {
    name: 'Math.js',
    url: MATHJS_ESM,
    assign: (m) => dependencies.setMathJs(m)
  },
  {
    name: 'Plotly.js',
    url: PLOTLYJS_ESM,
    assign: (m) => dependencies.setPlotlyJs(m)
  },
  {
    name: 'VueTippy',
    url: VUETIPPY_ESM,
    assign: (m) => dependencies.setVueTippy(m),
    cssUrl: TIPPY_CSS
  }
];

// Retrieve the sizes of OpenCOR's external dependencies.

const expectedNbOfDependencySizes = 6 + (electronApi ? 0 : 1);
const dependencySizes = vue.reactive(new Map<string, number>());
const compTotalDependenciesSize = vue.computed(() => {
  return [...dependencySizes.values()].reduce((accumulator, currentValue) => accumulator + currentValue, 0);
});

const addDependencySize = async (url: string): Promise<void> => {
  const size = await common.remoteFileSize(url);

  dependencySizes.set(url, size);
};

if (!electronApi) {
  addDependencySize(LIBOPENCOR_WASM);
}

addDependencySize(JSONSCHEMA_ESM);
addDependencySize(JSZIP_ESM);
addDependencySize(MATHJS_ESM);
addDependencySize(PLOTLYJS_ESM);
addDependencySize(VUETIPPY_ESM);
addDependencySize(TIPPY_CSS);

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
      const data = await common.downloadRemoteFile(LIBOPENCOR_WASM, (percent: number) => {
        initialiseLocApiProgress.value = percent;
      });

      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      try {
        const module = await import(/* @vite-ignore */ url);
        const libOpenCOR = module.default as () => Promise<locApi.IWasmLocApi>;
        const loc = await libOpenCOR();

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

      // Fetch any CSS for the module and inject it into the page if we haven't already done so.

      if (cssUrl && !injectedCss.has(cssUrl)) {
        const response = await fetch(/* @vite-ignore */ cssUrl, { mode: 'cors' });

        if (!response.ok) {
          throw new Error(`Failed to load ${name ?? 'stylesheet'}: ${response.statusText}`);
        }

        const style = document.createElement('style');

        style.textContent = await response.text();

        document.head.appendChild(style);

        injectedCss.add(cssUrl);
      }
    } catch (error: unknown) {
      console.error(`Failed to import ${name ?? url}:`, common.formatError(error));

      throw error;
    }
  };
};

// Initialise OpenCOR's external dependencies, but only once all of their sizes have been retrieved.

const expectedNbOfInitialisedDependencies = 1 + externalDependencies.length; // libOpenCOR + each lazily‑loaded external dependency.
const initialisedDependencies = vue.reactive(new Set<string>());

vue.watch(
  () => dependencySizes.size,
  (newSize: number) => {
    if (newSize !== expectedNbOfDependencySizes) {
      return;
    }

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

    // libOpenCOR.

    initialiseLocApi()
      .then(() => {
        initialisedDependencies.add(LIBOPENCOR);
      })
      .catch((error: unknown) => {
        initialisationError(error);
      });

    // External dependencies.

    for (const externalDependency of externalDependencies) {
      createLazyInitialiser(
        externalDependency.name,
        externalDependency.url,
        externalDependency.assign,
        externalDependency.cssUrl
      )()
        .then(() => {
          initialisedDependencies.add(externalDependency.name);
        })
        .catch((error: unknown) => {
          initialisationError(error);
        });
    }
  }
);

// Let people know whether initialisation is done and how it's progressing.

export const done = vue.computed(() => {
  return initialisedDependencies.size === expectedNbOfInitialisedDependencies;
});
export const failed = vue.ref<boolean>(false);
export const issues = vue.ref<locApi.IIssue[]>([]);
export const progress = vue.computed(() => {
  if (dependencySizes.size !== expectedNbOfDependencySizes) {
    return 0;
  }

  let crtDependenciesSize = 0;
  const libOpenCorWasmSize = dependencySizes.get(LIBOPENCOR_WASM) ?? 0;

  if (initialisedDependencies.has(LIBOPENCOR)) {
    crtDependenciesSize += libOpenCorWasmSize;
  } else {
    crtDependenciesSize += 0.01 * initialiseLocApiProgress.value * libOpenCorWasmSize;
  }

  for (const externalDependency of externalDependencies) {
    if (initialisedDependencies.has(externalDependency.name)) {
      crtDependenciesSize += dependencySizes.get(externalDependency.url) ?? 0;

      if (externalDependency.cssUrl) {
        crtDependenciesSize += dependencySizes.get(externalDependency.cssUrl) ?? 0;
      }
    }
  }

  return Math.round((100 * crtDependenciesSize) / compTotalDependenciesSize.value);
});
