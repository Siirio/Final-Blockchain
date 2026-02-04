const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding System", function () {
    let Token, token, Crowdfunding, crowdfunding;
    let owner, addr1, addr2;
    let initialSupply = 1000000;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        Token = await ethers.getContractFactory("RNTtoken");
        token = await Token.deploy(initialSupply);
        await token.deployed();

        Crowdfunding = await ethers.getContractFactory("Crowdfunding");
        crowdfunding = await Crowdfunding.deploy(token.address);
        await crowdfunding.deployed();

        await token.transferOwnership(crowdfunding.address);
    });

    describe("Token Setup", function () {
        it("Token should have correct name and symbol", async function () {
            expect(await token.name()).to.equal("RNT Token");
            expect(await token.symbol()).to.equal("RNT");
        });

        it("Crowdfunding contract should be the owner of the token", async function () {
            expect(await token.owner()).to.equal(crowdfunding.address);
        });
    });

    describe("Campaign Creation", function () {
        it("Should create a new campaign", async function () {
            await crowdfunding.createCampaign("Test Campaign", ethers.utils.parseEther("1"), 3600);
            const campaign = await crowdfunding.campaigns(1);
            expect(campaign.title).to.equal("Test Campaign");
            expect(campaign.goal).to.equal(ethers.utils.parseEther("1"));
            expect(campaign.creator).to.equal(owner.address);
        });

        it("Should fail if goal is 0", async function () {
            await expect(crowdfunding.createCampaign("Fail", 0, 3600)).to.be.revertedWith("Goal must be greater than 0");
        });
    });

    describe("Contributions", function () {
        beforeEach(async function () {
            await crowdfunding.createCampaign("Test Campaign", ethers.utils.parseEther("1"), 3600);
        });

        it("Should allow contributions and mint tokens", async function () {
            const contributionAmount = ethers.utils.parseEther("0.5");
            await crowdfunding.connect(addr1).contribute(1, { value: contributionAmount });

            const campaign = await crowdfunding.campaigns(1);
            expect(campaign.totalRaised).to.equal(contributionAmount);

            const userBalance = await token.balanceOf(addr1.address);
            expect(userBalance).to.equal(contributionAmount.mul(100));
        });

        it("Should track individual contributions", async function () {
            const contributionAmount = ethers.utils.parseEther("0.5");
            await crowdfunding.connect(addr1).contribute(1, { value: contributionAmount });
            expect(await crowdfunding.contributions(1, addr1.address)).to.equal(contributionAmount);
        });

        it("Should fail if contributing to ended campaign", async function () {
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [3601]);
            await ethers.provider.send("evm_mine");

            await expect(crowdfunding.connect(addr1).contribute(1, { value: 100 })).to.be.revertedWith("Campaign has ended");
        });
    });

    describe("Finalization", function () {
        beforeEach(async function () {
            await crowdfunding.createCampaign("Test Campaign", ethers.utils.parseEther("1"), 3600);
        });

        it("Should allow finalization when goal reached", async function () {
            await crowdfunding.connect(addr1).contribute(1, { value: ethers.utils.parseEther("1.1") });
            const initialCreatorBalance = await ethers.provider.getBalance(owner.address);

            await crowdfunding.finalizeCampaign(1);

            const campaign = await crowdfunding.campaigns(1);
            expect(campaign.finalized).to.be.true;

            const finalCreatorBalance = await ethers.provider.getBalance(owner.address);
            expect(finalCreatorBalance).to.be.gt(initialCreatorBalance);
        });

        it("Should allow finalization when time ended even if goal not reached", async function () {
            await crowdfunding.connect(addr1).contribute(1, { value: ethers.utils.parseEther("0.5") });

            await ethers.provider.send("evm_increaseTime", [3601]);
            await ethers.provider.send("evm_mine");

            await crowdfunding.finalizeCampaign(1);
            const campaign = await crowdfunding.campaigns(1);
            expect(campaign.finalized).to.be.true;
        });

        it("Should fail if trying to finalize twice", async function () {
            await crowdfunding.connect(addr1).contribute(1, { value: ethers.utils.parseEther("1.1") });
            await crowdfunding.finalizeCampaign(1);
            await expect(crowdfunding.finalizeCampaign(1)).to.be.revertedWith("Campaign already finalized");
        });
    });
});
