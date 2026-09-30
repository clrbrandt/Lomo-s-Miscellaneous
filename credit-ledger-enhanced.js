// Lomo's Miscellaneous - Enhanced Credit Ledger Module
// Supports part-payments and manual entries. Older records (amount + status only) still work.
class CreditLedgerSystem {
    constructor() {
        this.ledgerStorageKey = 'lomos_credit_ledger';
        this.records = JSON.parse(localStorage.getItem(this.ledgerStorageKey)) || [];
    }

    save() {
        localStorage.setItem(this.ledgerStorageKey, JSON.stringify(this.records));
    }

    round2(n) {
        return Math.round(n * 100) / 100;
    }

    recordCredit(saleId, customerName, amount, dateStr, product) {
        const creditEntry = {
            id: saleId || Date.now(),
            customer: String(customerName).trim(),
            amount: this.round2(parseFloat(amount)),
            paid: 0,
            payments: [],
            date: dateStr || new Date().toISOString(),
            product: product,
            status: 'Outstanding',
            repaidDate: null
        };
        this.records.unshift(creditEntry);
        this.save();
        return creditEntry;
    }

    // Manually log an amount owed (not tied to a POS sale)
    addManualCredit(customerName, amount, note) {
        const amt = parseFloat(amount);
        if (!customerName || !String(customerName).trim()) return { success: false, message: 'Customer name is required.' };
        if (isNaN(amt) || amt <= 0) return { success: false, message: 'Enter an amount above R0.' };
        const entry = this.recordCredit('manual-' + Date.now(), customerName, amt, null, note || 'Manual entry');
        return { success: true, entry, message: `R${amt.toFixed(2)} added to ${entry.customer}'s credit.` };
    }

    // What is still owed on one entry
    getBalance(entry) {
        if (entry.status !== 'Outstanding') return 0;
        return this.round2(entry.amount - (entry.paid || 0));
    }

    getCustomerBalance(customerName) {
        return this.round2(this.getCustomerCreditHistory(customerName)
            .reduce((sum, r) => sum + this.getBalance(r), 0));
    }

    // [{ customer, balance, entries }] for everyone who still owes
    getOutstandingByCustomer() {
        const groups = {};
        this.records.forEach(r => {
            const bal = this.getBalance(r);
            if (bal <= 0) return;
            const key = r.customer.toLowerCase();
            if (!groups[key]) groups[key] = { customer: r.customer, balance: 0, entries: [] };
            groups[key].balance = this.round2(groups[key].balance + bal);
            groups[key].entries.push(r);
        });
        return Object.values(groups).sort((a, b) => b.balance - a.balance);
    }

    // Log a payment against a customer; clears their oldest entries first
    recordPayment(customerName, amount, note) {
        const amt = this.round2(parseFloat(amount));
        if (!customerName || !String(customerName).trim()) return { success: false, message: 'Customer name is required.' };
        if (isNaN(amt) || amt <= 0) return { success: false, message: 'Enter a payment above R0.' };

        const open = this.getCustomerCreditHistory(customerName)
            .filter(r => this.getBalance(r) > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        const owed = this.round2(open.reduce((s, r) => s + this.getBalance(r), 0));

        if (owed <= 0) return { success: false, message: `${customerName} has no outstanding credit.` };
        if (amt > owed) return { success: false, message: `Payment R${amt.toFixed(2)} is more than the R${owed.toFixed(2)} owed.` };

        let left = amt;
        const now = new Date().toISOString();
        for (const r of open) {
            if (left <= 0) break;
            const part = Math.min(left, this.getBalance(r));
            r.paid = this.round2((r.paid || 0) + part);
            r.payments = r.payments || [];
            r.payments.push({ date: now, amount: part, note: note || '' });
            if (this.getBalance({ ...r, status: 'Outstanding' }) <= 0) {
                r.status = 'Settled';
                r.repaidDate = now;
            }
            left = this.round2(left - part);
        }
        this.save();
        const remaining = this.round2(owed - amt);
        return {
            success: true,
            remaining,
            message: remaining > 0
                ? `R${amt.toFixed(2)} received. ${customerName} still owes R${remaining.toFixed(2)}.`
                : `R${amt.toFixed(2)} received. ${customerName}'s credit is cleared.`
        };
    }

    settleCredit(entryId) {
        const entry = this.records.find(r => r.id === entryId);
        if (entry && entry.status === 'Outstanding') {
            const rest = this.getBalance(entry);
            entry.payments = entry.payments || [];
            if (rest > 0) entry.payments.push({ date: new Date().toISOString(), amount: rest, note: 'Settled in full' });
            entry.paid = entry.amount;
            entry.status = 'Settled';
            entry.repaidDate = new Date().toISOString();
            this.save();
            return true;
        }
        return false;
    }

    getCustomerCreditHistory(customerName) {
        const name = String(customerName).trim().toLowerCase();
        return this.records.filter(r => r.customer.toLowerCase() === name);
    }

    calculateEligibility(customerName, customerTotalSpend, customerTransactions) {
        const history = this.getCustomerCreditHistory(customerName);
        const unpaidCount = history.filter(r => r.status === 'Outstanding').length;
        
        if (unpaidCount > 1) {
            return { eligible: false, limit: 0, reason: 'Has multiple outstanding credit balances.' };
        }
        if (customerTransactions >= 3 || customerTotalSpend >= 500) {
            return { eligible: true, limit: 500.00, reason: 'Approved for short-term credit based on regular activity.' };
        }
        return { eligible: false, limit: 0, reason: 'Building history; need more transaction frequency.' };
    }
}

window.creditLedger = new CreditLedgerSystem();
