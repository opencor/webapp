// @ts-check

import eslint from '@eslint/js'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default [
  ...pluginVue.configs['flat/essential'],
  eslint.configs.recommended,
  skipFormatting,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...vueTsEslintConfig(),
  {
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: {
          ts: tseslint.parser
        },
        projectService: {
          allowDefaultProject: ['res/*.js', 'src/renderer/*.js', '*.js']
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,ts,vue}']
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['out/**']
  }
]
