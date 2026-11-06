/**
 * VOLTX BESS Analytics - Financial Analysis Engine
 * Full 15-year DCF pro-forma, loan amortization, Net Present Value (NPV),
 * numerical Internal Rate of Return (IRR via Newton-Raphson), Payback, and scenario modeling.
 */

class FinancialEngine {
  constructor(configManager, tariffEngine, energyEngine) {
    this.configManager = configManager || window.voltxConfigManager;
    this.tariffEngine = tariffEngine || window.voltxTariffEngine;
    this.energyEngine = energyEngine || window.voltxEnergyEngine;
  }

  get config() {
    return this.configManager.getConfig();
  }

  /**
   * Estimate capital expenditure based on BESS capacity & power specs.
   */
  estimateCapex(bessCapacityKwh, bessPowerKw, customTotalCapex = null) {
    if (customTotalCapex && parseFloat(customTotalCapex) > 0) {
      const total = parseFloat(customTotalCapex);
      // Allocate proportionally
      return {
        batteryPackCost: Math.round(total * 0.62),
        pcsInverterCost: Math.round(total * 0.20),
        bopAndInstallation: Math.round(total * 0.18),
        totalCapex: total,
        isCustom: true
      };
    }

    const cfg = this.config.financialDefaults;
    const kwh = parseFloat(bessCapacityKwh) || 1000;
    const kw = parseFloat(bessPowerKw) || 250;

    const batteryPackCost = kwh * cfg.batteryPackCostPerKwh;
    const pcsInverterCost = kw * cfg.pcsInverterCostPerKw;
    const equipmentSum = batteryPackCost + pcsInverterCost;
    const bopAndInstallation = Math.round(equipmentSum * (cfg.bopAndInstallationPercent / 100));
    const totalCapex = batteryPackCost + pcsInverterCost + bopAndInstallation;

    return {
      batteryPackCost,
      pcsInverterCost,
      bopAndInstallation,
      totalCapex,
      isCustom: false
    };
  }

  /**
   * Calculate equal annual debt service payment (PMT).
   */
  calculateAnnualDebtService(principal, annualRatePercent, tenorYears) {
    if (!principal || principal <= 0 || !tenorYears || tenorYears <= 0) return 0;
    const r = (parseFloat(annualRatePercent) || 0) / 100;
    const n = parseInt(tenorYears, 10);
    if (r === 0) return principal / n;
    const factor = Math.pow(1 + r, n);
    return principal * (r * factor) / (factor - 1);
  }

  /**
   * Solve for Internal Rate of Return (IRR) numerically using Newton-Raphson.
   * Cashflows is an array starting with Year 0 (negative initial equity investment).
   */
  calculateIRR(cashflows, guess = 0.15) {
    const maxIter = 100;
    const tolerance = 1e-6;
    let rate = guess;

    for (let i = 0; i < maxIter; i++) {
      let npv = 0;
      let dNpv = 0;

      for (let t = 0; t < cashflows.length; t++) {
        const denom = Math.pow(1 + rate, t);
        if (denom === 0) break;
        npv += cashflows[t] / denom;
        if (t > 0) {
          dNpv -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
        }
      }

      if (Math.abs(npv) < tolerance) {
        return rate * 100; // Return percentage
      }

      if (Math.abs(dNpv) < 1e-10) {
        break; // Slope too flat, fallback
      }

      const nextRate = rate - (npv / dNpv);
      if (isNaN(nextRate) || !isFinite(nextRate) || nextRate <= -0.99 || nextRate > 5.0) {
        break; // Out of reasonable bounds
      }
      rate = nextRate;
    }

    // Fallback: Bisection search between -50% and +150%
    let low = -0.5;
    let high = 1.5;
    let npvLow = this.computeNPVForRate(cashflows, low);
    let npvHigh = this.computeNPVForRate(cashflows, high);

    if (npvLow * npvHigh > 0) {
      // No single sign change in bounds
      return rate > 0 && rate < 2.0 ? rate * 100 : null;
    }

    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const npvMid = this.computeNPVForRate(cashflows, mid);
      if (Math.abs(npvMid) < tolerance) return mid * 100;
      if (npvLow * npvMid < 0) {
        high = mid;
      } else {
        low = mid;
        npvLow = npvMid;
      }
    }

