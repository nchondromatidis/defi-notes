import { task } from 'hardhat/config';
import type { HardhatPlugin } from 'hardhat/types/plugins';

import './type-extensions';
import { TaskDefinitionType } from 'hardhat/types/tasks';

const plugin: HardhatPlugin = {
  id: 'hardhat-tevm-lens',
  hookHandlers: {
    config: () => import('./hooks/config'),
  },
  tasks: [
    task('index-functions', 'Creates indexes for all functions.')
      .setAction(() => import('./tasks/index-functions/index'))
      .build(),
    task('add-source', 'Creates source.json in each source containing source code and ast.')
      .setAction(() => import('./tasks/add-source/index'))
      .build(),
    task('list-contracts-per-protocol', 'Creates a list of all contracts per protocol.')
      .setAction(() => import('./tasks/list-contracts-per-protocol/list-contracts-per-protocol'))
      .build(),
    task('list-protocols', 'Creates a list of all protocols.')
      .setAction(() => import('./tasks/list-protocols/list-protocols'))
      .build(),
    task('type-barrel', 'Creates an artifacts index.d.ts for artifacts folder.')
      .setAction(() => import('./tasks/type-barrel/type-barrel'))
      .build(),
    {
      type: TaskDefinitionType.TASK_OVERRIDE,
      id: ['build'],
      description: 'Compile contracts and run post-processing',
      action: () => import('./tasks/compile-override'),
      options: {},
    },
  ],
};

export default plugin;
export { groupSourcesPerProtocol } from './_utils/paths';
