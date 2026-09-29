/**
 * POS MODULE
 * 
 * Complete point-of-sale system:
 * - Ring up items
 * - Apply payment methods
 * - Record transactions (temporal + CRM + audit)
 * - Auto-adjust stock
 * - Generate receipt
 */

class POSModule {
  constructor() {
    this.cart = [];
    this.current_customer = null;
    this.current_actor = 'staff-cashier-01'; // Default; can be changed
    this.payment_methods = ['Cash', 'Mobile Money', 'Credit'];
  }

  /**
   * Add item to cart
   */
  addToCart(product_id, sku, product_name, quantity, unit_price) {
    // Check stock
    const product = window.productCatalog.getBySKU(sku);
    if (!product || product.stock < quantity) {
      return { success: false, message: 'Insufficient stock' };
    }

    // Check if already in cart
    const existing = this.cart.find(item => item.sku === sku);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({
        product_id: product_id,
        sku: sku,
        product_name: product_name,
        quantity: quantity,
        unit_price: unit_price,
        line_total: quantity * unit_price
      });
    }

    return { success: true, message: `Added ${quantity}x ${product_name}` };
  }

  /**
   * Remove item from cart
   */
  removeFromCart(sku) {
    this.cart = this.cart.filter(item => item.sku !== sku);
  }

  /**
   * Clear cart
   */
  clearCart() {
    this.cart = [];
    this.current_customer = null;
  }

  /**
   * Get cart total
   */
  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + item.line_total, 0);
  }

  /**
   * Get cart summary
   */
  getCartSummary() {
    return {
      items: this.cart.length,
      total: this.getCartTotal(),
      customer: this.current_customer,
      actor: this.current_actor
    };
  }

  /**
   * Set customer (optional)
   */
  setCustomer(customer_id, customer_name) {
    this.current_customer = { id: customer_id, name: customer_name };
  }

  /**
   * Set actor (operator)
   */
  setActor(actor_id) {
    this.current_actor = actor_id;
  }

  /**
   * Process payment & complete transaction
   */
  processPayment(payment_method, amount_tendered = null) {
    if (this.cart.length === 0) {
      return { success: false, message: 'Cart is empty' };
    }

    const total = this.getCartTotal();
    const tendered = amount_tendered || total;

    if (tendered < total) {
      return { success: false, message: `Insufficient payment. Need R${total.toFixed(2)}, got R${tendered.toFixed(2)}` };
    }

    // Generate transaction ID
    const txn_id = `txn-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Get current time + cycle
    const now = new Date();
    const cycle = window.temporalAnalytics.detectCycle(now);
    const timestamp_sast = window.temporalAnalytics.formatSAST(now);

    // Process each cart item
    this.cart.forEach(item => {
      // Record transaction in temporal analytics
      window.temporalAnalytics.recordTransaction(
        item.product_id,
        item.sku,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.line_total,
        payment_method,
        this.current_customer?.id || 'walk-in',
        this.current_customer?.name || 'Walk-in Customer'
      );

      // Adjust stock (update catalog)
      const product = window.productCatalog.getBySKU(item.sku);
      const stock_before = product.stock;
      const stock_after = stock_before - item.quantity;
      window.productCatalog.updateStock(item.sku, stock_after);

      // Log to audit trail
      window.stockAuditLedger.logMovement(
        'sale_deduction',
        item.product_id,
        item.sku,
        stock_before,
        stock_after,
        -item.quantity,
        this.current_actor,
        `POS sale: ${item.product_name}`,
        txn_id
      );

      // Record in CRM (if customer known)
      if (this.current_customer) {
        window.crmCohortAnalytics.recordTransaction(
          this.current_customer.id,
          this.current_customer.name,
          item.sku,
          item.line_total,
          payment_method,
          timestamp_sast,
          cycle
        );
      }
    });

    // Generate receipt
    const receipt = this.generateReceipt(txn_id, total, tendered, payment_method, timestamp_sast);

    // Clear cart for next transaction
    this.clearCart();

    return {
      success: true,
      txn_id: txn_id,
      total: total,
      amount_paid: tendered,
      change: (tendered - total).toFixed(2),
      receipt: receipt
    };
  }

  /**
   * Generate receipt text
   */
  generateReceipt(txn_id, total, tendered, payment_method, timestamp) {
    let receipt = '═══════════════════════════════════════\n';
    receipt += '        Lomo\'s Miscellaneous\n';
    receipt += '═══════════════════════════════════════\n\n';

    receipt += `Date/Time: ${timestamp}\n`;
    receipt += `Transaction ID: ${txn_id}\n`;
    receipt += `Operator: ${this.current_actor}\n`;

    if (this.current_customer) {
      receipt += `Customer: ${this.current_customer.name}\n`;
    }

    receipt += '\n───────────────────────────────────────\n';
    receipt += 'Item                      Qty    Total\n';
    receipt += '───────────────────────────────────────\n';

    this.cart.forEach(item => {
      const name = item.product_name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(4);
      const lt = item.line_total.toFixed(2).padStart(8);
      receipt += `${name} ${qty}x   R${lt}\n`;
    });

    receipt += '───────────────────────────────────────\n';
    receipt += `SUBTOTAL:                     R${total.toFixed(2).padStart(8)}\n`;
    receipt += `Payment Method:              ${payment_method}\n`;
    receipt += `Amount Tendered:             R${tendered.toFixed(2).padStart(8)}\n`;
    receipt += `Change:                      R${(tendered - total).toFixed(2).padStart(8)}\n`;
    receipt += '\n═══════════════════════════════════════\n';
    receipt += '      Thank you for shopping!\n';
    receipt += '═══════════════════════════════════════\n';

    return receipt;
  }

  /**
   * Void transaction (requires CEO authority)
   * Creates new "reset" entry in audit trail
   */
  voidTransaction(txn_id, actor_id, reason) {
    // Check authority (CEO only)
    const validation = window.actorRegistry.validateAuthority(actor_id, 4); // Authority level 4
    if (!validation.valid) {
      return { success: false, message: validation.reason };
    }

    // Log void (creates new audit entry, doesn't delete old one)
    window.stockAuditLedger.logMovement(
      'manual_adjustment',
      0,
      'VOID',
      0,
      0,
      0,
      actor_id,
      `Void transaction: ${txn_id} - Reason: ${reason}`,
      txn_id
    );

    return { success: true, message: `Transaction ${txn_id} voided by ${validation.actor.name}` };
  }

  /**
   * Get available products for sale
   */
  getAvailableProducts() {
    const products = window.productCatalog.getAll();
    return products.filter(p => p.stock > 0);
  }

  /**
   * Get daily sales summary
   */
  getDailySummary() {
    const today = new Date().toISOString().slice(0, 10);
    const txns = window.temporalAnalytics.query({
      date_from: today,
      date_to: today
    });

    let total_sales = 0;
    let total_qty = 0;
    const by_payment = {};

    txns.forEach(txn => {
      total_sales += txn.total_amount || 0;
      total_qty += txn.quantity || 0;
      const pm = txn.payment_type || 'Unknown';
      by_payment[pm] = (by_payment[pm] || 0) + (txn.total_amount || 0);
    });

    return {
      date: today,
      total_transactions: txns.length,
      total_sales: total_sales.toFixed(2),
      total_quantity: total_qty,
      by_payment_method: by_payment
    };
  }
}

// Global instance
window.posModule = new POSModule();
