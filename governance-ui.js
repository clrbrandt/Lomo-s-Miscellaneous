/**
 * GOVERNANCE UI MODULE
 * 
 * Renders Governance tab with:
 * - Recent stock adjustments table
 * - Quick filter bar (date, type, actor role)
 * - Export compliance report (CSV)
 * - Organization structure snapshot
 */

class GovernanceUI {
  constructor() {
    this.currentFilters = {
      date_from: null,
      date_to: null,
      adjustment_types: [],
      actor_roles: []
    };
    this.init();
  }

  /**
   * Initialize tab (called once on page load)
   */
  init() {
    this.setupFilterHandlers();
    this.renderInitialView();
  }

  /**
   * Render entire Governance tab on first load or refresh
   */
  renderInitialView() {
    this.renderOrgStructure();
    this.applyFilters(); // Render default (all recent)
  }

  /**
   * Setup filter dropdown + button handlers
   */
  setupFilterHandlers() {
    const applyBtn = document.getElementById('governance-filter-apply');
    const resetBtn = document.getElementById('governance-filter-reset');

    if (applyBtn) {
      applyBtn.onclick = () => this.applyFilters();
    }
    if (resetBtn) {
      resetBtn.onclick = () => this.resetFilters();
    }
  }

  /**
   * Apply current filters and render table
   */
  applyFilters() {
    // Read filter values from UI
    const dateFrom = document.getElementById('governance-date-from')?.value;
    const dateTo = document.getElementById('governance-date-to')?.value;
    const typeSelect = document.getElementById('governance-type-filter');
    const roleSelect = document.getElementById('governance-role-filter');

    const filters = {
      date_from: dateFrom || null,
      date_to: dateTo || null,
      adjustment_types: typeSelect?.value !== 'all' ? [typeSelect.value] : [],
      actor_roles: roleSelect?.value !== 'all' ? [roleSelect.value] : []
    };

    this.currentFilters = filters;

    // Query ledger
    const results = window.stockAuditLedger.query(filters);

    // Render table
    this.renderTable(results);

    // Show result count
    const countEl = document.getElementById('governance-result-count');
    if (countEl) {
      countEl.textContent = `Showing ${results.length} adjustment${results.length !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Reset all filters to default
   */
  resetFilters() {
    document.getElementById('governance-date-from').value = '';
    document.getElementById('governance-date-to').value = '';
    document.getElementById('governance-type-filter').value = 'all';
    document.getElementById('governance-role-filter').value = 'all';
    
    this.applyFilters();
  }

  /**
   * Render recent adjustments table
   */
  renderTable(adjustments) {
    const tbody = document.getElementById('governance-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (adjustments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #999;">No adjustments found</td></tr>`;
      return;
    }

    adjustments.forEach(entry => {
      const row = document.createElement('tr');
      row.className = 'governance-row';
      row.onclick = () => this.expandRow(entry);

      // Actor role badge
      const roleBadge = this.getRoleBadge(entry.actor_role);

      // Quantity color (positive = green, negative = red)
      const qtyClass = entry.quantity_moved > 0 ? 'qty-positive' : 'qty-negative';
      const qtySign = entry.quantity_moved > 0 ? '+' : '';

      const timestamp = entry.timestamp_sast || entry.timestamp || 'N/A';

      row.innerHTML = `
        <td class="governance-timestamp">${timestamp}</td>
        <td class="governance-type">${this.formatType(entry.adjustment_type)}</td>
        <td class="governance-sku">${entry.sku || 'N/A'}</td>
        <td class="governance-qty ${qtyClass}">${qtySign}${entry.quantity_moved}</td>
        <td class="governance-actor">
          ${roleBadge}
          <span class="actor-name">${entry.actor_name || entry.actor || 'unknown'}</span>
        </td>
        <td class="governance-expand">▶</td>
      `;

      tbody.appendChild(row);
    });
  }

