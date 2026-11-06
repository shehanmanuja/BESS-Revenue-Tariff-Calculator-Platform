/**
 * VOLTX BESS Analytics - Energy Simulation Engine
 * Models hourly solar generation profiles, battery charging/discharging dispatch,
 * Round-trip losses, and multi-year battery degradation.
 */

class EnergyEngine {
  constructor(configManager) {
    this.configManager = configManager || window.voltxConfigManager;
  }

  get config() {
    return this.configManager.getConfig();
  }

  /**
   * Recommend optimal BESS sizing for an existing solar plant.
   * Sizing is optimized for the 4-hour CEB/LECO peak priority window (18:30 - 22:30).
   */
  recommendBessSizing(solarCapacityKw, avgMonthlyGenKwh, excessPercent = 55) {
    const capacity = parseFloat(solarCapacityKw) || 250;
    const monthlyGen = parseFloat(avgMonthlyGenKwh) || (capacity * this.config.technicalDefaults.standardSpecificYield);
    const dailyGenKwh = monthlyGen / 30.42;
    const availableDailyExcessKwh = dailyGenKwh * (parseFloat(excessPercent) / 100);

    // Peak window is 4.0 hours (18:30 to 22:30)
    // Optimal battery capacity captures the available excess without over-sizing.
    // Usable capacity is typically between 1.5x to 2.5x the solar kW rating, bounded by daily excess.
    let recommendedKwh = Math.round(availableDailyExcessKwh * 0.90 / 50) * 50;
    // Keep it realistic for commercial LFP container/rack modularity (e.g. 250, 500, 1000, 1500 kWh)
    if (recommendedKwh < 250) recommendedKwh = 250;
    if (recommendedKwh > capacity * 4) recommendedKwh = Math.round((capacity * 2.5) / 50) * 50;

    // Optimal PCS power rating for 4-hour discharge duration (C/4 or C/2 rating)
    const recommendedPowerKw = Math.round((recommendedKwh / 4) / 25) * 25;

    return {
      recommendedCapacityKwh: recommendedKwh,
      recommendedPowerKw: Math.max(100, recommendedPowerKw),
      cRate: (recommendedPowerKw / recommendedKwh).toFixed(2),
      dischargeDurationHours: 4.0,
      dailyAvailableSolarKwh: Math.round(dailyGenKwh),
      dailyExcessKwh: Math.round(availableDailyExcessKwh)
    };
  }

