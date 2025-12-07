/**
 * Note: this must be in sync with stylelint.config.mjs.
 */

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'import-notation': 'string',
    'value-keyword-case': ['lower', { camelCaseSvgKeywords: true }]
  }
};
