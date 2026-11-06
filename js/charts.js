/**
 * VOLTX BESS Analytics - Charts Management Module (Clean Light Theme)
 * High-resolution data visualizations using Chart.js configured for light background.
 */

class VoltxCharts {
  constructor() {
    this.charts = {};
    this.initGlobalDefaults();
  }

  initGlobalDefaults() {
    if (typeof Chart === "undefined") return;

    // Apply Clean Light Theme Defaults
    Chart.defaults.color = "#475569"; // slate-600
    Chart.defaults.borderColor = "rgba(226, 232, 240, 0.8)"; // slate-200 with opacity
    Chart.defaults.font.family = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 12;

    // Custom Clean Tooltip Styling
    Chart.defaults.plugins.tooltip.backgroundColor = "#ffffff";
    Chart.defaults.plugins.tooltip.titleColor = "#0f172a";
    Chart.defaults.plugins.tooltip.bodyColor = "#334155";
    Chart.defaults.plugins.tooltip.borderColor = "#e2e8f0";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.boxPadding = 6;
    Chart.defaults.plugins.tooltip.usePointStyle = true;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }

  /**
   * Helper to safely destroy and re-create a chart instance.
   */
  destroyChart(key) {
    if (this.charts[key]) {
      this.charts[key].destroy();
      delete this.charts[key];
    }
  }

