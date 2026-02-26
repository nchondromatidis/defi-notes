import { mergeConfig } from 'vitest/config';
import configShared from '@defi-notes/config/vitest.config.js';
import path from 'node:path';

export default mergeConfig(configShared, {
  resolve: {
    alias: {
      '@': path.resolve('.', 'src'), // Matches baseUrl: "." + "./src/*"
    },
  },
});
