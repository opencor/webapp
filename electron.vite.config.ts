/// <reference types="node" />

import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import * as electronVite from 'electron-vite';
import * as fs from 'node:fs';
import path from 'node:path';
import vitePlugin from 'unplugin-vue-components/vite';

import { libopencorVersion, opencorVersion } from './src/renderer/scripts/libopencor.version';
import { stripPrimeIconsFontFacePlugin } from './src/renderer/scripts/primeicons.plugin';

export default electronVite.defineConfig({
  main: {
    build: {
      rolldownOptions: {
        output: {
          format: 'cjs'
        }
      }
    },
    ssr: {
      external: ['electron']
    }
  },
  preload: {},
  renderer: {
    build: {
      target: 'esnext'
    },
    define: {
      __LIBOPENCOR_VERSION__: JSON.stringify(libopencorVersion),
      __OPENCOR_VERSION__: JSON.stringify(opencorVersion)
    },
    envDir: path.join(import.meta.dirname, 'src/renderer'),
    plugins: [
      // Note: this must be in sync with src/renderer/vite.config.ts.

      tailwindcssPlugin(),
      stripPrimeIconsFontFacePlugin(),
      vuePlugin({
        script: {
          fs: {
            fileExists: (file: string) => fs.existsSync(file),
            readFile: (file: string) => fs.readFileSync(file, 'utf-8'),
            realpath: (file: string) => fs.realpathSync(file)
          }
        }
      }),
      vitePlugin({
        resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
      })
    ],
    publicDir: false,
    // Note: our renderer's public folder only contains libOpenCOR's glue (see downloadLibopencorJsIfNeeded()), which
    //       is only needed by our Web app (OpenCOR uses our C++ API, see initialiseLocApi()), so there is no need to
    //       ship it.
    server: {
      fs: {
        allow: [path.join(import.meta.dirname, '..')]
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      }
    }
  }
});
