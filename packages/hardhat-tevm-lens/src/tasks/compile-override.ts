import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

export default async function (
  taskArguments: Record<string, any>,
  hre: HardhatRuntimeEnvironment,
  runSuper: (taskArguments: Record<string, any>) => Promise<any>
) {
  await runSuper(taskArguments);

  if (hre.config.artifactsAugment.runOnBuild) {
    await hre.tasks.getTask('index-functions').run();
    await hre.tasks.getTask('add-source').run();
    await hre.tasks.getTask('list-contracts-per-protocol').run();
    await hre.tasks.getTask('list-protocols').run();
    await hre.tasks.getTask('type-barrel').run();
  }
}
