import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import vuePlugin from '@vitejs/plugin-vue'

import path from 'path'
import vitePlugin from 'unplugin-vue-components/vite'
import * as vite from 'vite'

export default vite.defineConfig({
  base: './',
  build: {
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
