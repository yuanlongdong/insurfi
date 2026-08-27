const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InsurToken", function () {
  let token;
  let owner, user1, user2;
  const TOTAL_SUPPLY = ethers.parseEther("100000000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const InsurToken = await ethers.getContractFactory("InsurToken");
    token = await InsurToken.deploy("InsurFi", "INSUR", TOTAL_SUPPLY);
    await token.waitForDeployment();
  });

  it("should have correct name, symbol, decimals", async function () {
    expect(await token.name()).to.equal("InsurFi");
    expect(await token.symbol()).to.equal("INSUR");
    expect(await token.decimals()).to.equal(18);
  });

  it("should mint total supply to owner", async function () {
    expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
  });

  it("should transfer tokens correctly", async function () {
    const amount = ethers.parseEther("1000");
    await token.transfer(user1.address, amount);
    expect(await token.balanceOf(user1.address)).to.equal(amount);
    expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - amount);
  });

  it("should record balance snapshots on transfer", async function () {
    const amount = ethers.parseEther("1000");
    const blockBefore = await ethers.provider.getBlockNumber();
    await token.transfer(user1.address, amount);
    const blockAfter = await ethers.provider.getBlockNumber();

    // balanceOfAt at a block before transfer should be 0 for user1
    expect(await token.balanceOfAt(user1.address, blockBefore)).to.equal(0);
    // at the transfer block or after, should be amount
    expect(await token.balanceOfAt(user1.address, blockAfter)).to.equal(amount);
  });

  it("should return current balance for future blocks", async function () {
    const amount = ethers.parseEther("500");
    await token.transfer(user1.address, amount);
    const futureBlock = (await ethers.provider.getBlockNumber()) + 100;
    expect(await token.balanceOfAt(user1.address, futureBlock)).to.equal(amount);
  });

  it("should allow owner to mint", async function () {
    const mintAmount = ethers.parseEther("1000");
    await token.mint(user1.address, mintAmount);
    expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
    expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY + mintAmount);
  });

  it("should reject mint from non-owner", async function () {
    await expect(
      token.connect(user1).mint(user1.address, ethers.parseEther("100"))
    ).to.be.revertedWith("InsurToken: not owner");
  });

  it("should handle approval and transferFrom", async function () {
    const amount = ethers.parseEther("500");
    await token.approve(user1.address, amount);
    expect(await token.allowance(owner.address, user1.address)).to.equal(amount);
    await token.connect(user1).transferFrom(owner.address, user2.address, amount);
    expect(await token.balanceOf(user2.address)).to.equal(amount);
  });

  it("should reject transfer exceeding balance", async function () {
    await expect(
      token.connect(user1).transfer(user2.address, ethers.parseEther("1"))
    ).to.be.revertedWith("InsurToken: insufficient balance");
  });
});
