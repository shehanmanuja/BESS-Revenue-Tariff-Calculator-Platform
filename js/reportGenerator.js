/**
 * VOLTX BESS Analytics - PDF Proposal & Report Generator
 * Generates an executive bankable engineering & investment report in PDF format.
 */

class ReportGenerator {
  constructor() {
    this.isGenerating = false;
  }

  /**
   * Build the complete HTML report markup.
   */
  generateReportHtml(result, inputs) {
    const p = inputs;
    const f = result.financialSummary;
    const t = result.tariffResult;
    const e = result.energyResult;
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const proposalId = "VLTX-" + Math.floor(100000 + Math.random() * 900000);

    const formatLKR = window.voltxTariffEngine.constructor.formatLKR;
    const formatCompact = window.voltxTariffEngine.constructor.formatLKRCompact;

    // 15-year table rows
    const tableRows = result.annualSchedule.slice(0, 10).map((row) => `
      <tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Yr ${row.year}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${row.retentionPercent}%</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${row.annualDischargeKwh.toLocaleString()}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #047857; font-weight: 600;">${formatCompact(row.incrementalGrossRevenue)}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #b91c1c;">${formatCompact(row.omCost)}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">${formatCompact(row.projectFreeCashFlow)}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: ${row.cumulativeNetCashFlow >= f.totalCapex ? '#047857' : '#475569'};">
          ${formatCompact(row.cumulativeNetCashFlow - f.totalCapex)}
        </td>
      </tr>
    `).join("");

    return `
      <div id="pdf-report-document" style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a; background: #ffffff; padding: 36px 44px; max-width: 900px; margin: 0 auto; line-height: 1.5; font-size: 13px;">
        
        <!-- Header & Branding -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 24px;">
          <div>
            <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a;">
              EXIMIUS <span style="color: #059669;">POWER AND ENERGY</span>
            </div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
              Bankable BESS Integration & Revenue Feasibility Report
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div><strong>Proposal ID:</strong> ${proposalId}</div>
            <div><strong>Date:</strong> ${dateStr}</div>
            <div><strong>Regulatory Base:</strong> PUCSL / CEB Guidelines</div>
          </div>
        </div>

        <!-- Project Executive Summary Cards -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            1. Executive Project Summary
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
            <div style="background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Solar Capacity</div>
              <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${Number(p.solarCapacityKw).toLocaleString()} kW</div>
              <div style="font-size: 10px; color: #10b981;">${p.plantType === 'rooftop' ? 'C&I Rooftop' : 'Ground-Mounted'}</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">BESS Configuration</div>
              <div style="font-size: 18px; font-weight: 800; color: #10b981;">${Number(p.bessCapacityKwh).toLocaleString()} kWh</div>
              <div style="font-size: 10px; color: #64748b;">${Number(p.bessPowerKw).toLocaleString()} kW PCS (4h peak)</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Applicable Peak Tariff</div>
              <div style="font-size: 18px; font-weight: 800; color: #047857;">${formatLKR(t.priorityTariff)}</div>
              <div style="font-size: 10px; color: #64748b;">Spread: +${formatLKR(t.tariffSpread)}</div>
            </div>
            <div style="background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Estimated Payback</div>
              <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${f.simplePaybackYears} Years</div>
              <div style="font-size: 10px; color: #10b981;">IRR: ${f.projectIrr ? f.projectIrr + '%' : 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Section 2: Technical Specifications & Tariff Structure -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
          <!-- Plant Details -->
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              2. Technical & Operating Parameters
            </div>
            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
              <tr><td style="padding: 4px 0; color: #64748b;">Existing Utility Provider:</td><td style="text-align: right; font-weight: 600;">${p.utility}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Existing Solar Tariff:</td><td style="text-align: right; font-weight: 600;">${formatLKR(p.existingTariff)}/kWh</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Annual Solar Generation:</td><td style="text-align: right; font-weight: 600;">${e.annualSolarGenKwh.toLocaleString()} kWh</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Daily BESS Discharge Energy:</td><td style="text-align: right; font-weight: 600;">${e.actualDailyDischargedKwh.toLocaleString()} kWh/day</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Year 1 Discharged Energy:</td><td style="text-align: right; font-weight: 600;">${e.annualDischargedKwh.toLocaleString()} kWh/yr</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Round-Trip Efficiency (AC-AC):</td><td style="text-align: right; font-weight: 600;">${e.rtePercent}%</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Depth of Discharge (DoD):</td><td style="text-align: right; font-weight: 600;">${e.dodPercent}%</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Annual Cell Degradation:</td><td style="text-align: right; font-weight: 600;">${p.annualDegradation || 1.8}% / yr</td></tr>
            </table>
          </div>

          <!-- Tariff Methodology -->
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              3. Regulatory Tariff Methodology
            </div>
            <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 11px; margin-bottom: 8px; color: #0f172a;">
              ${t.formulaString}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              <strong>Category:</strong> ${t.category}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              <strong>Applied R1' Variable Fuel Factor:</strong> ${t.r1Prime ? t.r1Prime.toFixed(2) + ' LKR/kWh' : 'N/A'}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              <strong>Standardized RTE Divisor:</strong> ${t.divisor ? t.divisor.toFixed(2) : 'N/A'}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              <strong>Priority Peak Window:</strong> 18:30 – 22:30 (4 Hours)
            </div>
            <div style="font-size: 10px; color: #64748b; font-style: italic;">
              ${t.notes}
            </div>
          </div>
        </div>

        <!-- Section 4: Capital Expenditure & Financial Returns -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            4. Turnkey Capital Expenditure & Returns Matrix
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px;">
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #64748b;">Total Turnkey Capex</div>
              <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${formatLKR(f.totalCapex)}</div>
              <div style="font-size: 10px; color: #64748b;">BESS + PCS + Civil & BOP</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #64748b;">Year 1 Net Project Cash Flow</div>
              <div style="font-size: 16px; font-weight: 800; color: #047857;">${formatLKR(f.yearOneNetCashFlow)}</div>
              <div style="font-size: 10px; color: #64748b;">Gross Rev: ${formatCompact(f.yearOneGrossRevenue)}</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #64748b;">15-Year Project NPV (@ ${f.discountRatePercent}%)</div>
              <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${formatCompact(f.projectNpv)}</div>
              <div style="font-size: 10px; color: #047857;">15-Yr ROI: ${f.roiPercent}%</div>
            </div>
          </div>
        </div>

        <!-- Section 5: 10-Year Pro-Forma Cash Flow Table -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            5. Pro-Forma Cash Flow Schedule (10-Year Outlook)
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569;">
                <th style="padding: 8px 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Period</th>
                <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Capacity</th>
                <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Discharge (kWh)</th>
                <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">BESS Gross Rev</th>
                <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">O&M Cost</th>
                <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Net Cash Flow</th>
                <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Cumulative Balance</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <!-- Section 6: Environmental & Decarbonization Benefits -->
        <div style="display: flex; gap: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; text-transform: uppercase; color: #065f46; font-weight: 700;">Annual CO2 Emissions Offset</div>
            <div style="font-size: 20px; font-weight: 800; color: #047857;">${f.annualCo2AvoidedTonnes.toLocaleString()} Metric Tons</div>
            <div style="font-size: 10px; color: #065f46;">Displacing heavy thermal peaker generation during 18:30 - 22:30 system peak.</div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 11px; text-transform: uppercase; color: #065f46; font-weight: 700;">Lifetime 15-Yr Decarbonization</div>
            <div style="font-size: 20px; font-weight: 800; color: #047857;">${f.lifetimeCo2AvoidedTonnes.toLocaleString()} Metric Tons CO2e</div>
            <div style="font-size: 10px; color: #065f46;">Directly supports Sri Lanka National Carbon Neutrality & 70% RE 2030 targets.</div>
          </div>
        </div>

        <!-- Section 7: Assumptions and Regulatory Disclaimer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 9.5px; color: #64748b; line-height: 1.4;">
          <strong>ASSUMPTIONS & REGULATORY NOTICE:</strong> This proposal is generated for financial and techno-economic evaluation based on PUCSL gazetted prosumer BESS guidelines and CEB / LECO technical connection codes. Actual financial realization depends on final utility interconnection approval, grid impact assessment (GIA), time-of-use metering installation, and prevailing fuel cost index (R1') adjustments at the time of commissioning. Battery degradation is modeled based on manufacturer tier-1 LFP cell test standards at 25°C ambient with active HVAC thermal regulation.
        </div>
      </div>
    `;
  }