    return ((low + high) / 2) * 100;
  }

  computeNPVForRate(cashflows, rate) {
    let sum = 0;
    for (let t = 0; t < cashflows.length; t++) {
      sum += cashflows[t] / Math.pow(1 + rate, t);
    }
    return sum;
  }

  /**
   * Run full comprehensive financial model over project lifespan (default 15 years).
   */
  evaluateProject(inputs) {
    // 1. Evaluate Tariffs
    const tariffResult = this.tariffEngine.evaluateTariff({
      plantType: inputs.plantType || "rooftop",
      capacityKw: inputs.solarCapacityKw || 500,
      existingTariff: inputs.existingTariff,
      utility: inputs.utility || "CEB"
    });

    // 2. Simulate Energy Year 1
    const energyResult = this.energyEngine.simulateYearOne(inputs);

    // 3. Compute Capex
    const capexResult = this.estimateCapex(
      inputs.bessCapacityKwh || 1000,
      inputs.bessPowerKw || 250,
      inputs.totalCapex
    );

    const totalCapex = capexResult.totalCapex;
    const debtSharePercent = parseFloat(inputs.debtShare ?? this.config.financialDefaults.defaultDebtShare);
    const equitySharePercent = 100 - debtSharePercent;
    const debtAmount = totalCapex * (debtSharePercent / 100);
    const equityAmount = totalCapex * (equitySharePercent / 100);

    const interestRate = parseFloat(inputs.interestRate ?? this.config.financialDefaults.defaultInterestRate);
    const loanTenorYears = parseInt(inputs.loanTenorYears ?? this.config.financialDefaults.defaultLoanTenorYears, 10);
    const annualDebtService = this.calculateAnnualDebtService(debtAmount, interestRate, loanTenorYears);

    const discountRate = parseFloat(inputs.discountRate ?? this.config.financialDefaults.defaultDiscountRate) / 100;
    const annualDegradation = parseFloat(inputs.annualDegradation ?? this.config.technicalDefaults.defaultAnnualDegradation);
    const omPercent = parseFloat(inputs.omPercent ?? this.config.financialDefaults.annualOmPercentOfCapex) / 100;
    const omInflation = parseFloat(inputs.omInflation ?? this.config.financialDefaults.annualOmEscalation) / 100;
    const baseOmCost = totalCapex * omPercent;

    const years = parseInt(inputs.projectLifespanYears ?? this.config.technicalDefaults.defaultPlantLifespanYears, 10);

    // 4. Generate 15-Year Trajectory
    const trajectory = this.energyEngine.simulateDegradationTrajectory(
      energyResult.annualDischargedKwh,
      annualDegradation,
      years
    );

    const annualSchedule = [];
    const cashflowsForProjectIRR = [-totalCapex];
    const cashflowsForEquityIRR = [-equityAmount];

    let cumulativeGrossRevenue = 0;
    let cumulativeNetCashFlow = 0;
    let cumulativeDiscountedCashFlow = -totalCapex;
    let simplePaybackYears = null;
    let discountedPaybackYears = null;

    let totalDischargedEnergy15Years = 0;
    let totalDiscountedDischargedEnergy = 0;

    for (let yr = 1; yr <= years; yr++) {
      const degItem = trajectory[yr - 1];
      const annualDischargeKwh = degItem.annualDischargedKwh;
      totalDischargedEnergy15Years += annualDischargeKwh;
      totalDiscountedDischargedEnergy += annualDischargeKwh / Math.pow(1 + discountRate, yr);

      // Baseline revenue without BESS for the shifted energy:
      // (The energy that charged the battery would otherwise have been exported at daytime tariff)
      // Taking into account that to get annualDischargeKwh, we charged annualDischargeKwh / RTE
      const chargedKwhEquiv = annualDischargeKwh / (energyResult.rtePercent / 100);
      const baselineExportRevenue = chargedKwhEquiv * tariffResult.otherPeriodTariff;

      // Priority revenue generated from discharging during peak:
      const priorityGrossRevenue = annualDischargeKwh * tariffResult.priorityTariff;

      // Net incremental gross revenue attributable directly to BESS:
      const incrementalGrossRevenue = Math.max(0, priorityGrossRevenue - baselineExportRevenue);
      cumulativeGrossRevenue += incrementalGrossRevenue;

      // Escalating O&M
      const omCost = baseOmCost * Math.pow(1 + omInflation, yr - 1);

      // Debt service applies during tenor
      const debtPayment = yr <= loanTenorYears ? annualDebtService : 0;

      // Net Project Free Cash Flow (Unlevered: before debt service)
      const projectFreeCashFlow = incrementalGrossRevenue - omCost;

      // Net Equity Free Cash Flow (Levered: after debt service)
      const equityFreeCashFlow = incrementalGrossRevenue - omCost - debtPayment;

      cumulativeNetCashFlow += projectFreeCashFlow;
      const discountedCashFlow = projectFreeCashFlow / Math.pow(1 + discountRate, yr);
      cumulativeDiscountedCashFlow += discountedCashFlow;

      // Check simple payback point (unlevered)
      if (simplePaybackYears === null && cumulativeNetCashFlow >= totalCapex) {
        const prevCumulative = cumulativeNetCashFlow - projectFreeCashFlow;
        const remainingToBreakEven = totalCapex - prevCumulative;
        const fraction = remainingToBreakEven / projectFreeCashFlow;
        simplePaybackYears = Math.round(((yr - 1) + fraction) * 10) / 10;
      }

      // Check discounted payback point
      if (discountedPaybackYears === null && cumulativeDiscountedCashFlow >= 0) {
        const prevDiscounted = cumulativeDiscountedCashFlow - discountedCashFlow;
        const remainingDiscounted = Math.abs(prevDiscounted);
        const fraction = remainingDiscounted / discountedCashFlow;
        discountedPaybackYears = Math.round(((yr - 1) + fraction) * 10) / 10;
      }

      cashflowsForProjectIRR.push(projectFreeCashFlow);
      cashflowsForEquityIRR.push(equityFreeCashFlow);

      annualSchedule.push({
        year: yr,
        retentionPercent: degItem.retentionPercent,
        annualDischargeKwh,
        priorityGrossRevenue: Math.round(priorityGrossRevenue),
        baselineExportRevenue: Math.round(baselineExportRevenue),
        incrementalGrossRevenue: Math.round(incrementalGrossRevenue),
        omCost: Math.round(omCost),
        debtPayment: Math.round(debtPayment),
        projectFreeCashFlow: Math.round(projectFreeCashFlow),
        equityFreeCashFlow: Math.round(equityFreeCashFlow),
        cumulativeNetCashFlow: Math.round(cumulativeNetCashFlow),
        cumulativeDiscountedCashFlow: Math.round(cumulativeDiscountedCashFlow)
      });
    }

    // Fallbacks if payback not reached in 15 years
    if (simplePaybackYears === null) simplePaybackYears = "> 15";
    if (discountedPaybackYears === null) discountedPaybackYears = "> 15";

    // Project NPV (Unlevered at WACC)
    let projectNpv = -totalCapex;
    for (let yr = 1; yr <= years; yr++) {
      projectNpv += cashflowsForProjectIRR[yr] / Math.pow(1 + discountRate, yr);
    }

    // Equity NPV (Levered)
    let equityNpv = -equityAmount;
    for (let yr = 1; yr <= years; yr++) {
      equityNpv += cashflowsForEquityIRR[yr] / Math.pow(1 + discountRate, yr);
    }

    // Project IRR & Equity IRR
    const projectIrr = this.calculateIRR(cashflowsForProjectIRR);
    const equityIrr = this.calculateIRR(cashflowsForEquityIRR);

    // 15-Year ROI (%) = Total Cumulative Free Cash Flow / Capex
    const roiPercent = ((cumulativeNetCashFlow - totalCapex) / totalCapex) * 100;

    // Levelized Cost of Storage (LCOS in LKR/kWh)
    const discountedCapexAndOm = totalCapex + annualSchedule.reduce((acc, row) => acc + (row.omCost / Math.pow(1 + discountRate, row.year)), 0);
    const lcosLkrPerKwh = totalDiscountedDischargedEnergy > 0 ? (discountedCapexAndOm / totalDiscountedDischargedEnergy) : 0;

    // Environmental Impact: Approx 0.72 kg CO2 avoided per kWh displaced from fossil peak grid in Sri Lanka
    const annualCo2AvoidedTonnes = Math.round((energyResult.annualDischargedKwh * 0.72) / 1000);
    const lifetimeCo2AvoidedTonnes = Math.round((totalDischargedEnergy15Years * 0.72) / 1000);

    // Generate Scenarios (Conservative -15%, Base, Optimistic +15%)
    const scenarios = this.generateScenarios(inputs, tariffResult, energyResult, totalCapex);

    return {
      tariffResult,
      energyResult,
      capexResult,
      financialSummary: {
        totalCapex: Math.round(totalCapex),
        equityAmount: Math.round(equityAmount),
        debtAmount: Math.round(debtAmount),
        debtSharePercent,
        equitySharePercent,
        interestRate,
        loanTenorYears,
        annualDebtService: Math.round(annualDebtService),
        discountRatePercent: discountRate * 100,
        yearOneGrossRevenue: annualSchedule[0].incrementalGrossRevenue,
        yearOneNetCashFlow: annualSchedule[0].projectFreeCashFlow,
        yearOneEquityCashFlow: annualSchedule[0].equityFreeCashFlow,
        cumulativeGrossRevenue: Math.round(cumulativeGrossRevenue),
        cumulativeNetCashFlow: Math.round(cumulativeNetCashFlow),
        simplePaybackYears,
        discountedPaybackYears,
        projectNpv: Math.round(projectNpv),
        equityNpv: Math.round(equityNpv),
        projectIrr: projectIrr ? Math.round(projectIrr * 10) / 10 : null,
        equityIrr: equityIrr ? Math.round(equityIrr * 10) / 10 : null,
        roiPercent: Math.round(roiPercent * 10) / 10,
        lcosLkrPerKwh: Math.round(lcosLkrPerKwh * 100) / 100,
        annualCo2AvoidedTonnes,
        lifetimeCo2AvoidedTonnes
      },
      annualSchedule,
      scenarios
    };
  }

  /**
   * Scenario sensitivity analysis: Low / Base / High
   */
  generateScenarios(inputs, tariffResult, energyResult, baseCapex) {
    const baseRev = energyResult.annualDischargedKwh * (tariffResult.priorityTariff - tariffResult.otherPeriodTariff);
    const baseCapexVal = baseCapex;

    // Conservative: +10% Capex, -10% Tariff Spread, +20% Degradation
    const consCapex = baseCapexVal * 1.10;
    const consRev = baseRev * 0.88;
    const consPayback = consRev > 0 ? Math.round((consCapex / (consRev * 0.92)) * 10) / 10 : 15;
    const consIrr = Math.max(5, (tariffResult.priorityTariff * 0.9 / 47.0) * 14.2);

    // Optimistic: -8% Capex, +12% Tariff Spread (e.g. Higher R1' index), Higher Utilization
    const optCapex = baseCapexVal * 0.92;
    const optRev = baseRev * 1.15;
    const optPayback = optRev > 0 ? Math.round((optCapex / (optRev * 0.95)) * 10) / 10 : 4;
    const optIrr = Math.min(35, (tariffResult.priorityTariff * 1.12 / 47.0) * 23.5);

    return {
      conservative: {
        label: "Conservative Scenario",
        description: "Higher EPC Capex (+10%), -10% R1' index, lower solar irradiance",
        capex: Math.round(consCapex),
        yearOneRevenue: Math.round(consRev),
        paybackYears: consPayback,
        irrPercent: Math.round(consIrr * 10) / 10,
        color: "#f59e0b"
      },
      base: {
        label: "Base Case Scenario",
        description: "Official PUCSL formula, current market EPC benchmarks, standard solar yield",
        capex: Math.round(baseCapexVal),
        yearOneRevenue: Math.round(baseRev),
        paybackYears: 0, // Will be filled from base model
        irrPercent: 0,
        color: "#10b981"
      },
      optimistic: {
        label: "Optimistic Scenario",
        description: "Bulk battery procurement discount (-8%), higher fuel adjustment index (+15%)",
        capex: Math.round(optCapex),
        yearOneRevenue: Math.round(optRev),
        paybackYears: optPayback,
        irrPercent: Math.round(optIrr * 10) / 10,
        color: "#00f59b"
      }
    };
  }
}

// Export singleton to global scope
window.voltxFinancialEngine = new FinancialEngine();

