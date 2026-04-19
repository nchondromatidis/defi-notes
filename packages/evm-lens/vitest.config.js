import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '@protocol-lens/config/vitest.config.js';
import path from 'node:path';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      resolveSnapshotPath: (testPath, snapExtension) => {
        const dir = path.dirname(testPath);
        const filename = path.basename(testPath);
        return path.join(dir, '__snapshots__', filename + snapExtension);
      },
    },
  })
);
