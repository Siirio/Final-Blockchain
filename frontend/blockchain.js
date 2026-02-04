export class RNTService {
    constructor(contractAddress, abi) {
        this.contractAddress = contractAddress;
        this.abi = abi;
        this.provider = null;
        this.signer = null;
        this.contract = null;
    }

    async init() {
        if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error("Web3 provider not found. Please install MetaMask.");
        }
        if (typeof ethers === 'undefined') {
            throw new Error("Ethers.js library not loaded.");
        }
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
    }

    async connect() {
        if (!this.provider) await this.init();
        await this.provider.send("eth_requestAccounts", []);
        this.signer = this.provider.getSigner();
        this.contract = new ethers.Contract(this.contractAddress, this.abi, this.signer);
        return await this.signer.getAddress();
    }

    async sendTokens(to, amount) {
        try {
            if (!this.contract) throw new Error("Contract not initialized. Connect wallet first.");
            if (!ethers.utils.isAddress(to)) {
                throw new Error("Invalid recipient address");
            }
            const amountInWei = ethers.utils.parseEther(amount.toString());
            const tx = await this.contract.transfer(to, amountInWei);
            return await tx.wait();
        } catch (error) {
            console.error("Transaction failed:", error);
            throw error;
        }
    }

    async getBalance(address) {
        try {
            if (!this.contract) throw new Error("Contract not initialized.");
            const balance = await this.contract.balanceOf(address);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error("Failed to fetch balance:", error);
            throw error;
        }
    }

    async onTransfer(callback) {
        if (!this.contract) return;
        this.contract.on("Transfer", (from, to, value) => {
            callback(from, to, ethers.utils.formatEther(value));
        });
    }

    async estimateGas(to, amount) {
        if (!this.contract) throw new Error("Contract not initialized.");
        try {
            const amountInWei = ethers.utils.parseEther(amount.toString());
            const estimate = await this.contract.estimateGas.transfer(to, amountInWei);
            return estimate.toString();
        } catch (error) {
            throw error;
        }
    }

    async estimateFailingGas(to, amount) {
        if (!this.contract) throw new Error("Contract not initialized.");
        try {
            const amountInWei = ethers.utils.parseEther(amount.toString());
            await this.contract.estimateGas.transfer(to, amountInWei);
        } catch (error) {
            if (error.error && error.error.data) {
                return "Fail detected: " + error.error.message;
            }
            return error.message;
        }
    }
}