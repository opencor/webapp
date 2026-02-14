import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import path from 'node:path';
import vitePlugin from 'unplugin-vue-components/vite';
import { visualizer as visualizerPlugin } from 'rollup-plugin-visualizer';
import * as vite from 'vite';

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
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  plugins: [
    // Note: this must be in sync with electron.vite.config.ts.

    tailwindcssPlugin(),
    vuePlugin(),
    vitePlugin({
      resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
    }),
    // Plugin: strip legacy font files (eot, svg) from the production bundle.
    // We keep woff2/woff/ttf but remove eot/svg to reduce bundle size.
    {
      name: 'strip-primeicons-legacy-fonts',
      generateBundle(_options, bundle) {
        for (const fileName of Object.keys(bundle)) {
          if (
            fileName.endsWith('assets/primeicons.eot') ||
            fileName.endsWith('assets/primeicons.svg') ||
            fileName.endsWith('assets/primeicons.ttf') ||
            fileName.endsWith('assets/primeicons.woff')
          ) {
            delete bundle[fileName];
          }
        }
      }
    },
    visualizerPlugin({
      filename: 'dist/stats.html',
      gzipSize: true
    })
  ],
  server: {
    fs: {
      allow: [path.join(import.meta.dirname, '../..')]
    }
  }
});
