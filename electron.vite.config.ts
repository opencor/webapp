import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import * as electronVite from 'electron-vite';
import path from 'node:path';
import vitePlugin from 'unplugin-vue-components/vite';
import { visualizer as visualizerPlugin } from 'rollup-plugin-visualizer';

export default electronVite.defineConfig({
  main: {
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    },
    plugins: [electronVite.bytecodePlugin(), electronVite.externalizeDepsPlugin()]
  },
  preload: {
    plugins: [electronVite.externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      target: 'esnext'
    },
    envDir: path.join(import.meta.dirname, 'src/renderer'),
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
    },
    plugins: [
      // Note: this must be in sync with src/renderer/vite.config.ts.

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
