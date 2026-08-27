// We require the Hardhat Runtime Environment explicitly
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB");

  // === Configuration ===
  const TOTAL_SUPPLY = hre.ethers.parseEther("100000000"); // 100M INSUR
  const MIN_HOLDING = hre.ethers.parseEther("1000"); // 1000 INSUR minimum
  // BSC Testnet PancakeSwap Router (replace with mainnet address for production)
  const PANCAKE_ROUTER = process.env.PANCAKE_ROUTER || "0xD99D1c33F9fC3444f8101754aBC46c52416550D";

  // === 1. Deploy InsurToken ===
  console.log("\n[1/5] Deploying InsurToken...");
  const InsurToken = await hre.ethers.getContractFactory("InsurToken");
  const insurToken = await InsurToken.deploy("InsurFi", "INSUR", TOTAL_SUPPLY);
  await insurToken.waitForDeployment();
  const insurTokenAddr = await insurToken.getAddress();
  console.log("  InsurToken:", insurTokenAddr);

  // === 2. Deploy PolicyManager ===
  console.log("\n[2/5] Deploying PolicyManager...");
  const PolicyManager = await hre.ethers.getContractFactory("PolicyManager");
  const policyManager = await PolicyManager.deploy(insurTokenAddr, MIN_HOLDING);
  await policyManager.waitForDeployment();
  const policyManagerAddr = await policyManager.getAddress();
  console.log("  PolicyManager:", policyManagerAddr);

  // === 3. Deploy DEXRouter ===
  console.log("\n[3/5] Deploying DEXRouter...");
  const DEXRouter = await hre.ethers.getContractFactory("DEXRouter");
  const dexRouter = await DEXRouter.deploy(PANCAKE_ROUTER);
  await dexRouter.waitForDeployment();
  const dexRouterAddr = await dexRouter.getAddress();
  console.log("  DEXRouter:", dexRouterAddr);

  // === 4. Deploy InsurancePool ===
  console.log("\n[4/5] Deploying InsurancePool...");
  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const insurancePool = await InsurancePool.deploy();
  await insurancePool.waitForDeployment();
  const insurancePoolAddr = await insurancePool.getAddress();
  console.log("  InsurancePool:", insurancePoolAddr);

  // === 5. Deploy LossVerifier ===
  console.log("\n[5/5] Deploying LossVerifier...");
  const LossVerifier = await hre.ethers.getContractFactory("LossVerifier");
  const lossVerifier = await LossVerifier.deploy(
    insurTokenAddr,
    insurancePoolAddr,
    policyManagerAddr,
    dexRouterAddr
  );
  await lossVerifier.waitForDeployment();
  const lossVerifierAddr = await lossVerifier.getAddress();
  console.log("  LossVerifier:", lossVerifierAddr);

  // === Wire up contracts ===
  console.log("\n=== Wiring up contracts ===");
  await insurancePool.setLossVerifier(lossVerifierAddr);
  console.log("  InsurancePool.lossVerifier =", lossVerifierAddr);

  // === Summary ===
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("Network:", hre.network.name);
  console.log("InsurToken:   ", insurTokenAddr);
  console.log("PolicyManager:", policyManagerAddr);
  console.log("DEXRouter:    ", dexRouterAddr);
  console.log("InsurancePool:", insurancePoolAddr);
  console.log("LossVerifier: ", lossVerifierAddr);
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("  1. Verify contracts on BscScan: npx hardhat verify <address> [args]");
  console.log("  2. Deposit initial BNB into InsurancePool");
  console.log("  3. Distribute INSUR tokens for testing");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
