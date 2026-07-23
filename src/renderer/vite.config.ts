/// <reference types="vite/client" />

import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import { visualizer as visualizerPlugin } from 'rollup-plugin-visualizer';
import vitePlugin from 'unplugin-vue-components/vite';
import * as vite from 'vite';

import { libopencorVersion } from './scripts/libopencor.version';

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
  define: {
    __LIBOPENCOR_WASM_BASE_URL__: JSON.stringify(`/libopencor-wasm/${libopencorVersion}`)
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
      allow: [fileURLToPath(new URL('../..', import.meta.url))]
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    proxy: {
      // See src/renderer/src/common/initialisation.ts for the rationale behind this proxy.
      '/libopencor-wasm': {
        target: 'https://opencor.ws',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/libopencor-wasm/, '/libopencor/downloads/wasm'),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
          });
        }
      }
    }
  }
});
