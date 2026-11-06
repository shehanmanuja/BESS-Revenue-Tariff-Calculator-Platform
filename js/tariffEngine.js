/**
 * VOLTX BESS Analytics - Tariff Calculation Engine
 * Implements official PUCSL / CEB / LECO tariff calculation formulas and validation rules.
 */

class TariffEngine {
  constructor(configManager) {
    this.configManager = configManager || window.voltxConfigManager;
  }

  get config() {
    return this.configManager.getConfig();
  }

  /**
   * Determine eligibility and calculate applicable tariffs for a given plant configuration.
   * @param {Object} plantInfo - { plantType: 'rooftop'|'ground', capacityKw: number, existingTariff: number, utility: 'CEB'|'LECO' }
   * @returns {Object} Comprehensive tariff evaluation result
   */
  evaluateTariff(plantInfo) {
    const cfg = this.config;
    const capacity = parseFloat(plantInfo.capacityKw) || 0;
    const plantType = (plantInfo.plantType || "rooftop").toLowerCase();
    const existingTariff = parseFloat(plantInfo.existingTariff) || cfg.tariffs.defaultOtherPeriodTariff;
    const r1Prime = parseFloat(cfg.tariffs.r1Prime) || 13.45;
    const divisor = parseFloat(cfg.tariffs.efficiencyDivisor) || 0.95;

    // Check minimum capacity threshold (250 kW)
    if (capacity < cfg.technicalDefaults.minSolarCapacity) {
      return {
        isEligible: false,
        eligibilityError: `Plant capacity (${capacity} kW) is below the minimum threshold of ${cfg.technicalDefaults.minSolarCapacity} kW required under the PUCSL prosumer BESS framework.`,
        category: "Below Threshold (< 250 kW)",
        priorityTariff: 0,
        otherPeriodTariff: existingTariff,
        tariffSpread: 0,
        formulaString: "N/A - Not Eligible",
        steps: [],
        regulatoryRef: cfg.regulatory.gazetteRef,
        effectiveDate: cfg.regulatory.effectiveDate
      };
    }

    // Pathway A: Rooftop Prosumer Pathway
    if (plantType === "rooftop") {
      let tierName = "";
      let baseRate = 0;
      let formulaStr = "";

      if (capacity <= 1000) {
        // Tier 1: 250 kW to 1,000 kW
        tierName = "Rooftop Prosumer Tier 1 (250 kW – 1,000 kW)";
        baseRate = cfg.tariffs.rooftopTier1.baseRate; // 33.51
        formulaStr = "Priority Tariff = 33.51 + (R1' / 0.95)";
      } else {
        // Tier 2: Above 1,000 kW
        tierName = "Rooftop Prosumer Tier 2 (> 1,000 kW)";
        baseRate = cfg.tariffs.rooftopTier2.baseRate; // 30.27
        formulaStr = "Priority Tariff = 30.27 + (R1' / 0.95)";
      }

      const variableAdjustment = r1Prime / divisor;
      const priorityTariff = Math.round((baseRate + variableAdjustment) * 100) / 100;
      const otherPeriodTariff = existingTariff;
      const tariffSpread = Math.max(0, priorityTariff - otherPeriodTariff);
      const spreadPercentage = otherPeriodTariff > 0 ? (tariffSpread / otherPeriodTariff) * 100 : 0;

      const steps = [
        {
          label: "1. Regulatory Category Classification",
          description: `Existing rooftop installation of ${capacity.toLocaleString()} kW qualifies under PUCSL ${tierName}.`
        },
        {
          label: "2. Base Capital & Fixed O&M Component",
          description: `Fixed base rate approved by regulatory framework:`,
          math: `${baseRate.toFixed(2)} LKR/kWh`
        },
        {
          label: "3. Variable Cost & Fuel Adjustment Component (R1' / η)",
          description: `Adjusted using Reference Index R1' (${r1Prime.toFixed(2)} LKR/kWh) divided by standardized RTE factor (${divisor}):`,
          math: `(${r1Prime.toFixed(2)} / ${divisor.toFixed(2)}) = ${variableAdjustment.toFixed(4)} LKR/kWh`
        },
        {
          label: "4. Resulting Priority Peak Tariff",
          description: `Sum of fixed base component and variable adjustment:`,
          math: `${baseRate.toFixed(2)} + ${variableAdjustment.toFixed(2)} = ${priorityTariff.toFixed(2)} LKR/kWh`
        },
        {
          label: "5. Other-Period Tariff & Arbitrage Spread",
          description: `Discharging during peak hours earns an arbitrage premium over daytime export:`,
          math: `Priority (${priorityTariff.toFixed(2)}) - Daytime (${otherPeriodTariff.toFixed(2)}) = +${tariffSpread.toFixed(2)} LKR/kWh (+${spreadPercentage.toFixed(1)}% uplift)`
        }
      ];

      return {
        isEligible: true,
        plantType: "rooftop",
        category: tierName,
        baseRate,
        r1Prime,
        divisor,
        variableAdjustment,
        priorityTariff,
        otherPeriodTariff,
        tariffSpread,
        spreadPercentage,
        formulaString: formulaStr,
        steps,
        regulatoryRef: cfg.regulatory.gazetteRef,
        effectiveDate: cfg.regulatory.effectiveDate,
        notes: "Approved prosumer pathway for existing Net Plus / Net Accounting rooftop solar generators with CEB / LECO grid interconnection."
      };
    } 
    
    // Pathway B: Ground-Mounted Solar Utility Pathway
    else {
      // Ground-mounted systems do NOT use the prosumer formula.
      // They use CEB Utility Avoided Cost / Peak Dispatch Framework.
      const gm = cfg.tariffs.groundMounted;
      const baseAvoidedCost = gm.baseAvoidedCostRate; // e.g. 28.50 LKR/kWh
      const peakMultiplier = gm.peakMultiplier; // 1.35
      const priorityTariff = Math.round((baseAvoidedCost * peakMultiplier) * 100) / 100;
      const otherPeriodTariff = existingTariff || gm.daytimeExportRate;
      const tariffSpread = Math.max(0, priorityTariff - otherPeriodTariff);
      const spreadPercentage = otherPeriodTariff > 0 ? (tariffSpread / otherPeriodTariff) * 100 : 0;

      const steps = [
        {
          label: "1. Regulatory Category Distinction",
          description: "IMPORTANT: Rooftop prosumer formulas (33.51/30.27 + R1'/0.95) are NOT applicable to Ground-Mounted utility installations under PUCSL rules."
        },
        {
          label: "2. Ground-Mount Utility Dispatch Framework",
          description: "Ground-mounted solar plants with BESS operate under CEB Grid Dispatch & Avoided-Cost Peak Arbitrage agreement.",
          math: `Base Avoided Cost: ${baseAvoidedCost.toFixed(2)} LKR/kWh`
        },
        {
          label: "3. Peak Priority Dispatch Multiplier",
          description: "Applied peak-window grid support factor during the 18:30 – 22:30 system evening peak:",
          math: `${baseAvoidedCost.toFixed(2)} × ${peakMultiplier.toFixed(2)} = ${priorityTariff.toFixed(2)} LKR/kWh`
        },
        {
          label: "4. Net Tariff Realization",
          description: "Discharge during priority hours yields:",
          math: `Priority Tariff: ${priorityTariff.toFixed(2)} LKR/kWh (Spread vs Daytime: +${tariffSpread.toFixed(2)} LKR/kWh)`
        }
      ];

      return {
        isEligible: true,
        plantType: "ground",
        category: "Utility Ground-Mounted Solar (Separate Tariff Schedule)",
        baseRate: baseAvoidedCost,
        r1Prime: null,
        divisor: null,
        variableAdjustment: 0,
        priorityTariff,
        otherPeriodTariff,
        tariffSpread,
        spreadPercentage,
        formulaString: gm.formulaDescription,
        steps,
        regulatoryRef: "CEB Generation Planning & Long-Term Avoided Cost Tariff Schedule (Ground-Mount Category)",
        effectiveDate: cfg.regulatory.effectiveDate,
        notes: "Ground-mounted plants require utility dispatch clearance. The prosumer formula does not apply."
      };
    }
  }

  /**
   * Helper to format currency in Sri Lankan Rupees.
   */
  static formatLKR(amount, decimals = 2) {
    if (isNaN(amount) || amount === null || amount === undefined) return "LKR 0.00";
    return "LKR " + Number(amount).toLocaleString("en-LK", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Helper to format large values compactly (Millions / Billions LKR)
   */
  static formatLKRCompact(amount) {
    if (isNaN(amount)) return "LKR 0";
    const abs = Math.abs(amount);
    if (abs >= 1e9) {
      return (amount / 1e9).toFixed(2) + " Bn LKR";
    }
    if (abs >= 1e6) {
      return (amount / 1e6).toFixed(2) + " Mn LKR";
    }
    if (abs >= 1e3) {
      return (amount / 1e3).toFixed(1) + "k LKR";
    }
    return "LKR " + Math.round(amount).toLocaleString();
  }
}

// Export singleton to global scope
window.voltxTariffEngine = new TariffEngine();

