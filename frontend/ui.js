import { BlockchainService } from './blockchain.js';
import { TOKEN_ADDR, TOKEN_ABI, CROWDFUNDING_ADDR, CROWDFUNDING_ABI } from './config.js';

class UIManager {
    constructor() {
        this.blockchain = new BlockchainService(TOKEN_ADDR, TOKEN_ABI, CROWDFUNDING_ADDR, CROWDFUNDING_ABI);
        this.userAddress = null;
        this.explorerUrl = "";

        // Elements
        this.connectBtn = document.getElementById('connectBtn');
        this.rntBalanceEl = document.getElementById('rntBalance');
        this.ethBalanceEl = document.getElementById('ethBalance');
        this.userAddressEl = document.getElementById('userAddress');
        this.networkStatusEl = document.getElementById('networkStatus');
        this.campaignListEl = document.getElementById('campaignList');
        this.transferBtn = document.getElementById('transferBtn');
        this.createCampaignBtn = document.getElementById('createCampaignBtn');
        this.toastEl = document.getElementById('toast');

        // Navigation
        this.navLinks = document.querySelectorAll('.nav-links li');
        this.sections = document.querySelectorAll('.section');

        // Modal
        this.modalOverlay = document.getElementById('modalOverlay');
        this.openCreateModalBtn = document.getElementById('openCreateModal');
        this.closeModalBtn = document.getElementById('closeModal');

        this.init();
    }

    init() {
        this.connectBtn.addEventListener('click', () => this.handleConnect());
        this.transferBtn.addEventListener('click', () => this.handleTransfer());
        this.createCampaignBtn.addEventListener('click', () => this.handleCreateCampaign());

        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const sectionId = link.getAttribute('data-section');
                this.switchSection(sectionId);
                this.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        this.openCreateModalBtn.addEventListener('click', () => this.modalOverlay.style.display = 'flex');
        this.closeModalBtn.addEventListener('click', () => this.modalOverlay.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.modalOverlay.style.display = 'none';
        });

        document.getElementById('transferAmount').addEventListener('input', () => this.updateTransferGas());
        document.getElementById('transferTo').addEventListener('input', () => this.updateTransferGas());

