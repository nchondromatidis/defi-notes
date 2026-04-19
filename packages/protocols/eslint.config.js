import config from '@protocol-lens/config/eslint.config.js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ignores: ['dist/', 'lib/', 'contracts/', 'artifacts'],
  },
];
