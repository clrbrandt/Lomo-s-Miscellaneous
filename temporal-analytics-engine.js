/**
 * TEMPORAL ANALYTICS ENGINE
 * 
 * Stratifies all transaction data by:
 * - Hour of day (00:00-23:59 SAST)
 * - Day of week (Mon-Sun)
 * - Week of month (1-4)
 * - Month/Year
 * 
 * Correlates against SASSA cycles & salary paydays
 * Supports wildcard queries with AND/OR logic
 * Generates temporal cohorts for CRM + prescriptive layers
 */

class TemporalAnalyticsEngine {
  constructor() {
    this.transactions = JSON.parse(localStorage.getItem('lomos_transactions')) || [];
    this.temporalIndex = {}; // Built on-demand
  }

  /**
   * Record transaction with automatic timestamp sync
   */
  recordTransaction(data) {
    const now = new Date();
    const transaction = {
      id: Date.now(),
      timestamp: now.toISOString(),
      timestamp_sast: this.formatSAST(now),
      hour: now.getHours(),
      day_of_week: now.getDay(), // 0=Sun, 1=Mon, etc.
      day_of_week_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
      date: now.getDate(),
      week_of_month: Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7),
      month: now.getMonth() + 1, // 1-12
      year: now.getFullYear(),
      cycle_category: this.detectCycle(now),
      
      // Transaction data
      customer_name: data.customer_name,
      segment: data.segment || 'New',
      product_variant: data.product_variant,
      quantity: data.quantity,
      unit_price: data.unit_price,
      total: data.total,
      payment_type: data.payment_type,
      operator_notes: data.operator_notes || ''
    };

