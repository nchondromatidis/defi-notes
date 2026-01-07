import fs from 'fs';
import path from 'node:path';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../../debug';
import { getBuildInfoPair, getBuildInfoPairsPath } from '../../_utils/build-info';
import { toUserSource } from '../../_utils/hardhat';

const debug = createDebug(`${DEBUG_PREFIX}:add-source`);

export default async function (_taskArgs: Record<string, any>, hre: HardhatRuntimeEnvironment) {
  debug('Add source task started');

  const artifactsPath = hre.config.paths.artifacts;
  const buildInfoPairPaths = await getBuildInfoPairsPath(hre);

  for (const buildInfoPairPath of buildInfoPairPaths) {
    const buildInfoPair = getBuildInfoPair(buildInfoPairPath);
    const inputSources = buildInfoPair.buildInfoInput.input.sources;
    const outputSources = buildInfoPair.buildInfoOutput.output.sources;

    for (const [sourcePath, sourceData] of Object.entries(inputSources)) {
      if (!sourceData.content) {
        debug('Skipping source without inline content', { sourcePath });
        continue;
      }

      const userSourcePath = toUserSource(sourcePath);
      const destinationPath = path.join(artifactsPath, userSourcePath, 'source.json');
      const destinationDir = path.dirname(destinationPath);
      fs.mkdirSync(destinationDir, { recursive: true });

      const sourceContents: { source: string; ast: any } = {
        source: sourceData.content,
        ast: undefined,
      };

      const ast = outputSources?.[sourcePath]?.ast;
      if (ast) {
        sourceContents.ast = ast;
      } else {
        debug('Skipping source without AST', { sourcePath });
      }

      debug('Writing source file', { destinationPath });
      fs.writeFileSync(destinationPath, JSON.stringify(sourceContents, null, 2), 'utf-8');
    }
  }

  debug('Add source task ended');
}
