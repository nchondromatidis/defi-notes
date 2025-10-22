import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export const artifactsPath = path.join(__dirname, 'artifacts');
export const artifactsContractPath = path.join(__dirname, 'artifacts', 'contracts');
export const artifactsBuildInfoPath = path.join(__dirname, 'artifacts', 'build-info');
export const libPath = path.join(__dirname, 'lib');
export const contractsPath = path.join(__dirname, 'contracts');
