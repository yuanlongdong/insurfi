require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545";
const BSC_MAINNET_RPC = process.env.BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    bsctestnet: {
      url: BSC_TESTNET_RPC,
      chainId: 97,
      accounts: [PRIVATE_KEY],
    },
    bscmainnet: {
      url: BSC_MAINNET_RPC,
      chainId: 56,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY || "",
  },
};
