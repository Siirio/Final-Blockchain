const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RNTtoken Unit Tests", function () {
  let token;
  let owner, addr1, addr2;
  const initialSupply = 1000;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("RNTtoken");
    token = await Token.deploy(initialSupply);
    await token.deployed();
  });

  describe("Deployment & Balance Checks", function () {
    it("Should set the correct initial supply and assign it to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      const totalSupply = await token.totalSupply();
      expect(ownerBalance).to.equal(totalSupply);
    });

    it("Should verify global supply consistency", async function () {
      const expectedSupply = ethers.utils.parseUnits(initialSupply.toString(), 18);
      expect(await token.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe("Transfer Operations", function () {
    it("Should transfer tokens between accounts and update balances", async function () {
      const amount = ethers.utils.parseUnits("100", 18);
      await token.transfer(addr1.address, amount);

      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(amount);

      const ownerBalance = await token.balanceOf(owner.address);
      const initialOwnerBalance = ethers.utils.parseUnits(initialSupply.toString(), 18);
      expect(ownerBalance).to.equal(initialOwnerBalance.sub(amount));
    });

    it("Should emit Transfer event with correct parameters", async function () {
      const amount = ethers.utils.parseUnits("50", 18);
      await expect(token.transfer(addr1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, amount);
    });

    it("Should handle edge case: transferring to oneself", async function () {
      const amount = ethers.utils.parseUnits("10", 18);
      const initialBalance = await token.balanceOf(owner.address);
      await token.transfer(owner.address, amount);
      const finalBalance = await token.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance);
    });
  });

  describe("Negative Tests & Reverts", function () {
    it("Should fail when sender does not have enough balance", async function () {
      const amount = ethers.utils.parseUnits("1001", 18);
      await expect(token.transfer(addr1.address, amount))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should fail when transferring from an account with zero balance", async function () {
      const amount = ethers.utils.parseUnits("1", 18);
      await expect(token.connect(addr1).transfer(addr2.address, amount))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Gas Estimation & Storage Verification", function () {
    it("Should estimate gas for a valid transfer", async function () {
      const amount = ethers.utils.parseUnits("1", 18);
      const gasEstimate = await token.estimateGas.transfer(addr1.address, amount);
      expect(gasEstimate).to.be.gt(0);
    });

    it("Should verify storage state through direct mapping access", async function () {
      const amount = ethers.utils.parseUnits("250", 18);
      await token.transfer(addr1.address, amount);
      const storedBalance = await token.balanceOf(addr1.address);
      expect(storedBalance).to.equal(amount);
    });
  });
});