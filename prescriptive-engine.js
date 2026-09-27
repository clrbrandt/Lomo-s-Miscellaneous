/**
 * LOMO'S MISCELLANEOUS - PRESCRIPTIVE ANALYTICS ENGINE
 * Governance-grade decision intelligence based on temporal cycles and variant performance
 */

class PrescriptiveAnalyticsEngine {
  constructor() {
    this.storageKey = 'lomos_prescriptive_data';
    this.data = this.load();
    this.cycles = this.initializeCycles();
    this.correlations = this.initializeCorrelations();
  }

  initializeCycles() {
    return {
      sassaGrants: {
        name: 'SASSA Grants (Older Persons, Disability, Child Support)',
        baseWindow: { start: 2, end: 4 },
        adjustmentRule: 'forward', // Move to Monday if falls on weekend
        expectedBehavior: 'High liquidity, volume spike, price elasticity low'
      },
      sassaSrd: {
        name: 'SASSA SRD (Social Relief of Distress)',
        baseWindow: { start: 22, end: 31 },
        adjustmentRule: 'forward',
        expectedBehavior: 'Month-end liquidity peak, volume surge, margin opportunity'
      },
      salaryPaydays: {
        name: 'Salaried Client Paydays',
        dates: [1, 15, 20, 25],
        endOfMonth: true,
        expectedBehavior: 'Recurring liquidity events, predictable demand spikes'
      }
    };
  }

  initializeCorrelations() {
    return {
      'SASSA Grants Window (Days 2-4)': {
        timeFrame: 'Days 2-4 (adjusted forward if weekend)',
        trigger: 'Grant payout received',
        expectedBehavior: {
          'ActionWork R50': { demandShift: '+45%', priceElasticity: 'Low', action: 'Maximize margin' },
          'ActionWork R30': { demandShift: '+35%', priceElasticity: 'Low', action: 'Volume push' },
          'AbdulUpDown R30': { demandShift: '+50%', priceElasticity: 'Low', action: 'Optimize inventory' },
          'AbdulUpDown R15': { demandShift: '+30%', priceElasticity: 'Medium', action: 'Bundle strategy' },
          'Snoek R50': { demandShift: '+25%', priceElasticity: 'High', action: 'Maintain price' },
          'Snoek R30': { demandShift: '+40%', priceElasticity: 'High', action: 'Volume play' }
        },
        customerSegment: {
          'VIP Regular': { volumeIncrease: '+20%', behavior: 'Consistent, margin-stable' },
          'Active Contributor': { volumeIncrease: '+35%', behavior: 'Responsive to promotions' },
          'Casual Buyer': { volumeIncrease: '+55%', behavior: 'Highly elastic, volume-driven' }
        },
        recommendations: {
          inventory: 'Increase stock 25-30% by day 1',
          pricing: 'Hold prices; premium variants hold value',
          promotion: 'Focus on volume and loyalty rewards',
          confidence: '85%'
        }
      },

      'Salary Payday (Days 1, 15, 20, 25)': {
        timeFrame: 'Days 1, 15, 20, 25',
        trigger: 'Salaried clients receive income',
        expectedBehavior: {
          'ActionWork R50': { demandShift: '+30%', priceElasticity: 'Low', action: 'Premium positioning' },
          'ActionWork R30': { demandShift: '+25%', priceElasticity: 'Medium', action: 'Cross-sell' },
          'AbdulUpDown R30': { demandShift: '+35%', priceElasticity: 'Low', action: 'Margin focus' },
          'AbdulUpDown R15': { demandShift: '+20%', priceElasticity: 'High', action: 'Support cross-sell' },
          'Snoek R50': { demandShift: '+20%', priceElasticity: 'Medium', action: 'Steady' },
          'Snoek R30': { demandShift: '+15%', priceElasticity: 'High', action: 'Volume support' }
        },
        recommendations: {
          inventory: 'Maintain +15% safety stock',
          pricing: 'Test +5-8% price increase on premium variants',
          promotion: 'Bundle R50 + R30 combos',
          confidence: '80%'
        }
      },

      'SASSA SRD Window (Days 22-31)': {
        timeFrame: 'Days 22 → month-end',
        trigger: 'SRD payout + salary convergence',
        expectedBehavior: {
          'ActionWork R50': { demandShift: '+55%', priceElasticity: 'Low', action: 'Maximize revenue' },
          'ActionWork R30': { demandShift: '+50%', priceElasticity: 'Medium', action: 'Push volume' },
          'AbdulUpDown R30': { demandShift: '+60%', priceElasticity: 'Low', action: 'Peak inventory' },
          'AbdulUpDown R15': { demandShift: '+45%', priceElasticity: 'Low', action: 'Volume surge' },
          'Snoek R50': { demandShift: '+35%', priceElasticity: 'Medium', action: 'Increase price' },
          'Snoek R30': { demandShift: '+50%', priceElasticity: 'High', action: 'Max volume' }
        },
        customerSegment: {
          'VIP Regular': { volumeIncrease: '+30%', behavior: 'Margin-stable, loyal' },
          'Active Contributor': { volumeIncrease: '+45%', behavior: 'Responsive, value-conscious' },
          'Casual Buyer': { volumeIncrease: '+70%', behavior: 'Maximum volume, price-driven' }
        },
        recommendations: {
          inventory: 'Increase stock 40-50% by day 20',
          pricing: 'Test +10-15% on premium; hold on value',
          promotion: 'Limited-time bundles; loyalty bonuses',
          confidence: '88%'
        }
      },

      'Mid-Cycle (Days 11-21)': {
        timeFrame: 'Days 11-21 (between paydays)',
        trigger: 'Cashflow depletion; spending fatigue',
        expectedBehavior: {
          'ActionWork R50': { demandShift: '-25%', priceElasticity: 'Very High', action: 'Accept discount' },
          'ActionWork R30': { demandShift: '+15%', priceElasticity: 'High', action: 'Price-driven volume' },
          'AbdulUpDown R30': { demandShift: '-15%', priceElasticity: 'High', action: 'Flexible pricing' },
          'AbdulUpDown R15': { demandShift: '+20%', priceElasticity: 'High', action: 'Value positioning' },
          'Snoek R50': { demandShift: '-30%', priceElasticity: 'Very High', action: 'Clearance mode' },
          'Snoek R30': { demandShift: '+25%', priceElasticity: 'High', action: 'Volume focus' }
        },
        recommendations: {
          inventory: 'Shift focus to R30/R15 variants; reduce premium stock',
          pricing: 'Reduce premium variants by 15-20%; emphasize value',
          promotion: 'Installment/credit options; payment plans available',
          confidence: '82%'
        }
      }
    };
  }

