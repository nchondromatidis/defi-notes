import type { HardhatUserConfig } from "hardhat/config";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.4.26" },
      { version: "0.5.16" },
      { version: "0.6.6" },
      { version: "0.6.12" },
    ],
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
