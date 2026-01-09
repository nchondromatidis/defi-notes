import type { HardhatUserConfig } from 'hardhat/config';
import augmentArtifacts from '@defi-notes/hardhat-tevm-lens';

const compilerVersions: string[] = ['0.4.26', '0.5.16', '0.6.6', '0.6.12'];

function createCompilerSettings(version: string) {
  return {
    version,
    settings: {
      optimizer: { enabled: true, runs: 100 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
        },
      },
    },
  };
}

const config: HardhatUserConfig = {
  plugins: [augmentArtifacts],
  solidity: {
    compilers: compilerVersions.map(createCompilerSettings),
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
  },
  networks: {},
  artifactsAugment: {
    runOnBuild: true,
    artifactContractsPath: './artifacts/contracts',
  },
};

export default config;
