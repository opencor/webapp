import autoprefixer from 'autoprefixer';
import tailwindcss from '@tailwindcss/postcss';
import postcssScopePlugin from './scripts/postcss-scope-plugin.js';

// Only apply scoping in library build mode, not in dev/Web mode.

const isLibraryBuild = process.env.npm_lifecycle_event === 'build:lib';

export default {
  plugins: [
    autoprefixer,
    tailwindcss,
    ...(isLibraryBuild
      ? [
          postcssScopePlugin({
            scopeSelector: '.opencor-scoped-styles'
          })
        ]
      : [])
  ]
};