  /**
   * Trigger PDF download using html2pdf if available, or print dialog fallback.
   */
  downloadPdf(result, inputs) {
    const reportHtml = this.generateReportHtml(result, inputs);

    // Create a temporary container
    const container = document.createElement("div");
    container.id = "temp-pdf-export-container";
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "850px";
    container.innerHTML = reportHtml;
    document.body.appendChild(container);

    const filename = `EXIMIUS_BESS_Feasibility_${inputs.solarCapacityKw}kW_${inputs.plantType}_${Date.now()}.pdf`;

    if (typeof html2pdf !== "undefined") {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };

      html2pdf()
        .set(opt)
        .from(container.firstElementChild)
        .save()
        .then(() => {
          document.body.removeChild(container);
        })
        .catch((err) => {
          console.error("PDF generation failed, opening print window fallback", err);
          document.body.removeChild(container);
          this.openPrintWindow(reportHtml);
        });
    } else {
      document.body.removeChild(container);
      this.openPrintWindow(reportHtml);
    }
  }

  /**
   * Browser print fallback with clean printable styling.
   */
  openPrintWindow(reportHtml) {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VOLTX BESS Feasibility Proposal</title>
          <style>
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${reportHtml}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

// Export singleton to global scope
window.voltxReportGenerator = new ReportGenerator();