  detectCurrentCycle(date = new Date()) {
    const day = date.getDate();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    if (this.isWithinRange(day, 2, 4)) {
      return { cycle: 'SASSA Grants Window (Days 2-4)', dayInCycle: day };
    } else if (this.isWithinRange(day, 22, daysInMonth)) {
      return { cycle: 'SASSA SRD Window (Days 22-31)', dayInCycle: day - 21 };
    } else if ([1, 15, 20, 25].includes(day)) {
      return { cycle: 'Salary Payday (Days 1, 15, 20, 25)', dayInCycle: 1 };
    } else {
      return { cycle: 'Mid-Cycle (Days 11-21)', dayInCycle: day };
    }
  }

  isWithinRange(day, start, end) {
    return day >= start && day <= end;
  }

  generateVariantRecommendations(transactionHistory) {
    const currentCycle = this.detectCurrentCycle();
    const cycleData = this.correlations[currentCycle.cycle];
    const recommendations = {};

    if (!cycleData) return null;

    // Analyze variant performance in current cycle
    const variantMetrics = this.analyzeVariantPerformance(transactionHistory);

    // Generate per-variant recommendations
    for (const [variant, behavior] of Object.entries(cycleData.expectedBehavior)) {
      const metrics = variantMetrics[variant] || {};
      
      recommendations[variant] = {
        currentCycle: currentCycle.cycle,
        expectedDemandShift: behavior.demandShift,
        actualPerformance: {
          soldUnits: metrics.soldCount || 0,
          revenue: metrics.revenue || 0,
          variance: metrics.variance || 'N/A'
        },
        priceElasticity: behavior.priceElasticity,
        action: behavior.action,
        recommendations: {
          direction: this.getDirectionFromDemandShift(behavior.demandShift),
          stockTarget: this.calculateStockTarget(behavior.demandShift, metrics),
          priceAdjustment: this.calculatePriceAdjustment(behavior.priceElasticity, currentCycle.cycle),
          marginTarget: this.calculateMarginTarget(variant, cycleData),
          confidence: cycleData.recommendations.confidence
        }
      };
    }

    return {
      cycle: currentCycle,
      cycleRecommendations: cycleData.recommendations,
      variantRecommendations: recommendations
    };
  }

