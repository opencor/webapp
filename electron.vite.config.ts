import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import vue from '@vitejs/plugin-vue'
import { defineConfig, bytecodePlugin, externalizeDepsPlugin } from 'electron-vite'
import { join } from 'path'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    },
    plugins: [bytecodePlugin(), externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    },
    plugins: [
      vue(),
      Components({
        resolvers: [PrimeVueResolver()]
      })
    ],
    server: {
      fs: {
        allow: [join(__dirname, '..')]
      }
    }
  }
})
