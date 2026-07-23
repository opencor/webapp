/// <reference types="node" />

import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import * as electronVite from 'electron-vite';
import * as nodeFs from 'node:fs';
import path from 'node:path';
import { visualizer as visualizerPlugin } from 'rollup-plugin-visualizer';
import vitePlugin from 'unplugin-vue-components/vite';

import { libopencorVersion } from './src/renderer/scripts/libopencor.version';

export default electronVite.defineConfig({
  main: {
    build: {
      rollupOptions: {
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
      __LIBOPENCOR_WASM_BASE_URL__: JSON.stringify(`/libopencor/downloads/wasm/${libopencorVersion}`)
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
      vuePlugin({
        script: {
          fs: {
            fileExists: (file: string) => nodeFs.existsSync(file),
            readFile: (file: string) => nodeFs.readFileSync(file, 'utf-8'),
            realpath: (file: string) => nodeFs.realpathSync(file)
          }
        }
      }),
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
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      },
      proxy: {
        // See src/renderer/src/common/initialisation.ts for the rationale behind this proxy.
        '/libopencor/downloads/wasm': {
          target: 'https://opencor.ws',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
            });
          }
        }
      }
    }
  }
});
