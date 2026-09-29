/**
 * CRM COHORT ANALYTICS
 * 
 * Customer temporal behavior analysis:
 * - Purchase patterns by SASSA cycle, day-of-week, hour-of-day
 * - Next-transaction prediction
 * - Segment migration tracking (Regular → VIP → Default Risk)
 * - Customer lifetime value + expected value
 */

class CRMCohortAnalytics {
  constructor() {
    this.customers = JSON.parse(localStorage.getItem('lomos_crm_cohort')) || {};
    this.segments = {
      'VIP Regular': { min_txns: 10, min_spend: 1000, churn_days: 60 },
      'Regular': { min_txns: 3, min_spend: 300, churn_days: 45 },
      'Occasional': { min_txns: 1, min_spend: 0, churn_days: 90 },
      'Default Risk': { late_payments: true, arrears: true }
    };
  }

  /**
   * Record a customer transaction
   */
  recordTransaction(customer_id, customer_name, product_sku, amount, payment_method, timestamp_sast, cycle_category) {
    if (!this.customers[customer_id]) {
      this.customers[customer_id] = {
        customer_id: customer_id,
        name: customer_name,
        first_txn: timestamp_sast,
        total_txns: 0,
        total_spend: 0,
        txn_history: [],
        segment: 'Occasional',
        credit_status: 'good',
        arears: 0,
        last_txn: null,
        hour_pattern: {},
        day_pattern: {},
        cycle_pattern: {},
        product_affinity: {}
      };
    }

    const customer = this.customers[customer_id];
    const dateObj = new Date(timestamp_sast);
    const hour = dateObj.getHours();
    const day = dateObj.toLocaleDateString('en-ZA', { weekday: 'long' });

    // Record transaction
    customer.total_txns++;
    customer.total_spend += amount;
    customer.last_txn = timestamp_sast;
    customer.txn_history.push({
      timestamp: timestamp_sast,
      product: product_sku,
      amount: amount,
      cycle: cycle_category
    });

    // Hour pattern
    customer.hour_pattern[hour] = (customer.hour_pattern[hour] || 0) + 1;

    // Day pattern
    customer.day_pattern[day] = (customer.day_pattern[day] || 0) + 1;

    // Cycle pattern
    customer.cycle_pattern[cycle_category] = (customer.cycle_pattern[cycle_category] || 0) + 1;

    // Product affinity
    customer.product_affinity[product_sku] = (customer.product_affinity[product_sku] || 0) + 1;

    // Update segment
    this.updateSegment(customer_id);

    this.persist();
    return customer;
  }

  /**
   * Update customer segment based on behavior
   */
  updateSegment(customer_id) {
    const customer = this.customers[customer_id];
    if (!customer) return null;

    if (customer.credit_status === 'default') {
      customer.segment = 'Default Risk';
    } else if (customer.total_txns >= 10 && customer.total_spend >= 1000) {
      customer.segment = 'VIP Regular';
    } else if (customer.total_txns >= 3 && customer.total_spend >= 300) {
      customer.segment = 'Regular';
    } else {
      customer.segment = 'Occasional';
    }

    return customer;
  }

  /**
   * Get customer profile
   */
  getCustomer(customer_id) {
    return this.customers[customer_id] || null;
  }

  /**
   * Get all customers
   */
  getAllCustomers(segment = null) {
    const all = Object.values(this.customers);
    if (!segment) return all;
    return all.filter(c => c.segment === segment);
  }

  /**
   * Predict next transaction likelihood (0-100%)
   * Based on: recency, frequency, time-of-day pattern, cycle pattern
   */
  nextTransactionLikelihood(customer_id) {
    const customer = this.customers[customer_id];
    if (!customer) return 0;

    let score = 0;

    // Frequency (30 points)
    if (customer.total_txns >= 10) score += 30;
    else if (customer.total_txns >= 5) score += 20;
    else if (customer.total_txns >= 3) score += 10;
    else score += 5;

    // Recency (40 points)
    const daysSinceLast = this.daysSinceLast(customer.last_txn);
    if (daysSinceLast <= 3) score += 40;
    else if (daysSinceLast <= 7) score += 30;
    else if (daysSinceLast <= 14) score += 20;
    else if (daysSinceLast <= 30) score += 10;

    // Segment (30 points)
    const segmentScores = {
      'VIP Regular': 30,
      'Regular': 20,
      'Occasional': 10,
      'Default Risk': 0
    };
    score += segmentScores[customer.segment] || 0;

    return Math.min(100, score);
  }

