import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const accounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    coston2: {
      url: process.env.COSTON2_RPC_URL ?? "https://coston2-api.flare.network/ext/C/rpc",
      chainId: 114,
      accounts,
    },
    flare: {
      url: process.env.FLARE_RPC_URL ?? "https://flare-api.flare.network/ext/C/rpc",
      chainId: 14,
      accounts,
    },
  },
};

export default config;