  /**
   * Simulate annual energy balance for Year 1.
   */
  simulateYearOne(inputs) {
    const solarCapacityKw = parseFloat(inputs.solarCapacityKw) || 500;
    const monthlyGenKwh = parseFloat(inputs.monthlyGenKwh) || (solarCapacityKw * 122);
    const annualSolarGenKwh = monthlyGenKwh * 12;
    const dailySolarGenKwh = annualSolarGenKwh / 365;

    const excessPercent = parseFloat(inputs.excessSolarPercent) || 55;
    const dailyExcessSolarKwh = dailySolarGenKwh * (excessPercent / 100);
    const dailyDirectSelfConsumeExportKwh = dailySolarGenKwh - dailyExcessSolarKwh;

    // BESS parameters
    const bessCapacityKwh = parseFloat(inputs.bessCapacityKwh) || 1000;
    const bessPowerKw = parseFloat(inputs.bessPowerKw) || 250;
    const dodPercent = parseFloat(inputs.depthOfDischarge || this.config.technicalDefaults.defaultDepthOfDischarge) / 100;
    const rtePercent = parseFloat(inputs.roundTripEfficiency || this.config.technicalDefaults.defaultRoundTripEfficiency) / 100;
    const dailyCycles = parseFloat(inputs.dailyCycles || this.config.technicalDefaults.defaultOperatingCycles);

    // Usable energy per cycle
    const usableCapacityKwh = bessCapacityKwh * dodPercent;

    // AC energy required to charge battery per day:
    // With one-way charge efficiency approx sqrt(RTE)
    const oneWayChargeEfficiency = Math.sqrt(rtePercent);
    const oneWayDischargeEfficiency = Math.sqrt(rtePercent);

    // Energy needed from solar PV to fully charge BESS:
    const dailyChargeEnergyRequiredKwh = (usableCapacityKwh / oneWayChargeEfficiency) * dailyCycles;

    // Actual solar energy stored (limited by available daily excess)
    const actualDailyChargedKwh = Math.min(dailyExcessSolarKwh, dailyChargeEnergyRequiredKwh);

    // Actual daily energy dispatched during 18:30 - 22:30 priority peak:
    const actualDailyDischargedKwh = actualDailyChargedKwh * rtePercent;

    // Remaining daytime solar direct export (after charging BESS)
    const dailyRemainingDirectExportKwh = dailySolarGenKwh - actualDailyChargedKwh;

    // Annualized figures
    const annualChargedKwh = actualDailyChargedKwh * 365;
    const annualDischargedKwh = actualDailyDischargedKwh * 365;
    const annualRemainingDirectExportKwh = dailyRemainingDirectExportKwh * 365;
    const annualRoundTripLossesKwh = annualChargedKwh - annualDischargedKwh;

    return {
      solarCapacityKw,
      annualSolarGenKwh: Math.round(annualSolarGenKwh),
      dailySolarGenKwh: Math.round(dailySolarGenKwh),
      dailyExcessSolarKwh: Math.round(dailyExcessSolarKwh),
      usableCapacityKwh: Math.round(usableCapacityKwh),
      actualDailyChargedKwh: Math.round(actualDailyChargedKwh),
      actualDailyDischargedKwh: Math.round(actualDailyDischargedKwh),
      annualChargedKwh: Math.round(annualChargedKwh),
      annualDischargedKwh: Math.round(annualDischargedKwh),
      annualRemainingDirectExportKwh: Math.round(annualRemainingDirectExportKwh),
      annualRoundTripLossesKwh: Math.round(annualRoundTripLossesKwh),
      rtePercent: Math.round(rtePercent * 100),
      dodPercent: Math.round(dodPercent * 100),
      dailyCycles,
      solarAbsorptionRatio: Math.min(100, Math.round((actualDailyChargedKwh / dailyExcessSolarKwh) * 100))
    };
  }

  /**
   * Calculate 15-year multi-year degradation trajectory.
   * Models LFP capacity retention curve with warranty backstop.
   */
  simulateDegradationTrajectory(yearOneDischargedKwh, annualDegradationPercent, years = 15) {
    const trajectory = [];
    const degRate = parseFloat(annualDegradationPercent) / 100;
    let currentCapacityRetention = 1.0;

    for (let yr = 1; yr <= years; yr++) {
      if (yr > 1) {
        // Linear degradation model typical for tier-1 LFP (with slight inflection)
        currentCapacityRetention *= (1 - degRate);
      }
      const dischargedKwh = Math.round(yearOneDischargedKwh * currentCapacityRetention);

      trajectory.push({
        year: yr,
        retentionPercent: Math.round(currentCapacityRetention * 1000) / 10,
        annualDischargedKwh: dischargedKwh
      });
    }

    return trajectory;
  }