  /**
   * Predict next transaction timing (hour)
   */
  predictNextHour(customer_id) {
    const customer = this.customers[customer_id];
    if (!customer) return null;

    let topHour = 0;
    let maxCount = 0;

    Object.entries(customer.hour_pattern).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topHour = hour;
      }
    });

    return { hour: topHour, count: maxCount };
  }

  /**
   * Predict next transaction timing (day of week)
   */
  predictNextDay(customer_id) {
    const customer = this.customers[customer_id];
    if (!customer) return null;

    let topDay = 'Unknown';
    let maxCount = 0;

    Object.entries(customer.day_pattern).forEach(([day, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topDay = day;
      }
    });

    return { day: topDay, count: maxCount };
  }

  /**
   * Get customer's most frequent cycle
   */
  frequentCycle(customer_id) {
    const customer = this.customers[customer_id];
    if (!customer) return null;

    let topCycle = null;
    let maxCount = 0;

    Object.entries(customer.cycle_pattern).forEach(([cycle, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCycle = cycle;
      }
    });

    return { cycle: topCycle, count: maxCount };
  }

  /**
   * Get customer's preferred products
   */
  preferredProducts(customer_id, limit = 3) {
    const customer = this.customers[customer_id];
    if (!customer) return [];

    return Object.entries(customer.product_affinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([product, count]) => ({ product, count }));
  }

  /**
   * Days since last transaction
   */
  daysSinceLast(lastTxnStr) {
    const now = new Date();
    const lastTxn = new Date(lastTxnStr);
    const diffMs = now - lastTxn;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.floor(diffDays);
  }

  /**
   * Customer lifetime value (CLV) estimation
   */
  customerLifetimeValue(customer_id) {
    const customer = this.customers[customer_id];
    if (!customer) return 0;

    // Simple CLV: avg transaction × (total_txns + predicted_future_txns)
    const avgTxnValue = customer.total_spend / customer.total_txns;
    const likelyFutureTxns = Math.ceil(customer.total_txns * 1.5); // Assume 50% more
    const clv = avgTxnValue * (customer.total_txns + likelyFutureTxns);

    return {
      current_spend: customer.total_spend,
      avg_txn_value: avgTxnValue.toFixed(2),
      predicted_clv: clv.toFixed(2),
      segment: customer.segment
    };
  }

  /**
   * Segment breakdown
   */
  segmentBreakdown() {
    const breakdown = {};

    Object.entries(this.segments).forEach(([segment]) => {
      breakdown[segment] = {
        count: 0,
        avg_spend: 0,
        avg_txns: 0,
        members: []
      };
    });

    Object.values(this.customers).forEach(customer => {
      const seg = customer.segment;
      if (breakdown[seg]) {
        breakdown[seg].count++;
        breakdown[seg].avg_spend += customer.total_spend;
        breakdown[seg].avg_txns += customer.total_txns;
        breakdown[seg].members.push({
          name: customer.name,
          id: customer.customer_id,
          spend: customer.total_spend,
          txns: customer.total_txns
        });
      }
    });

    // Calculate averages
    Object.values(breakdown).forEach(seg => {
      if (seg.count > 0) {
        seg.avg_spend = (seg.avg_spend / seg.count).toFixed(2);
        seg.avg_txns = (seg.avg_txns / seg.count).toFixed(1);
      }
    });

    return breakdown;
  }

  /**
   * Get cohort insights (temporal patterns across all customers)
   */
  getCohortInsights() {
    const cohort = {
      total_customers: Object.keys(this.customers).length,
      total_spend: 0,
      total_txns: 0,
      avg_customer_spend: 0,
      avg_customer_txns: 0,
      hour_popularity: {},
      day_popularity: {},
      cycle_popularity: {}
    };

    Object.values(this.customers).forEach(customer => {
      cohort.total_spend += customer.total_spend;
      cohort.total_txns += customer.total_txns;

      Object.entries(customer.hour_pattern).forEach(([hour, count]) => {
        cohort.hour_popularity[hour] = (cohort.hour_popularity[hour] || 0) + count;
      });

      Object.entries(customer.day_pattern).forEach(([day, count]) => {
        cohort.day_popularity[day] = (cohort.day_popularity[day] || 0) + count;
      });

      Object.entries(customer.cycle_pattern).forEach(([cycle, count]) => {
        cohort.cycle_popularity[cycle] = (cohort.cycle_popularity[cycle] || 0) + count;
      });
    });

    if (cohort.total_customers > 0) {
      cohort.avg_customer_spend = (cohort.total_spend / cohort.total_customers).toFixed(2);
      cohort.avg_customer_txns = (cohort.total_txns / cohort.total_customers).toFixed(1);
    }

    return cohort;
  }

  /**
   * Churn risk analysis
   */
  churnRiskAnalysis() {
    const today = new Date();
    const at_risk = [];

    Object.values(this.customers).forEach(customer => {
      if (!customer.last_txn) return;

      const daysSince = this.daysSinceLast(customer.last_txn);
      const riskThreshold = this.segments[customer.segment]?.churn_days || 60;

      if (daysSince > riskThreshold * 0.75) { // 75% of threshold
        at_risk.push({
          name: customer.name,
          id: customer.customer_id,
          segment: customer.segment,
          days_since_last: daysSince,
          risk_level: daysSince >= riskThreshold ? 'HIGH' : 'MEDIUM',
          last_txn: customer.last_txn
        });
      }
    });

    return at_risk.sort((a, b) => b.days_since_last - a.days_since_last);
  }

  /**
   * Export customer list as CSV
   */
  exportCustomersCSV(segment = null) {
    const customers = this.getAllCustomers(segment);
    let csv = 'customer_id,name,segment,total_txns,total_spend,avg_txn_value,last_txn,next_txn_likelihood,predicted_next_hour\n';

    customers.forEach(c => {
      const avg = (c.total_spend / c.total_txns).toFixed(2);
      const likelihood = this.nextTransactionLikelihood(c.customer_id);
      const nextHour = this.predictNextHour(c.customer_id);

      csv += `"${c.customer_id}","${c.name}","${c.segment}",${c.total_txns},${c.total_spend},${avg},"${c.last_txn}",${likelihood},${nextHour.hour}\n`;
    });

    return csv;
  }

  /**
   * Persist to storage
   */
  persist() {
    localStorage.setItem('lomos_crm_cohort', JSON.stringify(this.customers));
  }

  /**
   * Reset cohort (on system reset)
   */
  reset() {
    this.customers = {};
    this.persist();
  }
}

// Global instance
window.crmCohortAnalytics = new CRMCohortAnalytics();
