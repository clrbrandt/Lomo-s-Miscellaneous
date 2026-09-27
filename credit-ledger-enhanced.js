// Lomo's Miscellaneous - Enhanced Credit Ledger Module
class CreditLedgerSystem {
    constructor() {
        this.ledgerStorageKey = 'lomos_credit_ledger';
        this.records = JSON.parse(localStorage.getItem(this.ledgerStorageKey)) || [];
    }

    save() {
        localStorage.setItem(this.ledgerStorageKey, JSON.stringify(this.records));
    }

    recordCredit(saleId, customerName, amount, dateStr, product) {
        const creditEntry = {
            id: saleId || Date.now(),
            customer: customerName,
            amount: parseFloat(amount),
            date: dateStr || new Date().toISOString(),
            product: product,
            status: 'Outstanding',
            repaidDate: null
        };
        this.records.unshift(creditEntry);
        this.save();
    }

    settleCredit(entryId) {
        const entry = this.records.find(r => r.id === entryId);
        if (entry && entry.status === 'Outstanding') {
            entry.status = 'Settled';
            entry.repaidDate = new Date().toISOString();
            this.save();
            return true;
        }
        return false;
    }

    getCustomerCreditHistory(customerName) {
        return this.records.filter(r => r.customer.toLowerCase() === customerName.toLowerCase());
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
