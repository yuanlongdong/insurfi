const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEXRouter", function () {
  let router, mockPancake, mockToken;
  let owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MOCK");
    await mockToken.waitForDeployment();

    // Deploy mock pancake router
    const MockPancakeRouter = await ethers.getContractFactory("MockPancakeRouter");
    mockPancake = await MockPancakeRouter.deploy();
    await mockPancake.waitForDeployment();

    // Fund mock router with tokens and ETH
    await mockToken.mint(await mockPancake.getAddress(), ethers.parseEther("1000000"));
    await owner.sendTransaction({ to: await mockPancake.getAddress(), value: ethers.parseEther("10") });

    // Deploy DEXRouter
    const DEXRouter = await ethers.getContractFactory("DEXRouter");
    router = await DEXRouter.deploy(await mockPancake.getAddress());
    await router.waitForDeployment();
  });

  it("should record ETH→Token swap and return tradeId", async function () {
    const ethAmount = ethers.parseEther("1");
    const path = [await mockPancake.WETH(), await mockToken.getAddress()];
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const tx = await router.connect(user1).swapETHForTokens(0, path, deadline, { value: ethAmount });
    const receipt = await tx.wait();

    expect(await router.tradeCount()).to.equal(1);
    const trade = await router.getTrade(1);
    expect(trade.trader).to.equal(user1.address);
    expect(trade.amountIn).to.equal(ethAmount);
    expect(trade.isBuy).to.equal(true);
    expect(trade.id).to.equal(1);

    // User should have received tokens (1 ETH * 200 rate = 200 tokens)
    expect(await mockToken.balanceOf(user1.address)).to.equal(ethers.parseEther("200"));
  });

  it("should record Token→ETH swap", async function () {
    // First buy tokens
    const ethAmount = ethers.parseEther("1");
    const pathBuy = [await mockPancake.WETH(), await mockToken.getAddress()];
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await router.connect(user1).swapETHForTokens(0, pathBuy, deadline, { value: ethAmount });

    // Now sell tokens
    const tokenAmount = ethers.parseEther("100");
    await mockToken.connect(user1).approve(await router.getAddress(), tokenAmount);
    const pathSell = [await mockToken.getAddress(), await mockPancake.WETH()];

    const ethBalanceBefore = await ethers.provider.getBalance(user1.address);
    const tx = await router.connect(user1).swapTokensForETH(tokenAmount, 0, pathSell, deadline);
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    expect(await router.tradeCount()).to.equal(2);
    const trade = await router.getTrade(2);
    expect(trade.trader).to.equal(user1.address);
    expect(trade.isBuy).to.equal(false);
    expect(trade.amountIn).to.equal(tokenAmount);

    // User should have received ETH (100 tokens / 200 rate = 0.5 ETH)
    const ethBalanceAfter = await ethers.provider.getBalance(user1.address);
    expect(ethBalanceAfter - ethBalanceBefore + gasCost).to.equal(ethers.parseEther("0.5"));
  });

  it("should track user trades", async function () {
    const path = [await mockPancake.WETH(), await mockToken.getAddress()];
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await router.connect(user1).swapETHForTokens(0, path, deadline, { value: ethers.parseEther("0.5") });
    await router.connect(user1).swapETHForTokens(0, path, deadline, { value: ethers.parseEther("0.3") });

    const userTrades = await router.getUserTrades(user1.address);
    expect(userTrades.length).to.equal(2);
    expect(await router.getUserTradeCount(user1.address)).to.equal(2);
  });

  it("should reject expired deadline", async function () {
    const path = [await mockPancake.WETH(), await mockToken.getAddress()];
    await expect(
      router.connect(user1).swapETHForTokens(0, path, 1, { value: ethers.parseEther("1") })
    ).to.be.revertedWith("DEXRouter: expired");
  });

  it("should reject zero ETH swap", async function () {
    const path = [await mockPancake.WETH(), await mockToken.getAddress()];
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await expect(
      router.connect(user1).swapETHForTokens(0, path, deadline, { value: 0 })
    ).to.be.revertedWith("DEXRouter: zero ETH");
  });

  it("should allow owner to add/remove supported DEX", async function () {
    const fakeDEX = "0x0000000000000000000000000000000000001234";
    await router.addSupportedDEX(fakeDEX);
    expect(await router.isSupportedDEX(fakeDEX)).to.equal(true);
    await router.removeSupportedDEX(fakeDEX);
    expect(await router.isSupportedDEX(fakeDEX)).to.equal(false);
  });

  it("should reject DEX management from non-owner", async function () {
    const fakeDEX = "0x0000000000000000000000000000000000001234";
    await expect(router.connect(user1).addSupportedDEX(fakeDEX)).to.be.revertedWith(
      "DEXRouter: not owner"
    );
  });
});
