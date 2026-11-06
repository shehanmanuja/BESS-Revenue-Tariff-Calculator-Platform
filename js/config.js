/**
 * VOLTX BESS Analytics - Global Configuration & Tariff Management System
 * Configurable administrative parameters for CEB/LECO prosumer tariffs and BESS specifications.
 */

const DEFAULT_CONFIG = {
  // Regulatory Metadata
  regulatory: {
    authority: "Public Utilities Commission of Sri Lanka (PUCSL)",
    gazetteRef: "Gazette Extraordinary No. 2384/22 & CEB BESS Prosumer Guidelines",
    effectiveDate: "2024-06-01",
    lastUpdated: "2024-11-15",
    priorityWindowHours: 4.0, // 18:30 - 22:30 Peak Window
    peakWindowStart: "18:30",
    peakWindowEnd: "22:30",
    standardGridFrequency: "50 Hz",
    voltageLevel: "Medium Voltage (11 kV / 33 kV)"
  },

  // Tariff Formulas & Constants
  tariffs: {
    // Current PUCSL Reference Variable Cost index R1' (Fuel & generation adjustment factor in LKR/kWh)
    r1Prime: 13.45, // Configurable LKR/kWh

    // Round-trip efficiency factor in regulatory denominator
    efficiencyDivisor: 0.95,

    // Rooftop Prosumer Tier 1: 250 kW <= Capacity <= 1,000 kW
    rooftopTier1: {
      minCapacityKw: 250,
      maxCapacityKw: 1000,
      baseRate: 33.51, // LKR/kWh
      formulaDescription: "Priority Tariff = 33.51 + (R1' / 0.95)"
    },

    // Rooftop Prosumer Tier 2: Capacity > 1,000 kW
    rooftopTier2: {
      minCapacityKw: 1000.01,
      maxCapacityKw: 50000,
      baseRate: 30.27, // LKR/kWh
      formulaDescription: "Priority Tariff = 30.27 + (R1' / 0.95)"
    },

    // Default Other-period (Daytime standard export) tariff for existing SPPA
    defaultOtherPeriodTariff: 22.00, // LKR/kWh standard fixed tier

    // Ground-Mounted Solar Utility Tariff Engine Parameters
    // Ground-mounted systems do NOT use the Rooftop prosumer formula; they operate under separate CEB PPA / Avoided-Cost dispatch rules.
    groundMounted: {
      baseAvoidedCostRate: 28.50, // LKR/kWh
      peakMultiplier: 1.35,       // Peak hour dispatch multiplier
      daytimeExportRate: 20.00,    // LKR/kWh
      formulaDescription: "Peak Dispatch Tariff = Base Avoided Cost × 1.35 (Subject to CEB Utility Dispatch Agreement)"
    }
  },

  // Technical BESS Default Benchmarks
  technicalDefaults: {
    minSolarCapacity: 250, // Minimum eligible capacity in kW
    defaultDepthOfDischarge: 90, // %
    defaultRoundTripEfficiency: 88, // % (AC-to-AC)
    defaultOperatingCycles: 1.0, // cycles per day
    defaultAnnualDegradation: 1.8, // % per year
    defaultWarrantyYears: 10,
    defaultPlantLifespanYears: 15,
    standardSpecificYield: 122, // kWh/kW/month in Sri Lanka (approx 1,460 kWh/kWp/year)
    auxiliaryLossPercent: 2.0 // % HVAC and BMS self-consumption
  },

  // Financial Benchmarks (Current Sri Lankan C&I Clean Energy Market in LKR)
  financialDefaults: {
    // Capex benchmarks per kWh and per kW for Tier 1 LFP Containers + PCS
    batteryPackCostPerKwh: 65000, // LKR per kWh (approx $215/kWh equivalent)
    pcsInverterCostPerKw: 28000,  // LKR per kW bi-directional PCS
    bopAndInstallationPercent: 18, // 18% of equipment cost for balance of plant, switchgear, civil, fire suppression & interconnection
    
    // O&M and Financial Structure
    annualOmPercentOfCapex: 1.5, // 1.5% of initial Capex per year
    annualOmEscalation: 4.0,     // 4% annual inflation escalation
    defaultDiscountRate: 12.0,   // % WACC / Cost of capital for NPV
    
    // Financing Options
    defaultDebtShare: 70,        // 70% Debt
    defaultEquityShare: 30,      // 30% Equity
    defaultInterestRate: 11.5,   // % concessionary renewable energy bank loan
    defaultLoanTenorYears: 7     // 7 years repayment
  },

  // Standard Presets for Instant One-Click Evaluation
  presets: [
    {
      id: "tea-factory-500kw",
      name: "Upcountry Tea Processing Facility (500 kW Rooftop)",
      category: "C&I Rooftop",
      plantType: "rooftop",
      solarCapacityKw: 500,
      utility: "CEB",
      existingTariff: 22.00,
      sppaType: "Net Plus",
      commissioningYear: 2021,
      remainingYears: 17,
      monthlyGenKwh: 61000,
      excessSolarPercent: 55, // 55% available to charge battery
      bessCapacityKwh: 1000,  // 2-hour storage
      bessPowerKw: 250,
      totalCapexLkr: 78000000
    },
    {
      id: "garment-apparel-1000kw",
      name: "Apparel Export Complex, Katunayake (1,000 kW Rooftop)",
      category: "C&I Rooftop",
      plantType: "rooftop",
      solarCapacityKw: 1000,
      utility: "LECO",
      existingTariff: 22.00,
      sppaType: "Net Plus",
      commissioningYear: 2020,
      remainingYears: 16,
      monthlyGenKwh: 125000,
      excessSolarPercent: 60,
      bessCapacityKwh: 2000,
      bessPowerKw: 500,
      totalCapexLkr: 152000000
    },
    {
      id: "commercial-mall-300kw",
      name: "Commercial Retail Center, Colombo (300 kW Rooftop)",
      category: "C&I Rooftop",
      plantType: "rooftop",
      solarCapacityKw: 300,
      utility: "LECO",
      existingTariff: 22.00,
      sppaType: "Net Accounting",
      commissioningYear: 2022,
      remainingYears: 18,
      monthlyGenKwh: 36600,
      excessSolarPercent: 50,
      bessCapacityKwh: 600,
      bessPowerKw: 150,
      totalCapexLkr: 48000000
    },
    {
      id: "ground-mount-utility-2000kw",
      name: "Hambantota Ground-Mount Solar Park (2,000 kW Ground)",
      category: "Utility Ground-Mounted",
      plantType: "ground",
      solarCapacityKw: 2000,
      utility: "CEB",
      existingTariff: 18.50,
      sppaType: "Standard SPPA",
      commissioningYear: 2019,
      remainingYears: 15,
      monthlyGenKwh: 260000,
      excessSolarPercent: 70,
      bessCapacityKwh: 4000,
      bessPowerKw: 1000,
      totalCapexLkr: 295000000
    }
  ]
};

// Storage helper for Admin configurations
class ConfigManager {
  constructor() {
    this.storageKey = "VOLTX_BESS_CONFIG_V1";
    this.currentConfig = this.loadConfig();
  }

  loadConfig() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not read stored BESS config; falling back to default.", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  saveConfig(newConfig) {
    try {
      this.currentConfig = newConfig;
      localStorage.setItem(this.storageKey, JSON.stringify(newConfig));
      // Dispatch custom event so all open views recompute reactively
      window.dispatchEvent(new CustomEvent("voltx:configChanged", { detail: this.currentConfig }));
      return true;
    } catch (e) {
      console.error("Failed to save config to localStorage", e);
      return false;
    }
  }

  resetToDefault() {
    localStorage.removeItem(this.storageKey);
    this.currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    window.dispatchEvent(new CustomEvent("voltx:configChanged", { detail: this.currentConfig }));
    return this.currentConfig;
  }

  getConfig() {
    return this.currentConfig;
  }
}

// Deep merge helper
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

// Export singleton instance to global window object
window.voltxConfigManager = new ConfigManager();

