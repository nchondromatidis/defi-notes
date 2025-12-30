import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import { debug } from './_debug';
import { getBuildInfoPair, getBuildInfoPairsPath } from '../../_utils/build-info';
import type { CallSiteIndex } from './types';
import { createCallSiteIndexes } from './index-callsites';
import path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import { groupSourcesPerProtocol } from '../../_utils/paths';
import type { FunctionIndexes } from '../index-functions/types';
import { getSharedState } from '../tasks-shared-state';

//*************************************** TYPES ***************************************//

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyFunctionIndexesTypes(destinationPath: string) {
  // after compilation in dist folder types inside types.ts go to types.d.ts
  const functionIndexesTypes =
    fs.readFileSync(path.join(__dirname, 'types.ts'), { encoding: 'utf8' }) ??
    fs.readFileSync(path.join(__dirname, 'types.d.ts'), { encoding: 'utf8' });

  fs.writeFileSync(destinationPath, functionIndexesTypes, {
    encoding: 'utf8',
  });
}

//*************************************** MAIN ***************************************//

export default async function (_taskArgs: Record<string, any>, hre: HardhatRuntimeEnvironment) {
  debug('Index opcodes task started');

  // args
  const functionIndexes = getSharedState().functionIndexes;
  if (!functionIndexes) throw new Error('functionIndexes missing');

  // create jump indexes
  const buildInfoPairPaths = await getBuildInfoPairsPath(hre);
  const jumpIndexes: Array<CallSiteIndex> = [];
  for (const buildInfoPairPath of buildInfoPairPaths) {
    const buildInfoPair = getBuildInfoPair(buildInfoPairPath);
    const buildInfoOpcodeIndexes = await createCallSiteIndexes(buildInfoPair, functionIndexes);
    jumpIndexes.push(...buildInfoOpcodeIndexes);
  }

  // write files
  const artifactsContractPath = hre.config.artifactsAugment.artifactContractsPath;
  const jumpIndexesPerProtocol = groupSourcesPerProtocol(jumpIndexes);
  for (const [protocol, indexes] of Object.entries(jumpIndexesPerProtocol)) {
    const indexPath = path.join(artifactsContractPath, protocol, 'callsite-indexes.json');
    debug('Index path:', { indexPath });
    fs.writeFileSync(indexPath, JSON.stringify(indexes, null, 2), 'utf-8');
  }

  // write indexes
  const destinationPath = path.join(artifactsContractPath, 'callsite-indexes.d.ts');
  debug('Index types path:', { destinationPath });

  copyFunctionIndexesTypes(destinationPath);

  debug('Index opcodes task ended');
}
