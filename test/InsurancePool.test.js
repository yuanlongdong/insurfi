const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InsurancePool", function () {
  let pool;
  let owner, user1, verifier;

  beforeEach(async function () {
    [owner, user1, verifier] = await ethers.getSigners();
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    pool = await InsurancePool.deploy();
    await pool.waitForDeployment();
    await pool.setLossVerifier(verifier.address);
  });

  it("should accept BNB deposits", async function () {
    const depositAmount = ethers.parseEther("1");
    await pool.deposit({ value: depositAmount });
    expect(await pool.getPoolBalance()).to.equal(depositAmount);
    expect(await pool.totalDeposited()).to.equal(depositAmount);
  });

  it("should reject zero deposit", async function () {
    await expect(pool.deposit({ value: 0 })).to.be.revertedWith("InsurancePool: zero deposit");
  });

  it("should allow verifier to execute payout", async function () {
    const depositAmount = ethers.parseEther("1");
    const payoutAmount = ethers.parseEther("0.5");
    await pool.deposit({ value: depositAmount });

    const claimId = ethers.keccak256(ethers.toUtf8Bytes("claim1"));
    const userBalanceBefore = await ethers.provider.getBalance(user1.address);

    await pool.connect(verifier).payout(user1.address, payoutAmount, claimId);

    expect(await pool.getPoolBalance()).to.equal(depositAmount - payoutAmount);
    expect(await pool.totalPaidOut()).to.equal(payoutAmount);
    expect(await pool.payoutCount()).to.equal(1);
    expect(await pool.userTotalPayout(user1.address)).to.equal(payoutAmount);
    expect(await pool.isClaimProcessed(claimId)).to.equal(true);

    const userBalanceAfter = await ethers.provider.getBalance(user1.address);
    expect(userBalanceAfter - userBalanceBefore).to.equal(payoutAmount);
  });

  it("should reject payout from non-verifier", async function () {
    await pool.deposit({ value: ethers.parseEther("1") });
    const claimId = ethers.keccak256(ethers.toUtf8Bytes("claim1"));
    await expect(
      pool.connect(user1).payout(user1.address, ethers.parseEther("0.1"), claimId)
    ).to.be.revertedWith("InsurancePool: not verifier");
  });

  it("should reject duplicate claim payout", async function () {
    await pool.deposit({ value: ethers.parseEther("1") });
    const claimId = ethers.keccak256(ethers.toUtf8Bytes("claim1"));
    await pool.connect(verifier).payout(user1.address, ethers.parseEther("0.1"), claimId);
    await expect(
      pool.connect(verifier).payout(user1.address, ethers.parseEther("0.1"), claimId)
    ).to.be.revertedWith("InsurancePool: claim already processed");
  });

  it("should reject payout exceeding pool balance", async function () {
    await pool.deposit({ value: ethers.parseEther("0.1") });
    const claimId = ethers.keccak256(ethers.toUtf8Bytes("claim1"));
    await expect(
      pool.connect(verifier).payout(user1.address, ethers.parseEther("0.5"), claimId)
    ).to.be.revertedWith("InsurancePool: insufficient pool balance");
  });

  it("should allow owner to withdraw", async function () {
    const depositAmount = ethers.parseEther("1");
    await pool.deposit({ value: depositAmount });
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const tx = await pool.withdraw(depositAmount);
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerBalanceAfter - ownerBalanceBefore + gasCost).to.equal(depositAmount);
  });

  it("should reject withdraw from non-owner", async function () {
    await pool.deposit({ value: ethers.parseEther("1") });
    await expect(pool.connect(user1).withdraw(ethers.parseEther("0.1"))).to.be.revertedWith(
      "InsurancePool: not owner"
    );
  });

  it("should pause and reject deposits/payouts when paused", async function () {
    await pool.togglePause();
    expect(await pool.paused()).to.equal(true);
    await expect(pool.deposit({ value: ethers.parseEther("1") })).to.be.revertedWith(
      "InsurancePool: paused"
    );
    const claimId = ethers.keccak256(ethers.toUtf8Bytes("claim1"));
    await expect(
      pool.connect(verifier).payout(user1.address, ethers.parseEther("0.1"), claimId)
    ).to.be.revertedWith("InsurancePool: paused");
  });

  it("should unpause and resume operations", async function () {
    await pool.togglePause();
    await pool.togglePause();
    expect(await pool.paused()).to.equal(false);
    await pool.deposit({ value: ethers.parseEther("1") });
    expect(await pool.getPoolBalance()).to.equal(ethers.parseEther("1"));
  });
});
