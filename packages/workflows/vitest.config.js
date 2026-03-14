import configShared from '@defi-notes/config/vitest.config.js';

export default {
  ...configShared,
  test: {
    ...configShared.test,
    root: './',
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    setupFiles: [],
  },
};
