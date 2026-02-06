export class RNTService {
  constructor(tokenAddr, tokenAbi, crowdAddr, crowdAbi) {
    this.tokenAddr = tokenAddr;
    this.tokenAbi = tokenAbi;
    this.crowdAddr = crowdAddr;
    this.crowdAbi = crowdAbi;

    this.provider = null;
    this.signer = null;
    this.tokenContract = null;
    this.crowdContract = null;

    this.supportedNetworks = {
      11155111: "Sepolia",
      17000: "Holesky",
      31337: "Hardhat Local"
    };
  }

  async init() {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed.");
    }
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
  }

  async connect() {
    if (!this.provider) await this.init();

    const network = await this.provider.getNetwork();
    if (!this.supportedNetworks[network.chainId]) {
      throw new Error(
        `Unsupported Network (ChainID: ${network.chainId}). Switch to Sepolia, Holesky, or Local.`
      );
    }

    const accounts = await this.provider.send("eth_requestAccounts", []);
    this.signer = this.provider.getSigner();

    this.tokenContract = new ethers.Contract(this.tokenAddr, this.tokenAbi, this.signer);

    if (this.crowdAddr && this.crowdAbi && this.crowdAbi.length) {
      this.crowdContract = new ethers.Contract(this.crowdAddr, this.crowdAbi, this.signer);
    }

    return {
      address: accounts[0],
      chainId: network.chainId,
      networkName: this.supportedNetworks[network.chainId],
      explorerUrl: this.getExplorerUrl(network.chainId)
    };
  }

  getExplorerUrl(chainId) {
    if (chainId === 11155111) return "https://sepolia.etherscan.io";
    if (chainId === 17000) return "https://holesky.etherscan.io";
    return "";
  }

  async getTokenBalance(address) {
    if (!this.tokenContract) throw new Error("Not connected");
    const balance = await this.tokenContract.balanceOf(address);
    return ethers.utils.formatEther(balance);
  }

  async transferTokens(to, amount) {
    if (!this.tokenContract) throw new Error("Not connected");
    const tx = await this.tokenContract.transfer(
      to,
      ethers.utils.parseEther(amount.toString())
    );
    return tx;
  }

  setupListeners(onContribution, onTransfer) {
    if (this.crowdContract && onContribution) {
      this.crowdContract.on("ContributionMade", (id, contributor, amount) => {
        onContribution(id.toNumber(), contributor, ethers.utils.formatEther(amount));
      });
    }

    if (this.tokenContract && onTransfer) {
      this.tokenContract.on("Transfer", (from, to, amount) => {
        onTransfer(from, to, ethers.utils.formatEther(amount));
      });
    }
  }

  async estimateTransferGas(to, amount) {
    if (!this.signer || !this.tokenContract) throw new Error("Not connected");
    const wei = ethers.utils.parseEther(amount.toString());
    const est = await this.tokenContract.estimateGas.transfer(to, wei);
    return est.toNumber();
  }

  async getBalance(addr) {
    return await this.getTokenBalance(addr);
  }

  async sendTokens(to, amount) {
    const tx = await this.transferTokens(to, amount);
    await tx.wait();
    return tx;
  }

  onTransfer(cb) {
    this.setupListeners(null, cb);
  }

  async estimateGas(to, amount) {
    return await this.estimateTransferGas(to, amount);
  }
}
