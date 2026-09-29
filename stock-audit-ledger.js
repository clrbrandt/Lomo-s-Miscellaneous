/**
 * STOCK AUDIT LEDGER
 * 
 * Immutable log of all inventory adjustments
 * - Replenishment (stock-in)
 * - Reset (system initialization or deliberate reset)
 * - Manual adjustments (admin corrections)
 * - Sales deductions (automatic from POS)
 * 
 * Governance-grade compliance:
 * Every change timestamped, reasons logged, before/after state captured
 * Queryable for audit trails, compliance reporting
 */

class StockAuditLedger {
  constructor() {
    this.ledger = JSON.parse(localStorage.getItem('lomos_stock_audit_ledger')) || [];
  }

  /**
   * Log stock movement
   * 
   * @param {string} adjustment_type - 'replenishment', 'reset', 'manual_adjustment', 'sale_deduction'
   * @param {number} product_id - Product ID
   * @param {string} sku - Variant SKU
   * @param {number} quantity_before - Stock level before change
   * @param {number} quantity_after - Stock level after change
   * @param {number} quantity_moved - Amount added/removed
   * @param {string} actor_id - Actor registry ID (CEO, Director, staff-name, etc.) or 'system', 'POS'
   * @param {string} reason - Why the change was made
   * @param {string} transaction_id - Related transaction ID (if applicable)
   */
  logMovement(adjustment_type, product_id, sku, quantity_before, quantity_after, quantity_moved, actor_id, reason, transaction_id = null) {
    const now = new Date();
    
    // Resolve actor from registry (with fallback for legacy/system actors)
    let actor_info = { 
      name: actor_id, 
      role: 'Unknown', 
      authority_level: 0 
    };
    
    if (window.actorRegistry && typeof window.actorRegistry.getActor === 'function') {
      const actor = window.actorRegistry.getActor(actor_id);
      if (actor) {
        actor_info = {
          name: actor.name,
          role: actor.role,
          authority_level: actor.authority_level
        };
      }
    }
    
    const entry = {
      id: `STOCK-${Date.now()}`,
      timestamp: now.toISOString(),
      timestamp_sast: this.formatSAST(now),
      hour: now.getHours(),
      date: now.toDateString(),
      
      adjustment_type: adjustment_type,
      product_id: product_id,
      sku: sku,
      
      quantity_before: quantity_before,
      quantity_after: quantity_after,
      quantity_moved: quantity_moved, // positive = replenished, negative = sold/removed
      
      actor_id: actor_id, // Reference to actor registry
      actor_name: actor_info.name,
      actor_role: actor_info.role,
      actor_authority_level: actor_info.authority_level,
      
      reason: reason,
      transaction_id: transaction_id,
      
      delta_percentage: quantity_before > 0 ? ((quantity_moved / quantity_before) * 100).toFixed(1) : 'N/A'
    };

    this.ledger.unshift(entry); // Most recent first
    this.persist();
    return entry;
  }