  /**
   * Generate 24-hour typical dispatch profile curve.
   * Produces hourly power vectors (kW) for:
   * - Solar Generation Curve
   * - On-Site Baseline Demand
   * - BESS Charging Profile (10:00 - 14:00 peak solar)
   * - BESS Discharging Profile (18:30 - 22:30 priority peak)
   * - Net Grid Interaction
   */
  generate24HourDispatchProfile(solarCapacityKw, bessPowerKw, bessCapacityKwh) {
    const hours = [];
    const solarCurve = [];
    const bessChargeCurve = [];
    const bessDischargeCurve = [];
    const gridExportCurve = [];

    // Bell curve solar irradiance model (6:00 to 18:00)
    for (let h = 0; h < 24; h++) {
      const timeLabel = `${String(h).padStart(2, '0')}:00`;
      hours.push(timeLabel);

      let solarKw = 0;
      if (h >= 6 && h <= 18) {
        // Peak at 12:30
        const rad = Math.sin(((h - 6) / 12) * Math.PI);
        solarKw = Math.max(0, Math.round(solarCapacityKw * 0.85 * Math.pow(rad, 1.4)));
      }
      solarCurve.push(solarKw);

      // BESS Charging: Occurs during peak solar midday (10:00 - 14:00)
      let chargeKw = 0;
      if (h >= 10 && h <= 14 && solarKw > bessPowerKw * 0.8) {
        chargeKw = Math.min(bessPowerKw, solarKw * 0.6);
      }
      bessChargeCurve.push(chargeKw);

      // BESS Discharging: Occurs strictly during the priority window (18:30 - 22:30)
      let dischargeKw = 0;
      if (h >= 18 && h <= 22) {
        if (h === 18) dischargeKw = bessPowerKw * 0.5; // Starts at 18:30
        else if (h === 22) dischargeKw = bessPowerKw * 0.5; // Ends at 22:30
        else dischargeKw = bessPowerKw;
      }
      bessDischargeCurve.push(dischargeKw);

      // Net export to grid
      const netGridKw = solarKw - chargeKw + dischargeKw;
      gridExportCurve.push(Math.round(netGridKw));
    }

    return {
      hours,
      solarCurve,
      bessChargeCurve,
      bessDischargeCurve,
      gridExportCurve
    };
  }

  /**
   * Generate 12-month seasonal generation profile for Sri Lankan irradiance.
   */
  generateMonthlyProfile(solarCapacityKw, bessCapacityKwh) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // Specific yield index multipliers by month in Sri Lanka (reflecting inter-monsoonal variations)
    const seasonalWeights = [1.02, 1.08, 1.15, 1.06, 0.94, 0.88, 0.91, 0.96, 0.98, 0.95, 0.97, 1.01];
    const baseMonthlyGen = solarCapacityKw * 122;

    const solarGenData = [];
    const directExportData = [];
    const bessShiftedData = [];

    months.forEach((m, idx) => {
      const monthGen = Math.round(baseMonthlyGen * seasonalWeights[idx]);
      const shifted = Math.min(monthGen * 0.45, bessCapacityKwh * 30.42 * 0.9 * 0.88);
      const direct = monthGen - shifted;

      solarGenData.push(monthGen);
      bessShiftedData.push(Math.round(shifted));
      directExportData.push(Math.round(direct));
    });

    return {
      months,
      solarGenData,
      directExportData,
      bessShiftedData
    };
  }

  /**
   * Parse uploaded CSV file containing solar generation or export data.
   */
  parseSolarCsv(csvText) {
    const lines = csvText.trim().split(/\r\n|\n/);
    if (lines.length < 2) {
      throw new Error("CSV file must contain a header row and at least one data row.");
    }

    const header = lines[0].toLowerCase();
    let totalKwh = 0;
    let dataPoints = 0;
    const monthlyValues = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",");
      if (row.length >= 2) {
        const val = parseFloat(row[1]);
        if (!isNaN(val)) {
          totalKwh += val;
          dataPoints++;
          monthlyValues.push({ period: row[0].trim(), kwh: val });
        }
      }
    }

    if (dataPoints === 0) {
      throw new Error("No numeric generation data found in column 2 of the CSV.");
    }

    const avgMonthlyKwh = dataPoints === 12 ? Math.round(totalKwh / 12) : Math.round(totalKwh);

    return {
      success: true,
      dataPoints,
      totalKwh: Math.round(totalKwh),
      avgMonthlyKwh,
      monthlyValues
    };
  }

  /**
   * Generate downloadable sample CSV content.
   */
  generateSampleCsv() {
    return `Month,Solar_Generation_kWh,Onsite_Export_kWh
January,62500,34000
February,66000,37000
March,70500,41000
April,65000,36000
May,57500,30000
June,54000,28500
July,56000,29500
August,59000,31500
September,60000,32500
October,58000,31000
November,59500,32000
December,62000,34000`;
  }
}

// Export singleton to global scope
window.voltxEnergyEngine = new EnergyEngine();

