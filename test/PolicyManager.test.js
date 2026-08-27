const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PolicyManager", function () {
  let token, policyManager;
  let owner, user1, user2;
  const TOTAL_SUPPLY = ethers.parseEther("100000000");
  const MIN_HOLDING = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const InsurToken = await ethers.getContractFactory("InsurToken");
    token = await InsurToken.deploy("InsurFi", "INSUR", TOTAL_SUPPLY);
    await token.waitForDeployment();

    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    policyManager = await PolicyManager.deploy(await token.getAddress(), MIN_HOLDING);
    await policyManager.waitForDeployment();
  });

  it("should have correct minimum threshold", async function () {
    expect(await policyManager.minHoldingThreshold()).to.equal(MIN_HOLDING);
  });

  it("should return inactive policy for user below threshold", async function () {
    const status = await policyManager.getPolicyStatus(user1.address);
    expect(status.isActive).to.equal(false);
    expect(status.tier).to.equal(0);
    expect(status.coverageLimit).to.equal(0);
  });

  it("should activate policy for user above threshold", async function () {
    await token.transfer(user1.address, ethers.parseEther("1000"));
    const status = await policyManager.getPolicyStatus(user1.address);
    expect(status.isActive).to.equal(true);
    expect(status.tier).to.equal(1);
    expect(status.coverageLimit).to.equal(ethers.parseEther("0.1"));
  });

  it("should assign correct tiers based on holdings", async function () {
    // Tier 1: 1000 - 4999
    await token.transfer(user1.address, ethers.parseEther("3000"));
    let status = await policyManager.getPolicyStatus(user1.address);
    expect(status.tier).to.equal(1);

    // Tier 2: 5000 - 19999
    await token.transfer(user2.address, ethers.parseEther("10000"));
    status = await policyManager.getPolicyStatus(user2.address);
    expect(status.tier).to.equal(2);
    expect(status.coverageLimit).to.equal(ethers.parseEther("0.5"));

    // Tier 3: 20000+
    await token.transfer(owner.address, ethers.parseEther("50000")); // already has plenty
    status = await policyManager.getPolicyStatus(owner.address);
    expect(status.tier).to.equal(3);
    expect(status.coverageLimit).to.equal(ethers.parseEther("2"));
  });

  it("should check historical policy active status via snapshots", async function () {
    const blockBefore = await ethers.provider.getBlockNumber();
    // user1 has 0 at blockBefore
    expect(await policyManager.isPolicyActiveAt(user1.address, blockBefore)).to.equal(false);

    await token.transfer(user1.address, ethers.parseEther("2000"));
    const blockAfter = await ethers.provider.getBlockNumber();
    expect(await policyManager.isPolicyActiveAt(user1.address, blockAfter)).to.equal(true);
  });

  it("should allow owner to update threshold", async function () {
    const newThreshold = ethers.parseEther("500");
    await policyManager.setMinHoldingThreshold(newThreshold);
    expect(await policyManager.minHoldingThreshold()).to.equal(newThreshold);
  });

  it("should reject threshold update from non-owner", async function () {
    await expect(
      policyManager.connect(user1).setMinHoldingThreshold(ethers.parseEther("100"))
    ).to.be.revertedWith("PolicyManager: not owner");
  });

  it("should allow owner to set custom tiers", async function () {
    const holdings = [ethers.parseEther("500"), ethers.parseEther("2000")];
    const coverages = [ethers.parseEther("0.05"), ethers.parseEther("0.3")];
    await policyManager.setTiers(holdings, coverages);
    expect(await policyManager.getTierCount()).to.equal(2);

    const tierInfo = await policyManager.getTierInfo(1);
    expect(tierInfo.minHolding).to.equal(holdings[0]);
    expect(tierInfo.coverageLimit).to.equal(coverages[0]);
  });

  it("should reject non-ascending tiers", async function () {
    const holdings = [ethers.parseEther("2000"), ethers.parseEther("500")];
    const coverages = [ethers.parseEther("0.1"), ethers.parseEther("0.5")];
    await expect(policyManager.setTiers(holdings, coverages)).to.be.revertedWith(
      "PolicyManager: holdings not ascending"
    );
  });

  it("should return 0 coverage for inactive user", async function () {
    expect(await policyManager.getCoverageLimit(user1.address)).to.equal(0);
  });
});
