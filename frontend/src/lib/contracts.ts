// InsurFi Contract Addresses & ABIs

export const CONTRACT_ADDRESSES = {
  insurToken: process.env.NEXT_PUBLIC_INSUR_ADDRESS || "",
  insurancePool: process.env.NEXT_PUBLIC_POOL_ADDRESS || "",
  lossVerifier: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS || "",
  policyManager: process.env.NEXT_PUBLIC_POLICY_ADDRESS || "",
  dexRouter: process.env.NEXT_PUBLIC_DEX_ROUTER_ADDRESS || "",
};

export const INSUR_TOKEN_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "balanceOfAt", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }, { name: "blockNumber", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const INSURANCE_POOL_ABI = [
  { name: "getPoolBalance", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalDeposited", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalPaidOut", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "payoutCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "userTotalPayout", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "deposit", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "paused", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

export const POLICY_MANAGER_ABI = [
  { name: "getPolicyStatus", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "isActive", type: "bool" }, { name: "tier", type: "uint8" }, { name: "coverageLimit", type: "uint256" }] },
  { name: "isPolicyActiveAt", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }, { name: "blockNumber", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "getCoverageLimit", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "minHoldingThreshold", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getTierCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const LOSS_VERIFIER_ABI = [
  { name: "verifyAndPayout", type: "function", stateMutability: "nonpayable", inputs: [{ name: "buyTradeId", type: "uint256" }, { name: "sellTradeId", type: "uint256" }], outputs: [] },
  { name: "calculateLoss", type: "function", stateMutability: "view", inputs: [{ name: "buyTradeId", type: "uint256" }, { name: "sellTradeId", type: "uint256" }], outputs: [{ name: "lossAmount", type: "uint256" }, { name: "isValid", type: "bool" }] },
  { name: "payoutRatio", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "minLossAmount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const DEX_ROUTER_ABI = [
  { name: "swapETHForTokens", type: "function", stateMutability: "payable", inputs: [{ name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" }, { name: "deadline", type: "uint256" }], outputs: [{ name: "tradeId", type: "uint256" }] },
  { name: "swapTokensForETH", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amountIn", type: "uint256" }, { name: "amountOutMin", type: "uint256" }, { name: "path", type: "address[]" }, { name: "deadline", type: "uint256" }], outputs: [{ name: "tradeId", type: "uint256" }] },
  { name: "getTrade", type: "function", stateMutability: "view", inputs: [{ name: "tradeId", type: "uint256" }], outputs: [{ name: "id", type: "uint256" }, { name: "trader", type: "address" }, { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "amountIn", type: "uint256" }, { name: "amountOut", type: "uint256" }, { name: "blockNumber", type: "uint256" }, { name: "timestamp", type: "uint256" }, { name: "isBuy", type: "bool" }] },
  { name: "getUserTrades", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "getUserTradeCount", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "tradeCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
