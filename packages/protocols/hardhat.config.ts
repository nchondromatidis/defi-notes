import type { HardhatUserConfig } from 'hardhat/config';
import augmentArtifacts from '@defi-notes/evm-lens-indexer';

const compilerVersions = [
  { v: '0.4.26', opt: true },
  { v: '0.5.16', opt: true },
  { v: '0.6.6', opt: true },
  { v: '0.6.12', opt: true },
];

function createCompilerSettings(version: string, optimize = false) {
  const optimizer = optimize ? { enabled: true, runs: 100 } : { enabled: false };
  return {
    version,
    settings: {
      optimizer,
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
    compilers: compilerVersions.map((it) => createCompilerSettings(it.v, it.opt)),
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
