import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import vue from '@vitejs/plugin-vue'
import { defineConfig, bytecodePlugin, externalizeDepsPlugin } from 'electron-vite'
import { join } from 'path'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
  main: {
    plugins: [bytecodePlugin(), externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
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
