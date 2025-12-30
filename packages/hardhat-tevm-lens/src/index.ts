import { task } from 'hardhat/config';
import type { HardhatPlugin } from 'hardhat/types/plugins';

import './type-extensions.ts';
import { TaskDefinitionType } from 'hardhat/types/tasks';

const plugin: HardhatPlugin = {
  id: 'hardhat-tevm-lens',
  hookHandlers: {
    config: () => import('./hooks/config.ts'),
  },
  tasks: [
    task('index-functions', 'Creates indexes for all functions.')
      .setAction(() => import('./tasks/index-functions/index.ts'))
      .build(),
    task('index-callsites', 'Creates indexes for function calls.')
      .setAction(() => import('./tasks/index-callsites/index.ts'))
      .build(),
    task('list-contracts-per-protocol', 'Creates a list of all contracts per protocol.')
      .setAction(() => import('./tasks/list-contracts-per-protocol/list-contracts-per-protocol.ts'))
      .build(),
    task('list-protocols', 'Creates a list of all protocols.')
      .setAction(() => import('./tasks/list-protocols/list-protocols.ts'))
      .build(),
    task('type-barrel', 'Creates an artifacts index.d.ts for artifacts folder.')
      .setAction(() => import('./tasks/type-barrel/type-barrel.ts'))
      .build(),
    {
      type: TaskDefinitionType.TASK_OVERRIDE,
      id: ['build'],
      description: 'Compile contracts and run post-processing',
      action: () => import('./tasks/compile-override.ts'),
      options: {},
    },
  ],
};

export default plugin;
export { groupSourcesPerProtocol } from './_utils/paths';
