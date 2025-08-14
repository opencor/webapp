// @ts-check

import eslintJs from '@eslint/js'
import vueEslintConfigPrettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import * as vueEslintConfigTypescript from '@vue/eslint-config-typescript'

import eslintPluginVue from 'eslint-plugin-vue'
import tsEslint from 'typescript-eslint'
import vueEslintParser from 'vue-eslint-parser'

export default vueEslintConfigTypescript.defineConfigWithVueTs(
  ...eslintPluginVue.configs['flat/essential'],
  eslintJs.configs.recommended,
  vueEslintConfigPrettierSkipFormatting,
  ...tsEslint.configs.strictTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  vueEslintConfigTypescript.vueTsConfigs.recommended,
  {
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: {
        parser: {
          js: tsEslint.parser,
          ts: tsEslint.parser
        },
        projectService: {
          allowDefaultProject: [
            'src/renderer/index.d.ts',
            'src/renderer/scripts/*.js',
            'src/main/assets/*.js',
            'src/renderer/*.js',
            '*.js'
          ]
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
)
