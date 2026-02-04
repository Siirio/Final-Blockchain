const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Token = await hre.ethers.getContractFactory("RNTtoken");
  const token = await Token.deploy(1000);

  await token.deployed();

  console.log("-----------------------------------------------");
  console.log("RNTtoken deployed to:", token.address);
  console.log("-----------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});