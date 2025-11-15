import type { HardhatUserConfig } from 'hardhat/config';
import augmentArtifacts from '@defi-notes/hardhat-tevm-lens';

const config: HardhatUserConfig = {
  plugins: [augmentArtifacts],
  solidity: {
    compilers: [
      {
        version: '0.8.30',
        settings: {
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'storageLayout'],
            },
          },
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    artifacts: './test/setup/artifacts',
    cache: './cache',
  },
  networks: {},
  artifactsAugment: {
    runOnBuild: true,
    artifactContractsPath: './test/setup/artifacts/contracts',
  },
};

export default config;