  /**
   * 1. Monthly Energy Generation & BESS Shift Chart
   */
  renderMonthlyGenChart(canvasId, monthlyData) {
    this.destroyChart("monthlyGen");
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.charts.monthlyGen = new Chart(ctx, {
      type: "bar",
      data: {
        labels: monthlyData.months,
        datasets: [
          {
            label: "Direct Solar Grid Export (kWh)",
            data: monthlyData.directExportData,
            backgroundColor: "rgba(59, 130, 246, 0.75)", // electric blue
            borderColor: "#2563eb",
            borderWidth: 1,
            borderRadius: 4,
            order: 2
          },
          {
            label: "BESS Stored & Shifted Energy (kWh)",
            data: monthlyData.bessShiftedData,
            backgroundColor: "rgba(5, 150, 105, 0.85)", // emerald green
            borderColor: "#059669",
            borderWidth: 1,
            borderRadius: 4,
            order: 1
          },
          {
            label: "Total Monthly Solar Generation (kWh)",
            data: monthlyData.solarGenData,
            type: "line",
            borderColor: "#d97706", // amber
            backgroundColor: "transparent",
            borderWidth: 2.2,
            pointBackgroundColor: "#d97706",
            pointRadius: 3,
            tension: 0.3,
            order: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: {
            stacked: true,
            ticks: {
              callback: (val) => (val >= 1000 ? (val / 1000).toLocaleString() + "k kWh" : val + " kWh")
            },
            grid: { color: "rgba(241, 245, 249, 1)" }
          }
        },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }

  /**
   * 2. Daily 24-Hour Battery Charging vs Discharging Profile
   */
  renderDailyDispatchChart(canvasId, dispatchData) {
    this.destroyChart("dailyDispatch");
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.charts.dailyDispatch = new Chart(ctx, {
      type: "line",
      data: {
        labels: dispatchData.hours,
        datasets: [
          {
            label: "Solar PV Output (kW)",
            data: dispatchData.solarCurve,
            borderColor: "#d97706",
            backgroundColor: "rgba(217, 119, 6, 0.08)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: "BESS Midday Charging (kW)",
            data: dispatchData.bessChargeCurve,
            borderColor: "#0891b2", // cyan
            backgroundColor: "rgba(8, 145, 178, 0.15)",
            borderWidth: 2,
            fill: true,
            tension: 0.2,
            pointRadius: 0
          },
          {
            label: "Priority Peak Discharge 18:30–22:30 (kW)",
            data: dispatchData.bessDischargeCurve,
            borderColor: "#059669", // emerald
            backgroundColor: "rgba(5, 150, 105, 0.25)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.1,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { color: "rgba(241, 245, 249, 1)" } },
          y: {
            ticks: { callback: (val) => val + " kW" },
            grid: { color: "rgba(241, 245, 249, 1)" }
          }
        },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }

  /**
   * 3. Priority vs Other-Period Revenue Comparison (Baseline vs With BESS)
   */
  renderRevenueComparisonChart(canvasId, result) {
    this.destroyChart("revenueComparison");
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const y1 = result.annualSchedule[0];
    const baseline = y1.baselineExportRevenue / 1e6;
    const netBessLift = y1.incrementalGrossRevenue / 1e6;

    this.charts.revenueComparison = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          "Without BESS (Daytime Export Only)",
          "With BESS (Solar Direct + Priority Peak Feed-in)"
        ],
        datasets: [
          {
            label: "Daytime Baseline Tariff Revenue (Mn LKR)",
            data: [baseline, baseline],
            backgroundColor: "rgba(148, 163, 184, 0.65)", // slate-400
            borderRadius: 6
          },
          {
            label: "BESS Priority Arbitrage Revenue Uplift (Mn LKR)",
            data: [0, netBessLift],
            backgroundColor: "rgba(5, 150, 105, 0.88)", // emerald
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: {
            stacked: true,
            ticks: { callback: (val) => val.toFixed(1) + " Mn LKR" },
            grid: { color: "rgba(241, 245, 249, 1)" }
          }
        },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }

  /**
   * 4. 15-Year Annual Revenue & O&M Cash Flow Projection
   */
  renderAnnualCashFlowChart(canvasId, annualSchedule) {
    this.destroyChart("annualCashFlow");
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = annualSchedule.map((s) => `Yr ${s.year}`);
    const grossRev = annualSchedule.map((s) => s.incrementalGrossRevenue / 1e6);
    const omCost = annualSchedule.map((s) => s.omCost / 1e6);
    const netCashFlow = annualSchedule.map((s) => s.projectFreeCashFlow / 1e6);

    this.charts.annualCashFlow = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Incremental BESS Gross Revenue (Mn LKR)",
            data: grossRev,
            backgroundColor: "rgba(5, 150, 105, 0.75)",
            borderRadius: 4
          },
          {
            label: "Annual O&M Cost (Mn LKR)",
            data: omCost,
            backgroundColor: "rgba(225, 29, 72, 0.75)",
            borderRadius: 4
          },
          {
            label: "Net Project Free Cash Flow (Mn LKR)",
            data: netCashFlow,
            type: "line",
            borderColor: "#047857",
            backgroundColor: "transparent",
            borderWidth: 2.5,
            pointBackgroundColor: "#047857",
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: { callback: (val) => val.toFixed(1) + " Mn LKR" },
            grid: { color: "rgba(241, 245, 249, 1)" }
          }
        },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }

  /**
   * 5. 15-Year Cumulative Cash Flow & Break-Even Curve
   */
  renderCumulativeCashFlowChart(canvasId, annualSchedule, totalCapex) {
    this.destroyChart("cumulativeCashFlow");
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = ["Yr 0", ...annualSchedule.map((s) => `Yr ${s.year}`)];
    const cumulativeUnlevered = [-totalCapex / 1e6, ...annualSchedule.map((s) => (s.cumulativeNetCashFlow - totalCapex) / 1e6)];
    const cumulativeDiscounted = [-totalCapex / 1e6, ...annualSchedule.map((s) => s.cumulativeDiscountedCashFlow / 1e6)];

    this.charts.cumulativeCashFlow = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Cumulative Net Cash Flow (Mn LKR)",
            data: cumulativeUnlevered,
            borderColor: "#059669",
            backgroundColor: "rgba(5, 150, 105, 0.08)",
            borderWidth: 2.5,
            fill: true,
            pointBackgroundColor: cumulativeUnlevered.map((val) => (val >= 0 ? "#059669" : "#e11d48")),
            pointRadius: 4,
            tension: 0.25
          },
          {
            label: "Discounted Cumulative Cash Flow @ WACC (Mn LKR)",
            data: cumulativeDiscounted,
            borderColor: "#2563eb",
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: { callback: (val) => val.toFixed(1) + " Mn LKR" },
            grid: {
              color: (context) => (context.tick.value === 0 ? "rgba(71, 85, 105, 0.6)" : "rgba(241, 245, 249, 1)"),
              lineWidth: (context) => (context.tick.value === 0 ? 2 : 1)
            }
          }
        },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }

  /**
   * 6. Scenario Sensitivity Matrix Chart (Conservative vs Base vs Optimistic)
   */
  renderScenarioSensitivityChart(canvasId, scenarios, basePayback, baseIrr) {
    this.destroyChart("scenarioSensitivity");
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = ["Conservative Scenario", "Base Case Scenario", "Optimistic Scenario"];
    const paybacks = [
      scenarios.conservative.paybackYears,
      typeof basePayback === "number" ? basePayback : parseFloat(basePayback) || 5.5,
      scenarios.optimistic.paybackYears
    ];
    const irrs = [
      scenarios.conservative.irrPercent,
      baseIrr || 18.5,
      scenarios.optimistic.irrPercent
    ];

    this.charts.scenarioSensitivity = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Simple Payback Period (Years)",
            data: paybacks,
            backgroundColor: ["#d97706", "#059669", "#10b981"],
            borderRadius: 6,
            yAxisID: "yPayback"
          },
          {
            label: "Project IRR (%)",
            data: irrs,
            type: "line",
            borderColor: "#0284c7",
            backgroundColor: "#0284c7",
            borderWidth: 2.5,
            pointRadius: 5,
            yAxisID: "yIrr"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          yPayback: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Payback (Years)" },
            ticks: { callback: (v) => v + " yrs" },
            grid: { color: "rgba(241, 245, 249, 1)" }
          },
          yIrr: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            title: { display: true, text: "IRR (%)" },
            ticks: { callback: (v) => v + "%" }
          }
        },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }

  /**
   * Update all charts with a unified single call.
   */
  updateAllCharts(result, inputs) {
    const monthlyData = window.voltxEnergyEngine.generateMonthlyProfile(
      result.energyResult.solarCapacityKw,
      inputs.bessCapacityKwh
    );
    const dispatchData = window.voltxEnergyEngine.generate24HourDispatchProfile(
      result.energyResult.solarCapacityKw,
      inputs.bessPowerKw,
      inputs.bessCapacityKwh
    );

    this.renderMonthlyGenChart("chartMonthlyGen", monthlyData);
    this.renderDailyDispatchChart("chartDailyDispatch", dispatchData);
    this.renderRevenueComparisonChart("chartRevenueComp", result);
    this.renderAnnualCashFlowChart("chartAnnualCashFlow", result.annualSchedule);
    this.renderCumulativeCashFlowChart("chartCumulativeCashFlow", result.annualSchedule, result.financialSummary.totalCapex);
    this.renderScenarioSensitivityChart(
      "chartScenarioSensitivity",
      result.scenarios,
      result.financialSummary.simplePaybackYears,
      result.financialSummary.projectIrr
    );
  }
}

// Export singleton to global scope
window.voltxCharts = new VoltxCharts();
