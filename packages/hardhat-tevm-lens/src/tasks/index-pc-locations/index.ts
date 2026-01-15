import fs from 'fs';
import path from 'node:path';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../../debug';
import { getBuildInfoPair, getBuildInfoPairsPath } from '../../_utils/build-info';
import type { PcLocationIndex } from './types';
import { fileURLToPath } from 'node:url';
import { groupByPathSegment } from '../../_utils/paths';
import { createIndex } from './processors/sourcemap-processor';

const debug = createDebug(`${DEBUG_PREFIX}:add-source`);

//************************************** COPY TYPES ***************************************//

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyFunctionIndexesTypes(indexFilePath: string) {
  // after compilation in dist folder types inside types.ts go to types.d.ts
  const functionIndexesTypes =
    fs.readFileSync(path.join(__dirname, 'types.ts'), { encoding: 'utf8' }) ??
    fs.readFileSync(path.join(__dirname, 'types.d.ts'), { encoding: 'utf8' });

  fs.writeFileSync(indexFilePath, functionIndexesTypes, {
    encoding: 'utf8',
  });
}

//*************************************** MAIN ***************************************//

export default async function (_taskArgs: Record<string, any>, hre: HardhatRuntimeEnvironment) {
  debug('Add source task started');

  const buildInfoPairPaths = await getBuildInfoPairsPath(hre);
  const pcLocationsIndexes: PcLocationIndex[] = [];

  for (const buildInfoPairPath of buildInfoPairPaths) {
    const buildInfoPair = getBuildInfoPair(buildInfoPairPath);
    const newPcLocationIndexes = createIndex(buildInfoPair, debug);
    pcLocationsIndexes.push(...newPcLocationIndexes);
  }

  const artifactsContractPath = hre.config.artifactsAugment.artifactContractsPath;

  // write file
  const pcLocationsIndexesPerProtocol = groupByPathSegment(pcLocationsIndexes, 'contractFQN', 1);
  for (const [group, files] of Object.entries(pcLocationsIndexesPerProtocol)) {
    const pcLocationIndexPath = path.join(artifactsContractPath, group, 'pc-locations-indexes.json');

    debug('Paths:', { pcLocationIndexPath });
    fs.writeFileSync(pcLocationIndexPath.split(':')[0], JSON.stringify(files), 'utf-8');
  }

  // create types
  const sourceTypePath = path.join(artifactsContractPath, 'source.d.ts');
  copyFunctionIndexesTypes(sourceTypePath);

  debug('Add source task ended');
}
