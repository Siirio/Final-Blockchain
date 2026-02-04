const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Token = await hre.ethers.getContractFactory("RNTtoken");
  const token = await Token.deploy(1000000);
  await token.deployed();
  console.log("RNTtoken deployed to:", token.address);

  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const crowdfunding = await Crowdfunding.deploy(token.address);
  await crowdfunding.deployed();
  console.log("Crowdfunding deployed to:", crowdfunding.address);

  const tx = await token.transferOwnership(crowdfunding.address);
  await tx.wait();
  console.log("RNTtoken ownership transferred to Crowdfunding contract");

  console.log("-----------------------------------------------");
  console.log("Deployment finished successfully!");
  console.log("TOKEN_ADDRESS:", token.address);
  console.log("CROWDFUNDING_ADDRESS:", crowdfunding.address);
  console.log("-----------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});