/// <reference types="vite/client" />

import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { visualizer as visualizerPlugin } from 'rollup-plugin-visualizer';
import vitePlugin from 'unplugin-vue-components/vite';
import * as vite from 'vite';

import { downloadLibopencorJsIfNeeded } from './scripts/download.libopencor.js';
import { libopencorVersion } from './scripts/libopencor.version';

await downloadLibopencorJsIfNeeded(path.join(import.meta.dirname, 'public', 'libopencor', 'wasm', libopencorVersion));

export default vite.defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    },
    target: 'esnext'
  },
  publicDir: path.join(import.meta.dirname, 'public'),
  define: {
    __LIBOPENCOR_WASM_BASE_URL__: JSON.stringify(`./libopencor/wasm/${libopencorVersion}`),
    __LIBOPENCOR_WASM_VERSION__: JSON.stringify(libopencorVersion)
  },
  plugins: [
    // Note: this must be in sync with electron.vite.config.ts.

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
    }),
    ...(process.env.STATS === 'true'
      ? [
          visualizerPlugin({
            filename: 'dist/stats.html',
            gzipSize: true
          })
        ]
      : [])
  ],
  server: {
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))]
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
