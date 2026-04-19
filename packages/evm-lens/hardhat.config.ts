import type { HardhatUserConfig } from 'hardhat/config';
import augmentArtifacts from '@protocol-lens/evm-lens-indexer';

const config: HardhatUserConfig = {
  plugins: [augmentArtifacts],
  solidity: {
    compilers: [
      {
        version: '0.8.30',
        settings: {
          metadata: {
            appendCBOR: false,
          },
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
            },
          },
        },
      },
    ],
  },
  paths: {
    sources: './test-contracts',
    artifacts: './test/_setup/artifacts',
    cache: './cache',
  },
  networks: {},
  artifactsAugment: {
    runOnBuild: true,
    artifactContractsPath: './test/_setup/artifacts/test-contracts',
  },
};

export default config;
