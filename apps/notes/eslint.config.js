import config from '@protocol-lens/config/eslint.config.js';
import mdConfig from '@protocol-lens/config/eslint.markdown.config.js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  ...mdConfig,
  {
    ignores: ['.astro'],
  },
];
