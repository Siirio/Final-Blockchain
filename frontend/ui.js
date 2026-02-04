import { RNTService } from './blockchain.js';
import { ADDR, ABI } from './config.js';

class UIManager {
    constructor() {
        this.rnt = new RNTService(ADDR, ABI);
        this.connectBtn = document.getElementById('connectBtn');
        this.sendBtn = document.getElementById('sendBtn');
        this.statusEl = document.getElementById('status');
        this.balanceEl = document.getElementById('balance');
        this.toAddrInput = document.getElementById('toAddr');
        this.amountInput = document.getElementById('amount');
        this.gasEstimateEl = document.getElementById('gasEstimate');
        this.gasStatusEl = document.getElementById('gasStatus');
        this.userAddress = null;

        this.init();
    }

    init() {
        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', () => this.handleConnect());
        }
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.handleSend());
        }
        if (this.toAddrInput) {
            this.toAddrInput.addEventListener('input', () => this.updateGasEstimate());
        }
        if (this.amountInput) {
            this.amountInput.addEventListener('input', () => this.updateGasEstimate());
        }
    }

    updateStatus(message, isError = false) {
        if (this.statusEl) {
            this.statusEl.innerText = isError ? `Error: ${message}` : message;
            this.statusEl.style.color = isError ? '#ff4444' : '#ffffff';
        }
    }

    async refreshBalance() {
        if (!this.userAddress) return;
        try {
            const balance = await this.rnt.getBalance(this.userAddress);
            if (this.balanceEl) {
                this.balanceEl.innerText = `Balance: ${balance} RNT`;
            }
        } catch (err) {
            console.error(err);
        }
    }

    async updateGasEstimate() {
        const to = this.toAddrInput.value;
        const amt = this.amountInput.value;
        if (!to || !amt || !this.userAddress) return;

        try {
            const gas = await this.rnt.estimateGas(to, amt);
            this.gasEstimateEl.innerText = `Estimated Gas: ${gas}`;
            this.gasStatusEl.innerText = "Transaction looks valid";
            this.gasStatusEl.style.color = "#44ff44";
        } catch (err) {
            const failMsg = await this.rnt.estimateFailingGas(to, amt);
            this.gasEstimateEl.innerText = "Estimated Gas: -";
            this.gasStatusEl.innerText = failMsg;
            this.gasStatusEl.style.color = "#ff4444";
        }
    }

    async handleConnect() {
        try {
            this.updateStatus("Connecting...");
            this.userAddress = await this.rnt.connect();
            this.updateStatus(`Connected: ${this.userAddress}`);
            await this.refreshBalance();
            this.rnt.onTransfer((from, to, value) => {
                if (from.toLowerCase() === this.userAddress.toLowerCase() ||
                    to.toLowerCase() === this.userAddress.toLowerCase()) {
                    this.refreshBalance();
                }
            });
            if (this.sendBtn) this.sendBtn.disabled = false;
        } catch (err) {
            this.updateStatus(err.message, true);
        }
    }

    async handleSend() {
        const to = this.toAddrInput.value;
        const amt = this.amountInput.value;

        if (!to || !amt) {
            this.updateStatus("Please fill in both recipient and amount", true);
            return;
        }

        try {
            this.updateStatus("Processing...");
            if (this.sendBtn) this.sendBtn.disabled = true;
            await this.rnt.sendTokens(to, amt);
            this.updateStatus("Transfer Successful!");
            this.toAddrInput.value = '';
            this.amountInput.value = '';
        } catch (err) {
            if (err.code === 4001) {
                this.updateStatus("Transaction rejected by user", true);
            } else {
                this.updateStatus(`Transfer Failed: ${err.message}`, true);
            }
        } finally {
            if (this.sendBtn) this.sendBtn.disabled = false;
            this.updateGasEstimate();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
});
