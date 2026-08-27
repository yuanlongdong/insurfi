"use client";

import { http, createConfig } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect, metaMask } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const config = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    metaMask(),
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed.binance.org"),
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545"),
  },
  ssr: true,
});
