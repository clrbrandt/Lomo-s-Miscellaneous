/**
 * LOMO'S MISCELLANEOUS - GOVERNANCE & AUDIT LEDGER
 * Tracks prescriptive recommendations, approvals, execution, and outcomes
 */

class GovernanceAuditLedger {
  constructor() {
    this.storageKey = 'lomos_audit_ledger';
    this.records = this.load();
  }

  load() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : [];
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.records));
  }

  /**
   * Record a prescriptive recommendation in the audit trail
   */
  recordRecommendation(recommendation) {
    const record = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'RECOMMENDATION_ISSUED',
      cycle: recommendation.cycle,
      variant: recommendation.variant,
      recommendation: {
        direction: recommendation.direction,
        stockTarget: recommendation.stockTarget,
        priceAdjustment: recommendation.priceAdjustment,
        marginTarget: recommendation.marginTarget,
        confidence: recommendation.confidence
      },
      status: 'Pending Approval',
      approvedBy: null,
      approvalDate: null,
      executedBy: null,
      executionDate: null,
      outcome: null,
      notes: ''
    };

    this.records.push(record);
    this.save();
    return record;
  }

  /**
   * Charle approves a recommendation for team execution
   */
  approveRecommendation(recordId, notes = '') {
    const record = this.records.find(r => r.id === recordId);
    if (record && record.status === 'Pending Approval') {
      record.status = 'Approved';
      record.approvedBy = 'Charle (DigiV8)';
      record.approvalDate = new Date().toISOString();
      record.notes = notes;
      this.save();
      return record;
    }
    return null;
  }

  /**
   * Record execution of an approved recommendation
   */
  recordExecution(recordId, executedBy, executionDetails) {
    const record = this.records.find(r => r.id === recordId);
    if (record && record.status === 'Approved') {
      record.status = 'Executed';
      record.executedBy = executedBy;
      record.executionDate = new Date().toISOString();
      record.executionDetails = executionDetails;
      this.save();
      return record;
    }
    return null;
  }

  /**
   * Record outcome of executed recommendation
   */
  recordOutcome(recordId, outcome) {
    const record = this.records.find(r => r.id === recordId);
    if (record && record.status === 'Executed') {
      record.status = 'Completed';
      record.outcome = {
        actualSalesVolume: outcome.actualSalesVolume,
        actualRevenue: outcome.actualRevenue,
        varianceFromExpected: outcome.varianceFromExpected,
        successIndicators: outcome.successIndicators,
        learnings: outcome.learnings
      };
      record.completionDate = new Date().toISOString();
      this.save();
      return record;
    }
    return null;
  }

  /**
   * Reject a recommendation (Charle decision)
   */
  rejectRecommendation(recordId, reason) {
    const record = this.records.find(r => r.id === recordId);
    if (record && record.status === 'Pending Approval') {
      record.status = 'Rejected';
      record.rejectionReason = reason;
      record.rejectedBy = 'Charle (DigiV8)';
      record.rejectionDate = new Date().toISOString();
      this.save();
      return record;
    }
    return null;
  }

  /**
   * Get all pending approvals for Charle
   */
  getPendingApprovals() {
    return this.records.filter(r => r.status === 'Pending Approval');
  }

  /**
   * Get all approved-but-not-executed recommendations
   */
  getApprovedNotExecuted() {
    return this.records.filter(r => r.status === 'Approved');
  }

  /**
   * Get execution history by team member
   */
  getExecutionHistory(executorName) {
    return this.records.filter(r => r.executedBy === executorName);
  }

  /**
   * Calculate recommendation accuracy (expected vs actual)
   */
  calculateRecommendationAccuracy() {
    const completed = this.records.filter(r => r.status === 'Completed' && r.outcome);
    if (completed.length === 0) return null;

    let successCount = 0;
    const results = [];

    completed.forEach(record => {
      const variance = parseFloat(record.outcome.varianceFromExpected) || 0;
      const success = variance >= -20; // Within 20% variance = success
      if (success) successCount++;

      results.push({
        variant: record.variant,
        expectedDemandShift: record.recommendation.direction,
        actualVariance: record.outcome.varianceFromExpected,
        success: success
      });
    });

    return {
      totalCompleted: completed.length,
      successCount: successCount,
      accuracyRate: `${((successCount / completed.length) * 100).toFixed(1)}%`,
      details: results
    };
  }

  /**
   * Export audit trail as CSV
   */
  exportAuditTrailCSV() {
    let csv = 'Record_ID,Timestamp,Type,Cycle,Variant,Status,Approved_By,Approved_Date,Executed_By,Execution_Date,Outcome_Variance,Notes\n';

    this.records.forEach(record => {
      const variance = record.outcome ? record.outcome.varianceFromExpected : 'N/A';
      csv += `${record.id},"${record.timestamp}","${record.type}","${record.cycle}","${record.variant}","${record.status}","${record.approvedBy || 'N/A'}","${record.approvalDate || 'N/A'}","${record.executedBy || 'N/A'}","${record.executionDate || 'N/A'}","${variance}","${record.notes}"\n`;
    });

    return csv;
  }

  /**
   * Export compliance report
   */
  exportComplianceReport() {
    const accuracy = this.calculateRecommendationAccuracy();
    const pending = this.getPendingApprovals();
    const approved = this.getApprovedNotExecuted();
    const completed = this.records.filter(r => r.status === 'Completed');

    return {
      reportDate: new Date().toISOString(),
      summary: {
        totalRecommendations: this.records.length,
        pending: pending.length,
        approved: approved.length,
        completed: completed.length,
        rejected: this.records.filter(r => r.status === 'Rejected').length
      },
      accuracy: accuracy,
      pendingApprovals: pending,
      executionOutstanding: approved
    };
  }

  /**
   * Clear all audit records (governance decision)
   */
  clearOlderThan(days) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    this.records = this.records.filter(r => new Date(r.timestamp) > cutoffDate);
    this.save();
  }
}

// Global instance
window.auditLedger = new GovernanceAuditLedger();
