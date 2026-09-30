/**
 * LOMO'S - CREDIT & STOCK CONTROLS
 * Loads AFTER the page's inline script (just before </body>).
 * Adds: Amount Paid field, Credit Lines card, stock +/- and Edit.
 * Uses the app's existing classes, so the look is unchanged.
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const money = n => 'R' + (Number(n) || 0).toFixed(2);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ACTOR = 'director-ops'; // same default the Replenish button uses
  const smallBtn = 'padding:4px 10px;';
  const smallInput = 'width:60px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:13px;';

  function refreshGov() {
    if (window.governanceUI && window.governanceUI.initialized) window.governanceUI.refresh();
  }

  /* ---------- Inject the extra fields / cards ---------- */
  function inject() {
    // 1. Amount Paid, under Payment Method in the cart card
    if (!$('pos-amount-paid')) {
      const grp = $('pos-payment-method').closest('.form-group');
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = '<label>Amount Paid (R)</label>' +
        '<input type="number" id="pos-amount-paid" min="0" step="0.01" placeholder="Blank = paid in full">';
      grp.after(div);
    }

    // 2. Credit Lines card, under the Customer card
    if (!$('pos-credit-list')) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML =
        '<h3 class="card-title">💳 Credit Lines</h3>' +
        '<div id="pos-credit-list" style="font-size: 12px; line-height: 1.8;"></div>' +
        '<div style="border-top: 1px solid var(--border); margin-top: 12px; padding-top: 12px;">' +
        '<div class="form-group"><label>Customer</label><input type="text" id="pos-credit-name" placeholder="Tap a name above or type"></div>' +
        '<div class="form-group"><label>Amount (R)</label><input type="number" id="pos-credit-amount" min="0" step="0.01" placeholder="0.00"></div>' +
        '<div class="form-group"><label>Note</label><input type="text" id="pos-credit-note" placeholder="Optional"></div>' +
        '<button class="btn" onclick="pos_creditAdd()">➕ Add Owed</button> ' +
        '<button class="btn btn-secondary" onclick="pos_creditPay()">✓ Log Payment</button>' +
        '</div>';
      $('pos-customer-name').closest('.card').after(card);
    }

    // 3. Edit Stock Record card (hidden until Edit is tapped)
    if (!$('inventory-edit-card')) {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = 'inventory-edit-card';
      card.style.display = 'none';
      card.innerHTML =
        '<h3 class="card-title" id="inventory-edit-title">✎ Edit Stock Record</h3>' +
        '<div class="form-group"><label>Sale Price (R)</label><input type="number" id="inv-edit-price" min="0" step="0.01"></div>' +
        '<div class="form-group"><label>Cost Price (R)</label><input type="number" id="inv-edit-cost" min="0" step="0.01"></div>' +
        '<div class="form-group"><label>Stock Count</label><input type="number" id="inv-edit-stock" min="0"></div>' +
        '<div class="form-group"><label>Reason</label><input type="text" id="inv-edit-reason" placeholder="Stock count, price change, etc."></div>' +
        '<button class="btn" onclick="inventory_saveEdit()">✓ Save Changes</button> ' +
        '<button class="btn btn-secondary" onclick="inventory_cancelEdit()">✕ Cancel</button>';
      $('inventory-stock-list').closest('.card').after(card);
    }
  }

  /* ---------- POS: credit lines ---------- */
  function renderCredit() {
    const box = $('pos-credit-list');
    if (!box || !window.creditLedger) return;
    const list = window.creditLedger.getOutstandingByCustomer();
    if (!list.length) {
      box.innerHTML = '<span style="color: var(--text-muted);">No outstanding credit</span>';
      return;
    }
    const total = list.reduce((s, c) => s + c.balance, 0);
    box.innerHTML = list.map(c =>
      `<div data-c="${esc(c.customer)}" onclick="pos_creditPick(this.dataset.c)" ` +
      'style="padding: 6px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; cursor: pointer;">' +
      `<span>👤 ${esc(c.customer)}</span><strong>${money(c.balance)}</strong></div>`
    ).join('') + `<div style="padding-top: 6px; text-align: right;"><strong>Total owing: ${money(total)}</strong></div>`;
  }

  window.pos_creditPick = function (name) {
    $('pos-credit-name').value = name;
    $('pos-credit-amount').focus();
  };

  window.pos_creditAdd = function () {
    const r = window.creditLedger.addManualCredit(
      $('pos-credit-name').value, $('pos-credit-amount').value, $('pos-credit-note').value.trim());
    alert(r.success ? '✓ ' + r.message : '❌ ' + r.message);
    if (r.success) { $('pos-credit-amount').value = ''; $('pos-credit-note').value = ''; }
    renderCredit();
  };

  window.pos_creditPay = function () {
    const r = window.creditLedger.recordPayment(
      $('pos-credit-name').value, $('pos-credit-amount').value, $('pos-credit-note').value.trim());
    alert(r.success ? '✓ ' + r.message : '❌ ' + r.message);
    if (r.success) { $('pos-credit-amount').value = ''; $('pos-credit-note').value = ''; }
    renderCredit();
  };

  /* ---------- POS: init + payment wrappers ---------- */
  const _posInit = window.pos_init;
  window.pos_init = function () {
    _posInit();
    renderCredit();
  };

  window.pos_processPayment = function () {
    const pos = window.posModule;
    const method = $('pos-payment-method').value;
    const raw = $('pos-amount-paid').value.trim();
    const name = $('pos-customer-name').value.trim();

    // Use whatever is typed in the customer fields, even if Set Customer wasn't tapped
    if (name && (!pos.current_customer || pos.current_customer.name !== name)) {
      pos.setCustomer($('pos-customer-id').value.trim() || 'walk-in', name);
    }

    const result = pos.processPayment(method, raw === '' ? null : raw);
    if (!result.success) {
      alert('❌ ' + result.message);
      return;
    }

    $('pos-receipt-output').textContent = result.receipt;
    alert(`✓ Transaction ${result.txn_id} completed!\n` + (result.credit_balance > 0
      ? `Paid: ${money(result.amount_paid)}\nOn credit: ${money(result.credit_balance)}`
      : `Change: R${result.change}`));

    $('pos-amount-paid').value = '';
    $('pos-customer-id').value = '';
    $('pos-customer-name').value = '';
    window.pos_init();
  };

  const _posClear = window.pos_clearCart;
  window.pos_clearCart = function () {
    _posClear();
    if (!window.posModule.cart.length) $('pos-amount-paid').value = '';
  };

  /* ---------- Inventory: list with +/- and Edit ---------- */
  window.inventory_renderStockList = function () {
    const products = window.productCatalog.getAll();
    $('inventory-stock-list').innerHTML = products.map(p => {
      const status = p.stock > 5 ? '✓' : '⚠️';
      return '<div style="padding: 6px 0; border-bottom: 1px solid var(--border);">' +
        `<div>${status} ${esc(p.product_name)} ${esc(p.size)}: <strong>${p.stock}</strong> units ` +
        `<span style="color: var(--text-muted);">(${money(p.unit_price)})</span></div>` +
        '<div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">' +
        `<button class="btn btn-secondary" style="${smallBtn}" onclick="inventory_adjust('${p.sku}', -1)">−</button>` +
        `<input type="number" id="adj-${p.sku}" value="1" min="1" style="${smallInput}">` +
        `<button class="btn" style="${smallBtn}" onclick="inventory_adjust('${p.sku}', 1)">+</button>` +
        `<button class="btn btn-secondary" style="${smallBtn}" onclick="inventory_openEdit('${p.sku}')">✎ Edit</button>` +
        '</div></div>';
    }).join('');
  };

  // Show size in the replenish dropdown (ActionWork R50 vs R30)
  const _invInit = window.inventory_init;
  window.inventory_init = function () {
    _invInit();
    Array.from($('inventory-product-select').options).forEach(o => {
      if (!o.value) return;
      const v = window.productCatalog.getBySKU(JSON.parse(o.value).sku);
      if (v) o.textContent = `${v.product_name} ${v.size} (Stock: ${v.stock})`;
    });
  };

  // Adjust ONE category's count up or down
  window.inventory_adjust = function (sku, sign) {
    const qty = parseInt($('adj-' + sku).value);
    const v = window.productCatalog.getBySKU(sku);
    if (!v) return;
    if (isNaN(qty) || qty <= 0) { alert('Enter a quantity above 0'); return; }
    const after = v.stock + sign * qty;
    if (after < 0) { alert(`Cannot remove ${qty}: only ${v.stock} in stock.`); return; }
    const reason = prompt('Reason for this adjustment:', sign > 0 ? 'Stock count correction (add)' : 'Stock count correction (remove)');
    if (reason === null) return;
    window.productCatalog.updateStock(v.product_id, sku, after);
    window.stockAuditLedger.logMovement('manual_adjustment', v.product_id, sku, v.stock, after,
      sign * qty, ACTOR, reason.trim() || 'Manual adjustment', null);
    window.inventory_init();
    refreshGov();
  };

  // Edit ONE stock record (price, cost, count)
  let editSku = null;
  window.inventory_openEdit = function (sku) {
    const v = window.productCatalog.getBySKU(sku);
    if (!v) return;
    editSku = sku;
    $('inventory-edit-title').textContent = `✎ Edit: ${v.product_name} ${v.size}`;
    $('inv-edit-price').value = v.unit_price;
    $('inv-edit-cost').value = v.costPrice;
    $('inv-edit-stock').value = v.stock;
    $('inv-edit-reason').value = '';
    $('inventory-edit-card').style.display = 'block';
    $('inventory-edit-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  window.inventory_cancelEdit = function () {
    editSku = null;
    $('inventory-edit-card').style.display = 'none';
  };

  window.inventory_saveEdit = function () {
    const cat = window.productCatalog;
    const v = editSku && cat.getBySKU(editSku);
    if (!v) return;
    const price = parseFloat($('inv-edit-price').value);
    const cost = parseFloat($('inv-edit-cost').value);
    const stock = parseInt($('inv-edit-stock').value);
    if ([price, cost, stock].some(n => isNaN(n) || n < 0)) { alert('Price, cost and stock must be 0 or more.'); return; }

    const notes = [];
    if (price !== v.unit_price) { cat.updatePrice(v.product_id, v.sku, price); notes.push(`price ${money(v.unit_price)} → ${money(price)}`); }
    if (cost !== v.costPrice) { cat.updateCost(v.product_id, v.sku, cost); notes.push(`cost ${money(v.costPrice)} → ${money(cost)}`); }
    if (stock !== v.stock) cat.updateStock(v.product_id, v.sku, stock);
    if (!notes.length && stock === v.stock) { alert('No changes to save.'); return; }

    const reason = $('inv-edit-reason').value.trim() || 'Manual edit';
    window.stockAuditLedger.logMovement('manual_adjustment', v.product_id, v.sku, v.stock, stock,
      stock - v.stock, ACTOR, notes.length ? `${reason} [${notes.join('; ')}]` : reason, null);

    alert(`✓ ${v.product_name} ${v.size} updated`);
    window.inventory_cancelEdit();
    window.inventory_init();
    refreshGov();
  };

  // Replenish: original passed the wrong arguments to updateStock, so stock never changed
  window.inventory_replenish = function () {
    const select = $('inventory-product-select');
    const qty = parseInt($('inventory-qty').value);
    const reason = $('inventory-reason').value;
    if (!select.value) { alert('Select a product'); return; }
    if (isNaN(qty) || qty <= 0) { alert('Enter a quantity above 0'); return; }

    const data = JSON.parse(select.value);
    const v = window.productCatalog.getBySKU(data.sku);
    const after = v.stock + qty;
    window.productCatalog.updateStock(v.product_id, v.sku, after);
    window.stockAuditLedger.logMovement('replenishment', v.product_id, v.sku, v.stock, after, qty, ACTOR, reason, null);

    alert(`✓ Replenished ${v.product_name} ${v.size}: ${qty} units`);
    select.value = '';
    $('inventory-qty').value = 10;
    $('inventory-reason').value = '';
    window.inventory_init();
    refreshGov();
  };

  /* ---------- Start ---------- */
  inject();
  window.pos_init();
  renderCredit();
})();