  /**
   * Format timestamp in SAST (UTC+2)
   */
  formatSAST(dateObj) {
    const offset = 2 * 60;
    const sast = new Date(dateObj.getTime() + offset * 60 * 1000);
    const year = sast.getUTCFullYear();
    const month = String(sast.getUTCMonth() + 1).padStart(2, '0');
    const day = String(sast.getUTCDate()).padStart(2, '0');
    const hours = String(sast.getUTCHours()).padStart(2, '0');
    const minutes = String(sast.getUTCMinutes()).padStart(2, '0');
    const seconds = String(sast.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Query ledger by filters
   */
  query(filters = {}) {
    let results = this.ledger.slice();

    // Adjustment type filter
    if (filters.adjustment_types && filters.adjustment_types.length > 0) {
      results = results.filter(e => filters.adjustment_types.includes(e.adjustment_type));
    }

    // Product/SKU filter
    if (filters.skus && filters.skus.length > 0) {
      results = results.filter(e => filters.skus.includes(e.sku));
    }

    // Actor filter (who made the change)
    // Support both actor_id and actor_name for backwards compatibility
    if (filters.actors && filters.actors.length > 0) {
      results = results.filter(e => 
        filters.actors.includes(e.actor_id) || 
        filters.actors.includes(e.actor_name) ||
        filters.actors.includes(e.actor) // Legacy format
      );
    }

    // Actor role filter (by role: CEO, Board, Director, Staff)
    if (filters.actor_roles && filters.actor_roles.length > 0) {
      results = results.filter(e => filters.actor_roles.includes(e.actor_role));
    }

    // Actor authority level filter (by authority: 4=CEO, 3=Board, 2=Director, 1=Staff)
    if (filters.actor_authority_levels && filters.actor_authority_levels.length > 0) {
      results = results.filter(e => filters.actor_authority_levels.includes(e.actor_authority_level));
    }

    // Date range filter
    if (filters.date_from || filters.date_to) {
      const from = filters.date_from ? new Date(filters.date_from) : null;
      const to = filters.date_to ? new Date(filters.date_to) : null;
      results = results.filter(e => {
        const entryDate = new Date(e.timestamp);
        if (from && entryDate < from) return false;
        if (to && entryDate > to) return false;
        return true;
      });
    }

    // Time-of-day filter
    if (filters.hours && filters.hours.length > 0) {
      results = results.filter(e => filters.hours.includes(e.hour));
    }

    return results;
  }

  /**
   * Get audit trail for specific SKU
   */
  getSKUHistory(sku, limit = 50) {
    return this.ledger
      .filter(e => e.sku === sku)
      .slice(0, limit);
  }

  /**
   * Get all movements for a product (all variants)
   */
  getProductHistory(product_id, limit = 100) {
    return this.ledger
      .filter(e => e.product_id === product_id)
      .slice(0, limit);
  }

  /**
   * Get movements by adjustment type (e.g., all replenishments, all resets)
   */
  getByType(adjustment_type, limit = 100) {
    return this.ledger
      .filter(e => e.adjustment_type === adjustment_type)
      .slice(0, limit);
  }

  /**
   * Stock reconciliation report
   * Shows cumulative changes for a SKU from a point in time
   */
  reconciliationReport(sku, start_date = null) {
    const filtered = start_date 
      ? this.ledger.filter(e => e.sku === sku && new Date(e.timestamp) >= new Date(start_date))
      : this.ledger.filter(e => e.sku === sku);

    if (filtered.length === 0) {
      return {
        sku: sku,
        period_start: start_date || 'all time',
        entries: 0,
        total_replenished: 0,
        total_sold: 0,
        total_adjustments: 0,
        net_change: 0
      };
    }

    const replenished = filtered
      .filter(e => e.quantity_moved > 0)
      .reduce((sum, e) => sum + e.quantity_moved, 0);

    const sold = filtered
      .filter(e => e.quantity_moved < 0)
      .reduce((sum, e) => sum + Math.abs(e.quantity_moved), 0);

    const adjustments = filtered
      .filter(e => e.adjustment_type === 'manual_adjustment')
      .reduce((sum, e) => sum + Math.abs(e.quantity_moved), 0);

    return {
      sku: sku,
      period_start: start_date || 'all time',
      entries: filtered.length,
      total_replenished: replenished,
      total_sold: sold,
      total_adjustments: adjustments,
      net_change: replenished - sold,
      timeline: filtered.map(e => ({
        timestamp: e.timestamp_sast,
        type: e.adjustment_type,
        quantity: e.quantity_moved,
        before: e.quantity_before,
        after: e.quantity_after,
        reason: e.reason
      }))
    };
  }

  /**
   * Compliance Report
   * Summarizes all stock movements for audit purposes
   */
  complianceReport(filters = {}) {
    const filtered = this.query(filters);

    if (filtered.length === 0) {
      return {
        reporting_period: filters.date_from + ' to ' + filters.date_to || 'all time',
        total_entries: 0,
        summary: {}
      };
    }

    // Breakdown by adjustment type
    const typeBreakdown = {};
    filtered.forEach(e => {
      if (!typeBreakdown[e.adjustment_type]) {
        typeBreakdown[e.adjustment_type] = { count: 0, total_units: 0 };
      }
      typeBreakdown[e.adjustment_type].count++;
      typeBreakdown[e.adjustment_type].total_units += e.quantity_moved;
    });

    // Breakdown by actor (with role info)
    const actorBreakdown = {};
    filtered.forEach(e => {
      const actor_key = e.actor_name || e.actor || 'unknown';
      if (!actorBreakdown[actor_key]) {
        actorBreakdown[actor_key] = { 
          count: 0, 
          total_units: 0,
          role: e.actor_role || 'Unknown',
          authority_level: e.actor_authority_level || 0
        };
      }
      actorBreakdown[actor_key].count++;
      actorBreakdown[actor_key].total_units += e.quantity_moved;
    });

    // Breakdown by SKU
    const skuBreakdown = {};
    filtered.forEach(e => {
      if (!skuBreakdown[e.sku]) {
        skuBreakdown[e.sku] = { count: 0, total_units: 0, replenished: 0, sold: 0 };
      }
      skuBreakdown[e.sku].count++;
      skuBreakdown[e.sku].total_units += e.quantity_moved;
      if (e.quantity_moved > 0) skuBreakdown[e.sku].replenished += e.quantity_moved;
      if (e.quantity_moved < 0) skuBreakdown[e.sku].sold += Math.abs(e.quantity_moved);
    });

    return {
      reporting_period: filters.date_from && filters.date_to ? `${filters.date_from} to ${filters.date_to}` : 'all time',
      total_entries: filtered.length,
      by_adjustment_type: typeBreakdown,
      by_actor: actorBreakdown,
      by_sku: skuBreakdown,
      entries: filtered.slice(0, 50) // Return most recent 50 for detail
    };
  }

  /**
   * Export audit trail as CSV (governance-grade with actor role + authority)
   */
  exportCSV(filters = {}) {
    const filtered = this.query(filters);
    let csv = 'audit_id,timestamp_SAST,adjustment_type,sku,quantity_before,quantity_moved,quantity_after,actor_name,actor_role,actor_authority_level,reason,transaction_id,delta_percentage\n';

    filtered.forEach(e => {
      const actor = e.actor_name || e.actor || 'unknown';
      const role = e.actor_role || 'Unknown';
      const auth_level = e.actor_authority_level || 0;
      
      csv += `"${e.id}","${e.timestamp_sast}","${e.adjustment_type}","${e.sku}",${e.quantity_before},${e.quantity_moved},${e.quantity_after},"${actor}","${role}",${auth_level},"${e.reason.replace(/"/g, '""')}","${e.transaction_id || ''}",${e.delta_percentage}\n`;
    });

    return csv;
  }

  /**
   * Reset audit ledger (only on deliberate clean-slate operation)
   */
  resetLedger() {
    // Log the reset itself
    this.logMovement(
      'reset',
      0,
      'SYSTEM',
      0,
      0,
      0,
      'system',
      'System-wide reset to clean slate',
      null
    );
    
    // Then clear
    this.ledger = this.ledger.slice(0, 1); // Keep only the reset entry
    this.persist();
  }

  /**
   * Persist to storage
   */
  persist() {
    localStorage.setItem('lomos_stock_audit_ledger', JSON.stringify(this.ledger));
  }

  /**
   * Get all entries (for debugging)
   */
  getAll() {
    return this.ledger;
  }
}

// Global instance
window.stockAuditLedger = new StockAuditLedger();
