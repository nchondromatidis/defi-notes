import fs from 'fs';
import path from 'node:path';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import { fileURLToPath } from 'node:url';
import type { FunctionIndexes } from './types';
import { getBuildInfoPair, getBuildInfoPairsPath } from '../../_utils/build-info';
import { debug } from './_debug';
import { groupByPathSegment } from '../../_utils/paths';
import { getSharedState, setSharedState } from '../tasks-shared-state';
import { createFunctionDataIndexes } from './processors/ast-processor';

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
  debug('Index functions task started');

  const artifactsContractPath = hre.config.artifactsAugment.artifactContractsPath;
  const buildInfoPairPaths = await getBuildInfoPairsPath(hre);

  const functionIndexes: FunctionIndexes = [];

  for (const buildInfoPairPath of buildInfoPairPaths) {
    const buildInfoPair = getBuildInfoPair(buildInfoPairPath);
    createFunctionDataIndexes(buildInfoPair, functionIndexes, debug);
  }

  const protocolFunctionEntryIndexes = groupByPathSegment(functionIndexes, 'source', 1);

  for (const [protocol, sourceFunctionIndexes] of Object.entries(protocolFunctionEntryIndexes)) {
    const protocolSourceFunctionIndexesPath = path.join(artifactsContractPath, protocol, 'function-indexes.json');
    debug('Paths:', { protocolSourceFunctionIndexesPath });
    fs.writeFileSync(protocolSourceFunctionIndexesPath, JSON.stringify(sourceFunctionIndexes, null, 2), 'utf-8');
  }
  const functionIndexesTypesPath = path.join(artifactsContractPath, 'function-indexes.d.ts');
  debug('Paths:', { functionIndexesTypesPath });

  copyFunctionIndexesTypes(functionIndexesTypesPath);

  const tasksSharedState = getSharedState();
  tasksSharedState.functionIndexes = functionIndexes;
  setSharedState(tasksSharedState);

  debug('Index functions task ended');
}
