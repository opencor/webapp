import { join } from 'path'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
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
      allow: [join(__dirname, '../..')]
    }
  }
})
