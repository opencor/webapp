import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import vuePlugin from '@vitejs/plugin-vue'

import * as electronVite from 'electron-vite'
import path from 'path'
import vitePlugin from 'unplugin-vue-components/vite'

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
        allow: [path.join(import.meta.dirname, '..')]
      }
    }
  }
})