    this.transactions.unshift(transaction);
    this.persist();
    return transaction;
  }

  /**
   * Format timestamp in SAST (UTC+2)
   */
  formatSAST(dateObj) {
    const offset = 2 * 60; // UTC+2 in minutes
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
   * Detect SASSA/salary cycle for transaction
   */
  detectCycle(dateObj) {
    const day = dateObj.getDate();
    const daysInMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();

    if (day >= 2 && day <= 4) {
      return 'SASSA Grants (Days 2-4)';
    } else if (day >= 22 || day === 1) {
      return 'SASSA SRD (Days 22+)';
    } else if ([1, 15, 20, 25].includes(day)) {
      return 'Salary Payday';
    } else {
      return 'Mid-Cycle';
    }
  }

  /**
   * Wildcard Query Engine
   * Supports: date range, cycle, time-of-day, day cohort, segment, product, AND/OR logic
   */
  query(filters) {
    let results = this.transactions.slice();

    // Date range filter
    if (filters.date_from || filters.date_to) {
      const from = filters.date_from ? new Date(filters.date_from) : null;
      const to = filters.date_to ? new Date(filters.date_to) : null;
      results = results.filter(t => {
        const txDate = new Date(t.timestamp);
        if (from && txDate < from) return false;
        if (to && txDate > to) return false;
        return true;
      });
    }

    // Cycle filter (AND/OR)
    if (filters.cycles && filters.cycles.length > 0) {
      const cycleLogic = filters.cycle_logic || 'OR';
      if (cycleLogic === 'OR') {
        results = results.filter(t => filters.cycles.includes(t.cycle_category));
      } else if (cycleLogic === 'AND') {
        // AND means transaction must match ALL cycles (impossible for single cycle, so treat as OR)
        results = results.filter(t => filters.cycles.includes(t.cycle_category));
      }
    }

    // Time-of-day filter (AND/OR)
    if (filters.hours && filters.hours.length > 0) {
      results = results.filter(t => {
        const inRange = filters.hours.some(range => {
          if (typeof range === 'number') return t.hour === range;
          if (Array.isArray(range)) return t.hour >= range[0] && t.hour < range[1];
          return false;
        });
        return inRange;
      });
    }

    // Day-of-week filter (AND/OR)
    if (filters.days_of_week && filters.days_of_week.length > 0) {
      results = results.filter(t => filters.days_of_week.includes(t.day_of_week));
    }

    // Week-of-month filter
    if (filters.weeks_of_month && filters.weeks_of_month.length > 0) {
      results = results.filter(t => filters.weeks_of_month.includes(t.week_of_month));
    }

    // Segment filter
    if (filters.segments && filters.segments.length > 0) {
      results = results.filter(t => filters.segments.includes(t.segment));
    }

    // Product variant filter
    if (filters.product_variants && filters.product_variants.length > 0) {
      results = results.filter(t => filters.product_variants.includes(t.product_variant));
    }

    // Payment type filter
    if (filters.payment_types && filters.payment_types.length > 0) {
      results = results.filter(t => filters.payment_types.includes(t.payment_type));
    }

    return results;
  }

  /**
   * Temporal Cohort Analysis
   * Returns metrics stratified by time period
   */
  cohortAnalysisByHour(filters = {}) {
    const filtered = this.query(filters);
    const cohorts = {};

    for (let hour = 0; hour < 24; hour++) {
      const hourTxs = filtered.filter(t => t.hour === hour);
      cohorts[`${String(hour).padStart(2, '0')}:00`] = {
        transactions: hourTxs.length,
        total_revenue: hourTxs.reduce((sum, t) => sum + t.total, 0),
        average_transaction: hourTxs.length > 0 ? hourTxs.reduce((sum, t) => sum + t.total, 0) / hourTxs.length : 0,
        units_sold: hourTxs.reduce((sum, t) => sum + t.quantity, 0),
        segments: this.segmentBreakdown(hourTxs),
        cycles: this.cycleBreakdown(hourTxs)
      };
    }

    return cohorts;
  }

  cohortAnalysisByDay(filters = {}) {
    const filtered = this.query(filters);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const cohorts = {};

    for (let dow = 0; dow < 7; dow++) {
      const dayTxs = filtered.filter(t => t.day_of_week === dow);
      cohorts[days[dow]] = {
        transactions: dayTxs.length,
        total_revenue: dayTxs.reduce((sum, t) => sum + t.total, 0),
        average_transaction: dayTxs.length > 0 ? dayTxs.reduce((sum, t) => sum + t.total, 0) / dayTxs.length : 0,
        units_sold: dayTxs.reduce((sum, t) => sum + t.quantity, 0),
        segments: this.segmentBreakdown(dayTxs),
        cycles: this.cycleBreakdown(dayTxs)
      };
    }

    return cohorts;
  }

  cohortAnalysisByWeek(filters = {}) {
    const filtered = this.query(filters);
    const cohorts = {};

    for (let week = 1; week <= 4; week++) {
      const weekTxs = filtered.filter(t => t.week_of_month === week);
      cohorts[`Week ${week}`] = {
        transactions: weekTxs.length,
        total_revenue: weekTxs.reduce((sum, t) => sum + t.total, 0),
        average_transaction: weekTxs.length > 0 ? weekTxs.reduce((sum, t) => sum + t.total, 0) / weekTxs.length : 0,
        units_sold: weekTxs.reduce((sum, t) => sum + t.quantity, 0),
        price_elasticity: this.elasticityAnalysis(weekTxs),
        segments: this.segmentBreakdown(weekTxs),
        cycles: this.cycleBreakdown(weekTxs)
      };
    }

    return cohorts;
  }

  /**
   * SASSA Correlation Analysis
   * Shows variant demand + customer behavior during each cycle phase
   */
  sassaCorrelationAnalysis() {
    const cycles = ['SASSA Grants (Days 2-4)', 'SASSA SRD (Days 22+)', 'Salary Payday', 'Mid-Cycle'];
    const analysis = {};

    cycles.forEach(cycle => {
      const cycleTxs = this.transactions.filter(t => t.cycle_category === cycle);
      
      // By hour
      const hourBreakdown = {};
      for (let hour = 0; hour < 24; hour++) {
        const hourTxs = cycleTxs.filter(t => t.hour === hour);
        hourBreakdown[`${String(hour).padStart(2, '0')}:00`] = {
          transactions: hourTxs.length,
          revenue: hourTxs.reduce((sum, t) => sum + t.total, 0),
          avg_transaction: hourTxs.length > 0 ? hourTxs.reduce((sum, t) => sum + t.total, 0) / hourTxs.length : 0,
          top_segment: this.topSegment(hourTxs)
        };
      }

      // By segment
      const segmentBreakdown = {};
      ['New', 'Casual Buyer', 'Active Contributor', 'VIP Regular'].forEach(seg => {
        const segTxs = cycleTxs.filter(t => t.segment === seg);
        segmentBreakdown[seg] = {
          transactions: segTxs.length,
          revenue: segTxs.reduce((sum, t) => sum + t.total, 0),
          avg_spend: segTxs.length > 0 ? segTxs.reduce((sum, t) => sum + t.total, 0) / segTxs.length : 0
        };
      });

      analysis[cycle] = {
        total_transactions: cycleTxs.length,
        total_revenue: cycleTxs.reduce((sum, t) => sum + t.total, 0),
        units_sold: cycleTxs.reduce((sum, t) => sum + t.quantity, 0),
        by_hour: hourBreakdown,
        by_segment: segmentBreakdown,
        demand_shift: this.demandShift(cycleTxs),
        price_elasticity: this.elasticityAnalysis(cycleTxs)
      };
    });

    return analysis;
  }

  /**
   * Helper: Segment breakdown
   */
  segmentBreakdown(transactions) {
    const breakdown = {};
    transactions.forEach(t => {
      breakdown[t.segment] = (breakdown[t.segment] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Helper: Cycle breakdown
   */
  cycleBreakdown(transactions) {
    const breakdown = {};
    transactions.forEach(t => {
      breakdown[t.cycle_category] = (breakdown[t.cycle_category] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Helper: Top segment
   */
  topSegment(transactions) {
    if (transactions.length === 0) return null;
    const breakdown = this.segmentBreakdown(transactions);
    return Object.keys(breakdown).reduce((a, b) => breakdown[a] > breakdown[b] ? a : b);
  }

  /**
   * Helper: Price elasticity (variance in unit prices)
   */
  elasticityAnalysis(transactions) {
    if (transactions.length === 0) return 0;
    const prices = transactions.map(t => t.unit_price);
    const avg = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    return Math.sqrt(variance).toFixed(2);
  }

  /**
   * Helper: Demand shift estimate (vs. expected baseline)
   */
  demandShift(transactions) {
    // Simplified: compare avg qty sold to global average
    if (transactions.length === 0) return '0%';
    const cycleAvgQty = transactions.reduce((sum, t) => sum + t.quantity, 0) / transactions.length;
    const globalAvgQty = this.transactions.reduce((sum, t) => sum + t.quantity, 0) / this.transactions.length;
    const shift = ((cycleAvgQty - globalAvgQty) / globalAvgQty * 100).toFixed(0);
    return `${shift > 0 ? '+' : ''}${shift}%`;
  }

  /**
   * Export as CSV with filters applied
   */
  exportCSV(filters = {}) {
    const filtered = this.query(filters);
    let csv = 'timestamp_SAST,hour,day_of_week,week_of_month,month,customer_segment,product_variant,quantity,unit_price_R,total_R,payment_type,cycle_category,operator_notes\n';

    filtered.forEach(t => {
      csv += `"${t.timestamp_sast}",${t.hour},"${t.day_of_week_name}",${t.week_of_month},${t.month},"${t.segment}","${t.product_variant}",${t.quantity},${t.unit_price.toFixed(2)},${t.total.toFixed(2)},"${t.payment_type}","${t.cycle_category}","${t.operator_notes.replace(/"/g, '""')}"\n`;
    });

    return csv;
  }

  /**
   * Persist to storage
   */
  persist() {
    localStorage.setItem('lomos_transactions', JSON.stringify(this.transactions));
  }

  /**
   * Reset all transactions to clean slate
   */
  resetToCleanSlate() {
    this.transactions = [];
    this.persist();
  }

  /**
   * Get all transactions (for rendering, legacy)
   */
  getAll() {
    return this.transactions;
  }
}

// Global instance
window.temporalAnalytics = new TemporalAnalyticsEngine();
