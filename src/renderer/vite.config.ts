import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import tailwindcssPlugin from '@tailwindcss/vite'
import vuePlugin from '@vitejs/plugin-vue'

import path from 'path'
import vitePlugin from 'unplugin-vue-components/vite'
import * as vite from 'vite'

export default vite.defineConfig({
  base: './',
  build: {
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
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
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
    })
  ],
  server: {
    fs: {
      allow: [path.join(import.meta.dirname, '../..')]
    }
  }
})
