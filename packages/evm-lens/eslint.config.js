import config from '@protocol-lens/config/eslint.config.web.js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ignores: ['dist/', 'test/_setup/artifacts'],
  },
];
