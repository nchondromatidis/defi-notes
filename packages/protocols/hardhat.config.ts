import './tasks/inject-sourcemaps';
import type { HardhatUserConfig } from 'hardhat/config';

const compilerVersions: string[] = ['0.4.26', '0.5.16', '0.6.6', '0.6.12'];

function createCompilerSettings(version: string) {
  return {
    version: version,
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.sourceMap'],
      },
    },
  };
}
const compilerSettings = compilerVersions.map((v) => createCompilerSettings(v));

const config: HardhatUserConfig = {
  solidity: {
    compilers: compilerSettings,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {},
};

export default config;
