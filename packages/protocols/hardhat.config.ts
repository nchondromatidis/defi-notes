import "./tasks/inject-sourcemaps";
import {HardhatUserConfig} from "hardhat/config";
import {configVariable} from "hardhat/config";


const compilerVersions: string[] = ["0.4.26", "0.5.16", "0.6.6",  "0.6.12"];

function createCompilerSettings(version: string) {
  return {
    version: version,
    settings: {
      optimizer: {
        enabled: true,
        runs: 100
      }
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode", "evm.sourceMap"]
      }
    }
  }
}
const compilerSettings = compilerVersions.map(v => createCompilerSettings(v));

const config: HardhatUserConfig = {
  solidity: {
    compilers: compilerSettings,
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
};

export default config;
