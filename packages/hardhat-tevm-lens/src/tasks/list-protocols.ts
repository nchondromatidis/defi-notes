import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import path from 'path';
import { Project } from 'ts-morph';
import fs from 'fs';
import createDebug from 'debug';
import { DEBUG_PREFIX } from '../debug.js';
import { glob } from 'glob';

const debug = createDebug(`${DEBUG_PREFIX}:list-protocols`);

function createProtocolsType(values: string[], protocolsTypeFilePath: string) {
  const unique = Array.from(new Set(values)).sort();
  const project = new Project();
  const sourceFile = project.createSourceFile(protocolsTypeFilePath, '', { overwrite: true });

  const unionTypes = unique.length === 0 ? ['never'] : unique.map((v) => `'${v}'`);

  sourceFile.addTypeAlias({
    isExported: true,
    name: 'ProtocolName',
    type: unionTypes.join(' | '),
  });

  const code = sourceFile.getFullText();
  fs.writeFileSync(protocolsTypeFilePath, code);
  debug('Created protocol list types:', protocolsTypeFilePath);
}

export default async function (_taskArgs: Record<string, any>, hre: HardhatRuntimeEnvironment) {
  debug('List protocols task started');

  const artifactsContractPath = hre.config.artifactsAugment.artifactContractsPath;

  const protocolList = await glob('*/', { cwd: artifactsContractPath });
  const protocolsTypeFilePath = path.join(artifactsContractPath, 'protocols-list.d.ts');
  debug('Paths:', { protocolsTypeFilePath });

  createProtocolsType(protocolList, protocolsTypeFilePath);

  debug('List protocols task ended');
}