  analyzeVariantPerformance(transactionHistory) {
    const metrics = {};
    const variants = window.productCatalog?.getAllVariants() || [];

    variants.forEach(variant => {
      const key = `${variant.productName} ${variant.size}`;
      metrics[key] = {
        productId: variant.productId,
        sku: variant.sku,
        stock: variant.stock,
        soldCount: variant.soldCount,
        revenue: variant.totalRevenue,
        price: variant.price,
        variance: variant.stock < 10 ? 'Critical' : variant.stock < 25 ? 'Low' : 'Healthy'
      };
    });

    return metrics;
  }

  getDirectionFromDemandShift(shift) {
    const percentage = parseInt(shift);
    if (percentage > 30) return '⬆️ Increase inventory significantly';
    if (percentage > 0) return '⬆️ Increase inventory moderately';
    if (percentage < -30) return '⬇️ Reduce inventory significantly';
    return '⬇️ Reduce inventory, manage clearance';
  }

  calculateStockTarget(demandShift, metrics) {
    const percentage = parseInt(demandShift);
    const currentStock = metrics.stock || 0;
    
    if (percentage > 0) {
      const increase = Math.ceil((currentStock * percentage) / 100);
      return currentStock + increase;
    } else {
      const decrease = Math.ceil((currentStock * Math.abs(percentage)) / 100);
      return Math.max(5, currentStock - decrease);
    }
  }

  calculatePriceAdjustment(elasticity, cycle) {
    const adjustments = {
      'Low': cycle.includes('SRD') || cycle.includes('Salary') ? '+8%' : '0%',
      'Medium': cycle.includes('SRD') ? '+5%' : cycle.includes('Mid-Cycle') ? '-5%' : '0%',
      'High': cycle.includes('SRD') ? '+3%' : cycle.includes('Mid-Cycle') ? '-10%' : '-2%',
      'Very High': '-15%'
    };
    return adjustments[elasticity] || '0%';
  }

  calculateMarginTarget(variant, cycleData) {
    const variant_data = cycleData.expectedBehavior[variant];
    if (!variant_data) return 'N/A';

    if (variant.includes('R50') || variant.includes('R30 (AbdulUpDown)')) {
      return 'Optimize: Premium pricing acceptable';
    } else if (variant.includes('R15')) {
      return 'Volume: Margin secondary to turnover';
    } else {
      return 'Balanced: Margin + volume';
    }
  }

  exportRecommendations(format = 'json') {
    const transactionHistory = JSON.parse(localStorage.getItem('lomos_sales')) || [];
    const recommendations = this.generateVariantRecommendations(transactionHistory);

    if (format === 'csv') {
      return this.exportAsCSV(recommendations);
    } else if (format === 'pdf') {
      return this.exportAsPDF(recommendations);
    } else {
      return recommendations;
    }
  }

  exportAsCSV(recommendations) {
    let csv = 'Variant,Current_Cycle,Expected_Demand_Shift,Action,Stock_Target,Price_Adjustment,Margin_Target,Confidence\n';
    
    for (const [variant, rec] of Object.entries(recommendations.variantRecommendations)) {
      csv += `"${variant}","${recommendations.cycle.cycle}","${rec.expectedDemandShift}","${rec.action}","${rec.recommendations.stockTarget}","${rec.recommendations.priceAdjustment}","${rec.recommendations.marginTarget}","${rec.recommendations.confidence}"\n`;
    }

    return csv;
  }

  exportAsPDF(recommendations) {
    // Will integrate with PDF library; for now return structured data
    return {
      title: 'Prescriptive Analytics Report - Lomo\'s Miscellaneous',
      timestamp: new Date().toISOString(),
      currentCycle: recommendations.cycle.cycle,
      cycleRecommendations: recommendations.cycleRecommendations,
      variantRecommendations: recommendations.variantRecommendations
    };
  }

  load() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : {};
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }
}

// Global instance
window.prescriptiveEngine = new PrescriptiveAnalyticsEngine();
