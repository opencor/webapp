/// <reference types="node" />

import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import * as electronVite from 'electron-vite';
import path from 'node:path';
import vitePlugin from 'unplugin-vue-components/vite';
import { visualizer as visualizerPlugin } from 'rollup-plugin-visualizer';

import { libopencorVersion } from './src/renderer/scripts/libopencor.version';

export default electronVite.defineConfig({
  main: {
    build: {
      bytecode: true,
      externalizeDeps: true,
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    }
  },
  preload: {
    build: {
      bytecode: true,
      externalizeDeps: true
    }
  },
  renderer: {
    build: {
      target: 'esnext'
    },
    define: {
      __LIBOPENCOR_VERSION__: JSON.stringify(libopencorVersion)
    },
    envDir: path.join(import.meta.dirname, 'src/renderer'),
    plugins: [
      // Note: this must be in sync with src/renderer/vite.config.ts.

      {
        // Plugin to strip unneeded PrimeIcons files.

        name: 'strip-unneeded-primeicons-files',
        generateBundle(_options, bundle) {
          for (const fileName of Object.keys(bundle)) {
            if (fileName.includes('assets/primeicons') && /\.(eot|svg|ttf|woff)$/.test(fileName)) {
              delete bundle[fileName];
            }
          }
        }
      },
      tailwindcssPlugin(),
      vuePlugin(),
      vitePlugin({
        resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
      }),
      visualizerPlugin({
        filename: 'dist/stats.html',
        gzipSize: true
      })
    ],
    server: {
      fs: {
        allow: [path.join(import.meta.dirname, '..')]
      }
    }
  }
});
