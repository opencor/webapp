import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import path from 'node:path';
import vitePlugin from 'unplugin-vue-components/vite';
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
  define: {
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    ),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
    'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.VITE_FIREBASE_MEASUREMENT_ID)
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
});