        if (window.ethereum && window.ethereum.selectedAddress) {
            this.handleConnect();
        }
    }

    switchSection(sectionId) {
        this.sections.forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        if (sectionId === 'crowd-section' && this.userAddress) {
            this.loadCampaigns();
        }
    }

    showToast(message, isError = false, txHash = null) {
        let content = `${isError ? 'ERROR //' : 'SYSTEM //'} ${message.toUpperCase()}`;
        if (txHash && this.explorerUrl) {
            content += ` <br><a href="${this.explorerUrl}/tx/${txHash}" target="_blank" style="color:var(--primary); font-size: 0.6rem;">VIEW ON EXPLORER //</a>`;
        }
        this.toastEl.innerHTML = content;
        this.toastEl.style.borderColor = isError ? 'var(--danger)' : 'var(--border)';
        this.toastEl.classList.add('show');
        setTimeout(() => this.toastEl.classList.remove('show'), 6000);
    }

    async handleConnect() {
        try {
            this.connectBtn.innerText = "SYNCING...";
            if (!this.blockchain.provider) await this.blockchain.init();
            const connection = await this.blockchain.connect();
            this.userAddress = connection.address;
            this.explorerUrl = connection.explorerUrl;

            this.connectBtn.innerText = "ACTIVE";
            this.connectBtn.disabled = true;
            this.userAddressEl.innerText = `ID // ${this.userAddress.slice(0, 12)}...`;
            this.networkStatusEl.innerText = `NETWORK // ${connection.networkName.toUpperCase()}`;
            this.networkStatusEl.style.color = "var(--primary)";

            await this.updateBalances();
            this.setupBlockchainListeners();

            if (document.getElementById('crowd-section').classList.contains('active')) {
                this.loadCampaigns();
            }

            this.showToast("Handshake established");
        } catch (error) {
            this.showToast(error.message, true);
            this.connectBtn.innerText = "INITIATE PROTOCOL";
        }
    }

    setupBlockchainListeners() {
        this.blockchain.setupListeners(
            (id, contributor, amount) => {
                this.showToast(`Contribution detected: ${amount} ETH to Node #${id}`);
                this.loadCampaigns();
                this.updateBalances();
            },
            (from, to, amount) => {
                if (to.toLowerCase() === this.userAddress.toLowerCase()) {
                    this.showToast(`Tokens received: ${amount} RNT`);
                    this.updateBalances();
                }
            }
        );
    }

    async updateBalances() {
        if (!this.userAddress) return;
        try {
            const rnt = await this.blockchain.getTokenBalance(this.userAddress);
            const eth = await this.blockchain.provider.getBalance(this.userAddress);
            this.rntBalanceEl.innerText = `${parseFloat(rnt).toFixed(2)}`;
            this.ethBalanceEl.innerText = `${parseFloat(ethers.utils.formatEther(eth)).toFixed(4)}`;
        } catch (error) { }
    }

    async handleTransfer() {
        const to = document.getElementById('transferTo').value;
        const amount = document.getElementById('transferAmount').value;
        if (!to || !amount) return this.showToast("Parameters missing", true);

        try {
            this.showToast("Broadcasting to mempool...");
            const tx = await this.blockchain.transferTokens(to, amount);
            this.showToast("Transaction sent", false, tx.hash);
            await tx.wait();
            this.showToast("Block verified", false, tx.hash);
            this.updateBalances();
        } catch (error) {
            this.showToast(this.parseError(error), true);
        }
    }

    async handleCreateCampaign() {
        const title = document.getElementById('newTitle').value;
        const goal = document.getElementById('newGoal').value;
        const minutes = document.getElementById('newDuration').value;

        if (!title || !goal || !minutes) return this.showToast("Incomplete profile", true);

        try {
            this.showToast("Deploying node...");
            const tx = await this.blockchain.createCampaign(title, goal, parseInt(minutes) * 60);
            this.showToast("Transaction pending", false, tx.hash);
            await tx.wait();
            this.showToast("Node registered", false, tx.hash);
            this.modalOverlay.style.display = 'none';
            this.loadCampaigns();
        } catch (error) {
            this.showToast(this.parseError(error), true);
        }
    }

    async loadCampaigns() {
        if (!this.userAddress) return;
        try {
            console.log("SYNC // Accessing repository...");
            const count = await this.blockchain.getCampaignCount();
            console.log(`SYNC // Nodes detected: ${count}`);
            this.campaignListEl.innerHTML = '';

            if (count === 0) {
                this.campaignListEl.innerHTML = '<div class="loader">REPOSITORY EMPTY //</div>';
                return;
            }

            for (let i = count; i >= 1; i--) {
                try {
                    const c = await this.blockchain.getCampaign(i);
                    this.renderCampaign(c);
                } catch (err) {
                    console.error(`SYNC // Error fetching node #${i}:`, err);
                }
            }
        } catch (error) {
            console.error("SYNC // Critical failure:", error);
            this.campaignListEl.innerHTML = `<div class="loader">SYNC ERROR // CHECK CONSOLE</div>`;
        }
    }

    renderCampaign(c) {
        const card = document.createElement('div');
        card.className = 'campaign-card';
        const progress = (parseFloat(c.totalRaised) / parseFloat(c.goal)) * 100;
        const isEnded = Date.now() / 1000 > c.deadline;

        card.innerHTML = `
            <div class="campaign-meta">
                <span>NODE #${c.id}</span>
                <span>${isEnded ? 'OFFLINE' : 'OPERATIONAL'}</span>
            </div>
            <h3>${c.title}</h3>
            <div class="progress-container">
                <div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div></div>
            </div>
            <div class="stats-row">
                <span>RAISED // ${c.totalRaised} ETH</span>
                <span>GOAL // ${c.goal} ETH</span>
            </div>
            ${!c.finalized && !isEnded ? `
                <div class="contribute-form">
                    <input type="number" id="amt-${c.id}" placeholder="VAL">
                    <button class="btn-glass" onclick="window.ui.contribute(${c.id})">FUND</button>
                </div>
            ` : ''}
            ${isEnded && !c.finalized ? `
                <button class="btn-glass w-100 mt-2" onclick="window.ui.finalize(${c.id})">COMMAND // WITHDRAW</button>
            ` : ''}
            ${c.finalized ? '<div class="status-badge mt-2" style="font-size: 0.6rem; color: var(--text-muted);">STATUS // DECOMMISSIONED</div>' : ''}
        `;
        this.campaignListEl.appendChild(card);
    }

    async contribute(id) {
        const amount = document.getElementById(`amt-${id}`).value;
        if (!amount) return this.showToast("Value required", true);
        try {
            this.showToast("Injecting capital...");
            const tx = await this.blockchain.contribute(id, amount);
            this.showToast("Transaction processing", false, tx.hash);
            await tx.wait();
            this.showToast("Capital verified", false, tx.hash);
        } catch (error) {
            this.showToast(this.parseError(error), true);
        }
    }

    async finalize(id) {
        try {
            this.showToast("Terminating operational window...");
            const tx = await this.blockchain.finalizeCampaign(id);
            await tx.wait();
            this.showToast("Node decommissioned");
            this.loadCampaigns();
            this.updateBalances();
        } catch (error) {
            this.showToast(this.parseError(error), true);
        }
    }

    async updateTransferGas() {
        if (!this.userAddress) return;
        const to = document.getElementById('transferTo').value;
        const amount = document.getElementById('transferAmount').value;
        if (!to || !amount || !ethers.utils.isAddress(to)) return;
        try {
            const gas = await this.blockchain.estimateGas('transfer', to, ethers.utils.parseEther(amount));
            const gasPrice = await this.blockchain.getGasPrice();
            this.showToast(`GAS // ${gas} @ ${parseFloat(gasPrice).toFixed(1)} GWEI`);
        } catch (e) { }
    }

    parseError(error) {
        if (error.code === 4001) return "Request denied by user";
        if (error.message.includes("Insufficient balance")) return "Insufficient liquidity";
        return error.message.slice(0, 50) + "...";
    }
}

document.addEventListener('DOMContentLoaded', () => { window.ui = new UIManager(); });
