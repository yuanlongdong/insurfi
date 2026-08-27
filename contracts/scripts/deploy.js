const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB");
  console.log("Network:", hre.network.name);
  console.log("========================================\n");

  // PancakeSwap Router 地址（测试网）
  // 主网: 0x10ED43C718714eb63d5aA57B78B54704E256024
  // 测试网: 0xD99D1c33F9fC3444f8101754aBC46c52416550D
  const PANCAKE_ROUTER = process.env.PANCAKE_ROUTER || "0xD99D1c33F9fC3444f8101754aBC46c52416550D";

  // 最小持仓阈值：1000 INSUR
  const MIN_HOLDINGS = hre.ethers.parseEther("1000");

  // ============ 1. 部署 InsurToken ============
  console.log("[1/5] Deploying InsurToken...");
  const InsurToken = await hre.ethers.getContractFactory("InsurToken");
  const insurToken = await InsurToken.deploy(deployer.address);
  await insurToken.waitForDeployment();
  const insurTokenAddress = await insurToken.getAddress();
  console.log("  InsurToken:", insurTokenAddress);
  console.log("  Total supply:", hre.ethers.formatEther(await insurToken.totalSupply()), "INSUR\n");

  // ============ 2. 部署 PolicyManager ============
  console.log("[2/5] Deploying PolicyManager...");
  const PolicyManager = await hre.ethers.getContractFactory("PolicyManager");
  const policyManager = await PolicyManager.deploy(insurTokenAddress, MIN_HOLDINGS);
  await policyManager.waitForDeployment();
  const policyManagerAddress = await policyManager.getAddress();
  console.log("  PolicyManager:", policyManagerAddress);
  console.log("  Min holdings:", hre.ethers.formatEther(await policyManager.minHoldingsThreshold()), "INSUR\n");

  // ============ 3. 部署 DEXRouter ============
  console.log("[3/5] Deploying DEXRouter...");
  const DEXRouter = await hre.ethers.getContractFactory("DEXRouter");
  const dexRouter = await DEXRouter.deploy(PANCAKE_ROUTER);
  await dexRouter.waitForDeployment();
  const dexRouterAddress = await dexRouter.getAddress();
  console.log("  DEXRouter:", dexRouterAddress);
  console.log("  PancakeRouter:", PANCAKE_ROUTER);
  console.log("  WBNB:", await dexRouter.WBNB(), "\n");

  // ============ 4. 部署 InsurancePool ============
  console.log("[4/5] Deploying InsurancePool...");
  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const insurancePool = await InsurancePool.deploy();
  await insurancePool.waitForDeployment();
  const insurancePoolAddress = await insurancePool.getAddress();
  console.log("  InsurancePool:", insurancePoolAddress);
  console.log("  Max pool size:", hre.ethers.formatEther(await insurancePool.maxPoolSize()), "BNB");
  console.log("  Max single payout:", hre.ethers.formatEther(await insurancePool.MAX_SINGLE_PAYOUT()), "BNB\n");

  // ============ 5. 部署 LossVerifier ============
  console.log("[5/5] Deploying LossVerifier...");
  const LossVerifier = await hre.ethers.getContractFactory("LossVerifier");
  const lossVerifier = await LossVerifier.deploy(
    insurTokenAddress,
    insurancePoolAddress,
    policyManagerAddress,
    dexRouterAddress
  );
  await lossVerifier.waitForDeployment();
  const lossVerifierAddress = await lossVerifier.getAddress();
  console.log("  LossVerifier:", lossVerifierAddress);
  console.log("  Min loss threshold:", hre.ethers.formatEther(await lossVerifier.getMinLossThreshold()), "BNB");
  console.log("  Max trade age:", await lossVerifier.getMaxTradeAge(), "seconds (30 days)\n");

  // ============ 连接合约 ============
  console.log("=== Wiring up contracts ===");

  // 设置 InsurancePool 的 LossVerifier 地址
  console.log("  Setting InsurancePool.lossVerifier...");
  await insurancePool.setLossVerifier(lossVerifierAddress);
  console.log("  InsurancePool.lossVerifier =", await insurancePool.lossVerifier());

  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("Network:", hre.network.name);
  console.log("InsurToken:   ", insurTokenAddress);
  console.log("PolicyManager:", policyManagerAddress);
  console.log("DEXRouter:    ", dexRouterAddress);
  console.log("InsurancePool:", insurancePoolAddress);
  console.log("LossVerifier: ", lossVerifierAddress);
  console.log("========================================");
  console.log("\nNext steps:");
  console.log("1. Verify contracts on BscScan");
  console.log("2. Deposit test BNB to InsurancePool");
  console.log("3. Distribute INSUR tokens to test users");
  console.log("4. Test full claim flow");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
