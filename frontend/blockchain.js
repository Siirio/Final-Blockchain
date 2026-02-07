export class BlockchainService {
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
        if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error("MetaMask is not installed.");
        }
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
    }

    async connect() {
        if (!this.provider) await this.init();

        const network = await this.provider.getNetwork();
        if (!this.supportedNetworks[network.chainId]) {
            throw new Error(`Unsupported Network (ChainID: ${network.chainId}). Please switch to Sepolia, Holesky, or Local.`);
        }

        const accounts = await this.provider.send("eth_requestAccounts", []);
        this.signer = this.provider.getSigner();
        this.tokenContract = new ethers.Contract(this.tokenAddr, this.tokenAbi, this.signer);
        this.crowdContract = new ethers.Contract(this.crowdAddr, this.crowdAbi, this.signer);

        return {
            address: accounts[0],
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
        const tx = await this.tokenContract.transfer(to, ethers.utils.parseEther(amount.toString()));
        return tx;
    }

    async getCampaignCount() {
        if (!this.crowdContract) throw new Error("Not connected");
        const count = await this.crowdContract.campaignCount();
        return count.toNumber();
    }

    async getCampaign(id) {
        if (!this.crowdContract) throw new Error("Not connected");
        const c = await this.crowdContract.getCampaign(id);
        return {
            id: c.id.toNumber(),
            title: c.title,
            goal: ethers.utils.formatEther(c.goal),
            deadline: c.deadline.toNumber(),
            creator: c.creator,
            totalRaised: ethers.utils.formatEther(c.totalRaised),
            finalized: c.finalized
        };
    }

    async createCampaign(title, goalEth, durationSeconds) {
        if (!this.crowdContract) throw new Error("Not connected");
        const goalWei = ethers.utils.parseEther(goalEth.toString());
        const tx = await this.crowdContract.createCampaign(title, goalWei, durationSeconds);
        return tx;
    }

    async contribute(campaignId, amountEth) {
        if (!this.crowdContract) throw new Error("Not connected");
        const tx = await this.crowdContract.contribute(campaignId, {
            value: ethers.utils.parseEther(amountEth.toString())
        });
        return tx;
    }

    async finalizeCampaign(campaignId) {
        if (!this.crowdContract) throw new Error("Not connected");
        const tx = await this.crowdContract.finalizeCampaign(campaignId);
        return tx;
    }

    setupListeners(onCampaignCreated, onContribution, onTransfer) {
        if (!this.crowdContract || !this.tokenContract) return;

        this.crowdContract.on("CampaignCreated", (id, title, goal, deadline, creator) => {
            onCampaignCreated(id.toNumber(), title, ethers.utils.formatEther(goal));
        });

        this.crowdContract.on("ContributionMade", (id, contributor, amount) => {
            onContribution(id.toNumber(), contributor, ethers.utils.formatEther(amount));
        });

        this.tokenContract.on("Transfer", (from, to, amount) => {
            onTransfer(from, to, ethers.utils.formatEther(amount));
        });
    }

    async estimateGas(method, ...args) {
        if (!this.signer) throw new Error("Not connected");
        let contract = (method === 'transfer') ? this.tokenContract : this.crowdContract;
        try {
            const estimate = await contract.estimateGas[method](...args);
            return estimate.toNumber();
        } catch (error) { return "N/A"; }
    }

    async getGasPrice() {
        const price = await this.provider.getGasPrice();
        return ethers.utils.formatUnits(price, "gwei");
    }
}