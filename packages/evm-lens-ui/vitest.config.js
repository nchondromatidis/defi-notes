import configShared from '@defi-notes/config/vitest.config.js';
import path from 'node:path';

const __dirname = import.meta.dirname;

export default {
  ...configShared,
  test: {
    ...configShared.test,
    root: './',
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
};
