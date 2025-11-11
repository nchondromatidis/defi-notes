import path from 'node:path';
import hre from 'hardhat';

// glob patterns are relative to sourcePath
export const excludeFolders = [
  'uniswap-v2/v2-periphery/contracts/examples/**',
  'uniswap-v2/solidity-lib/contracts/test/**',
];
export const includeFolders = [
  'uniswap-v2/v2-periphery/contracts/**',
  'uniswap-v2/v2-core/contracts/**',
  'uniswap-v2/solidity-lib/contracts/**',
];

export const rootPath = hre.config.paths.root;
export const artifactsPath = hre.config.paths.artifacts;
export const artifactsContractPath = path.join(artifactsPath, 'contracts');
export const artifactsBuildInfoPath = path.join(artifactsPath, 'build-info');
export const libPath = path.join(rootPath, 'lib');
export const sourceContractsPath = path.join(rootPath, 'contracts');
