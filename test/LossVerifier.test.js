const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LossVerifier (Integration)", function () {
  let token, policyManager, dexRouter, insurancePool, lossVerifier;
  let mockPancake, mockToken;
  let owner, user1;
  const TOTAL_SUPPLY = ethers.parseEther("100000000");
  const MIN_HOLDING = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy mock token for trading
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MOCK");
    await mockToken.waitForDeployment();

    // Deploy mock pancake router
    const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
    mockPancake = await MockPancakeRouter.deploy();
    await mockPancake.waitForDeployment();
    await mockToken.mint(await mockPancake.getAddress(), ethers.parseEther("1000000"));
    await owner.sendTransaction({ to: await mockPancake.getAddress(), value: ethers.parseEther("100") });

    // Deploy core contracts
    const InsurToken = await ethers.getContractFactory("InsurToken");
    token = await InsurToken.deploy("InsurFi", "INSUR", TOTAL_SUPPLY);
    await token.waitForDeployment();

    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    policyManager = await PolicyManager.deploy(await token.getAddress(), MIN_HOLDING);
    await policyManager.waitForDeployment();

    const DEXRouter = await ethers.getContractFactory("DEXRouter");
    dexRouter = await DEXRouter.deploy(await mockPancake.getAddress());
    await dexRouter.waitForDeployment();

    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    insurancePool = await InsurancePool.deploy();
    await insurancePool.waitForDeployment();

    const LossVerifier = await ethers.getContractFactory("LossVerifier");
    lossVerifier = await LossVerifier.deploy(
      await token.getAddress(),
      await insurancePool.getAddress(),
      await policyManager.getAddress(),
      await dexRouter.getAddress()
    );
    await lossVerifier.waitForDeployment();

    // Wire up
    await insurancePool.setLossVerifier(await lossVerifier.getAddress());

    // Fund insurance pool
    await insurancePool.deposit({ value: ethers.parseEther("10") });

    // Give user1 INSUR tokens (above threshold for active policy)
    await token.transfer(user1.address, ethers.parseEther("5000"));
  });

  it("should process a valid claim with loss", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const weth = await mockPancake.WETH();
    const tokenAddr = await mockToken.getAddress();

    // Buy: 1 ETH → 200 tokens
    const buyTx = await dexRouter.connect(user1).swapETHForTokens(
      0, [weth, tokenAddr], deadline, { value: ethers.parseEther("1") }
    );
    await buyTx.wait();
    const buyTradeId = 1;

    // Sell: 200 tokens → 1 ETH (no loss) - need a loss scenario
    // Mock rate is fixed, so to simulate loss we sell fewer tokens
    // Sell 100 tokens → 0.5 ETH (loss = 1 - 0.5 = 0.5 ETH)
    await mockToken.connect(user1).approve(await dexRouter.getAddress(), ethers.parseEther("100"));
    const sellTx = await dexRouter.connect(user1).swapTokensForETH(
      ethers.parseEther("100"), 0, [tokenAddr, weth], deadline
    );
    await sellTx.wait();
    const sellTradeId = 2;

    const poolBalanceBefore = await insurancePool.getPoolBalance();
    const userBalanceBefore = await ethers.provider.getBalance(user1.address);

    // Submit claim
    const claimTx = await lossVerifier.connect(user1).verifyAndPayout(buyTradeId, sellTradeId);
    const receipt = await claimTx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    // Loss = 1 ETH - 0.5 ETH = 0.5 ETH
    // Payout ratio = 50%, coverage limit tier 2 = 0.5 BNB
    // Payout = min(0.5 * 0.5, 0.5) = 0.25 ETH
    const expectedPayout = ethers.parseEther("0.25");

    const poolBalanceAfter = await insurancePool.getPoolBalance();
    expect(poolBalanceBefore - poolBalanceAfter).to.equal(expectedPayout);

    const userBalanceAfter = await ethers.provider.getBalance(user1.address);
    expect(userBalanceAfter - userBalanceBefore + gasCost).to.equal(expectedPayout);
  });

  it("should reject claim when policy inactive at sell time", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const weth = await mockPancake.WETH();
    const tokenAddr = await mockToken.getAddress();

    // User2 has no INSUR (inactive policy)
    const user2 = (await ethers.getSigners())[2];

    // Buy
    await dexRouter.connect(user2).swapETHForTokens(
      0, [weth, tokenAddr], deadline, { value: ethers.parseEther("1") }
    );
    // Sell
    await mockToken.connect(user2).approve(await dexRouter.getAddress(), ethers.parseEther("100"));
    await dexRouter.connect(user2).swapTokensForETH(
      ethers.parseEther("100"), 0, [tokenAddr, weth], deadline
    );

    await expect(lossVerifier.connect(user2).verifyAndPayout(1, 2)).to.be.revertedWith(
      "LossVerifier: policy inactive at sell time"
    );
  });

  it("should reject claim with no loss", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const weth = await mockPancake.WETH();
    const tokenAddr = await mockToken.getAddress();

    // Buy 1 ETH → 200 tokens
    await dexRouter.connect(user1).swapETHForTokens(
      0, [weth, tokenAddr], deadline, { value: ethers.parseEther("1") }
    );
    // Sell ALL 200 tokens → 1 ETH (no loss)
    await mockToken.connect(user1).approve(await dexRouter.getAddress(), ethers.parseEther("200"));
    await dexRouter.connect(user1).swapTokensForETH(
      ethers.parseEther("200"), 0, [tokenAddr, weth], deadline
    );

    await expect(lossVerifier.connect(user1).verifyAndPayout(1, 2)).to.be.revertedWith(
      "LossVerifier: no loss"
    );
  });

  it("should reject duplicate claim", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const weth = await mockPancake.WETH();
    const tokenAddr = await mockToken.getAddress();

    await dexRouter.connect(user1).swapETHForTokens(
      0, [weth, tokenAddr], deadline, { value: ethers.parseEther("1") }
    );
    await mockToken.connect(user1).approve(await dexRouter.getAddress(), ethers.parseEther("100"));
    await dexRouter.connect(user1).swapTokensForETH(
      ethers.parseEther("100"), 0, [tokenAddr, weth], deadline
    );

    await lossVerifier.connect(user1).verifyAndPayout(1, 2);
    await expect(lossVerifier.connect(user1).verifyAndPayout(1, 2)).to.be.revertedWith(
      "LossVerifier: claim already processed"
    );
  });

  it("should reject claim for trades not owned by caller", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const weth = await mockPancake.WETH();
    const tokenAddr = await mockToken.getAddress();

    // user1 makes trades
    await dexRouter.connect(user1).swapETHForTokens(
      0, [weth, tokenAddr], deadline, { value: ethers.parseEther("1") }
    );
    await mockToken.connect(user1).approve(await dexRouter.getAddress(), ethers.parseEther("100"));
    await dexRouter.connect(user1).swapTokensForETH(
      ethers.parseEther("100"), 0, [tokenAddr, weth], deadline
    );

    // user2 tries to claim user1's trades
    const user2 = (await ethers.getSigners())[2];
    await expect(lossVerifier.connect(user2).verifyAndPayout(1, 2)).to.be.revertedWith(
      "LossVerifier: buy not owned"
    );
  });

  it("should calculate loss via view function", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const weth = await mockPancake.WETH();
    const tokenAddr = await mockToken.getAddress();

    await dexRouter.connect(user1).swapETHForTokens(
      0, [weth, tokenAddr], deadline, { value: ethers.parseEther("1") }
    );
    await mockToken.connect(user1).approve(await dexRouter.getAddress(), ethers.parseEther("100"));
    await dexRouter.connect(user1).swapTokensForETH(
      ethers.parseEther("100"), 0, [tokenAddr, weth], deadline
    );

    const result = await lossVerifier.connect(user1).calculateLoss(1, 2);
    expect(result.isValid).to.equal(true);
    expect(result.lossAmount).to.equal(ethers.parseEther("0.5"));
  });
});
