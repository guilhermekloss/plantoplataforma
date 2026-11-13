/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module' },
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist/', 'node_modules/', '.eslintrc.cjs'],
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off',
  },
};
