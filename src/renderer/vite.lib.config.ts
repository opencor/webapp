import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import vitePlugin from 'unplugin-vue-components/vite';
import * as vite from 'vite';

export default vite.defineConfig({
  build: {
    lib: {
      entry: './index.ts',
      fileName: (format) => `opencor.${format}.js`,
      formats: ['es'],
      name: 'OpenCOR'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.names.includes('style.css')) {
            return 'dist/opencor.css';
          }

          return assetInfo.names[0] ?? 'default-name';
        }
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
    // Note: this must be in sync with vite.config.ts, except for the process-css-layers plugin which is only needed for
    //       the library build (to prevent styles from leaking into and being overridden by host apps).

    {
      // Plugin to process CSS layers for library distribution:
      //  1. Strip @layer base blocks (Tailwind CSS preflight) to prevent leaking into host apps.
      //  2. Unwrap remaining @layer blocks so that the important: '.opencor' selector strategy provides real
      //     specificity protection against host app CSS. (Layered CSS always loses to unlayered CSS, regardless of
      //     specificity.)
      //  3. Remove bare @layer ordering declarations.

      name: 'process-css-layers',
      enforce: 'post' as const,
      generateBundle(_options, bundle) {
        for (const asset of Object.values(bundle)) {
          if (asset.type === 'asset' && typeof asset.source === 'string' && asset.fileName.endsWith('.css')) {
            // Process @layer blocks: strip base, unwrap others.

            const processLayers = (source: string): string => {
              const layerBlockRegEx = /@layer\s+([\w-]+)\s*\{/g;
              let res = '';
              let pos = 0;

              for (;;) {
                layerBlockRegEx.lastIndex = pos;

                const match = layerBlockRegEx.exec(source);

                if (!match) {
                  res += source.slice(pos);

                  break;
                }

                const layerName = match[1] ?? '';
                const start = match.index;
                const contentStart = start + match[0].length;

                // Scan forward to find the matching closing brace.

                let depth = 1;
                let i = contentStart;

                while (i < source.length && depth > 0) {
                  if (source[i] === '{') {
                    ++depth;
                  } else if (source[i] === '}') {
                    --depth;
                  }

                  ++i;
                }

                const end = i; // One past the closing '}'.

                // Append everything before this @layer block unchanged.

                res += source.slice(pos, start);

                if (layerName !== 'base') {
                  // Unwrap: keep content, remove @layer wrapper.
                  // Note: we recurse so any nested @layer blocks are also processed.

                  res += processLayers(source.slice(contentStart, end - 1));
                }

                // 'base' is stripped entirely (no append).

                pos = end;
              }

              return res;
            };

            let css = processLayers(asset.source);

            // Remove bare @layer ordering declarations (e.g., "@layer base, components;").

            css = css.replace(/@layer\s+[\w\s,-]+;/g, '');

            asset.source = css;
          }
        }
      }
    },
    tailwindcssPlugin(),
    vuePlugin(),
    vitePlugin({
      resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
    })
  ]
});