  /**
   * Expand row to show full details
   */
  expandRow(entry) {
    const existingDetail = document.querySelector(`[data-entry-id="${entry.id}"]`);
    if (existingDetail) {
      existingDetail.remove();
      return;
    }

    // Create detail row
    const tbody = document.getElementById('governance-table-body');
    const detailRow = document.createElement('tr');
    detailRow.className = 'governance-detail-row';
    detailRow.setAttribute('data-entry-id', entry.id);

    const authLevel = entry.actor_authority_level || 0;
    const authorityText = {
      4: 'CEO (Highest)',
      3: 'Board (Collective)',
      2: 'Director (Operations)',
      1: 'Staff (Frontline)'
    }[authLevel] || 'Unknown';

    detailRow.innerHTML = `
      <td colspan="6" class="governance-detail-content">
        <div class="detail-grid">
          <div class="detail-section">
            <h4>📋 Adjustment Details</h4>
            <p><strong>ID:</strong> ${entry.id}</p>
            <p><strong>Reason:</strong> ${entry.reason || 'N/A'}</p>
            <p><strong>Transaction ID:</strong> ${entry.transaction_id || 'N/A'}</p>
          </div>
          
          <div class="detail-section">
            <h4>👤 Actor Information</h4>
            <p><strong>Name:</strong> ${entry.actor_name || entry.actor || 'unknown'}</p>
            <p><strong>Role:</strong> ${entry.actor_role || 'Unknown'}</p>
            <p><strong>Authority Level:</strong> ${authorityText}</p>
          </div>
          
          <div class="detail-section">
            <h4>📊 Stock Movement</h4>
            <p><strong>Before:</strong> ${entry.quantity_before} units</p>
            <p><strong>After:</strong> ${entry.quantity_after} units</p>
            <p><strong>Change:</strong> ${entry.quantity_moved > 0 ? '+' : ''}${entry.quantity_moved} (${entry.delta_percentage}%)</p>
          </div>
        </div>
        <div class="detail-close" onclick="this.parentElement.parentElement.remove()">✕ Close</div>
      </td>
    `;

    // Insert after current row
    const currentRow = document.querySelector(`[data-entry-id="${entry.id}"]`)?.parentElement;
    if (currentRow) {
      currentRow.parentElement.insertBefore(detailRow, currentRow.nextSibling);
    } else {
      tbody.appendChild(detailRow);
    }
  }

  /**
   * Render organization structure (CEO, Board, Director, Staff)
   */
  renderOrgStructure() {
    const container = document.getElementById('governance-org-structure');
    if (!container) return;

    const org = window.actorRegistry.getOrganizationStructure();
    let html = '<div class="org-tree">';

    [4, 3, 2, 1].forEach(level => {
      const levelData = Object.values(org).find(d => d.level === level);
      if (!levelData) return;

      const badge = this.getRoleBadge(levelData.role);
      html += `
        <div class="org-level">
          <div class="org-level-header">
            ${badge}
            <strong>${levelData.role}</strong>
            <span class="org-level-desc">${levelData.description}</span>
          </div>
          <div class="org-members">
      `;

      if (levelData.members.length === 0) {
        html += `<p style="color: #999; margin: 5px 0;">No members</p>`;
      } else {
        levelData.members.forEach(member => {
          html += `
            <div class="org-member">
              <span class="member-name">${member.name}</span>
              <span class="member-title">${member.title || ''}</span>
            </div>
          `;
        });
      }

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * Export audit report as CSV
   */
  exportReport() {
    const dateFrom = document.getElementById('governance-date-from')?.value;
    const dateTo = document.getElementById('governance-date-to')?.value;

    const filters = {};
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;

    const csv = window.stockAuditLedger.exportCSV(filters);

    // Trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dateRange = dateFrom && dateTo 
      ? `${dateFrom}-to-${dateTo}` 
      : 'all-time';

    link.setAttribute('href', url);
    link.setAttribute('download', `audit-report-${dateRange}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Format adjustment type for display
   */
  formatType(type) {
    const types = {
      'sale_deduction': '🛒 Sale',
      'replenishment': '📦 Replenish',
      'manual_adjustment': '✏️ Manual',
      'reset': '🔄 Reset'
    };
    return types[type] || type;
  }

  /**
   * Get role badge (colored dot + label)
   */
  getRoleBadge(role) {
    const badges = {
      'CEO': '<span class="role-badge role-ceo" title="Authority Level 4">🟡</span>',
      'Board': '<span class="role-badge role-board" title="Authority Level 3">🟣</span>',
      'Director': '<span class="role-badge role-director" title="Authority Level 2">🔵</span>',
      'Staff': '<span class="role-badge role-staff" title="Authority Level 1">🟢</span>'
    };
    return badges[role] || '<span class="role-badge role-unknown">⚪</span>';
  }

  /**
   * Refresh table (called from other tabs when stock changes)
   */
  refresh() {
    this.applyFilters();
  }
}

// Global instance
window.governanceUI = new GovernanceUI();
