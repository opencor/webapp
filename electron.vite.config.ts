import vue from '@vitejs/plugin-vue'
import { defineConfig, bytecodePlugin, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [bytecodePlugin(), externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [vue()]
  }
})
