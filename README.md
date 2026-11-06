# EXIMIUS POWER AND ENERGY — BESS Revenue & Tariff Calculator Platform

A commercial-grade techno-economic modeling and financial intelligence platform for integrating **Battery Energy Storage Systems (BESS)** into existing **Commercial & Industrial (C&I) Solar PV Power Plants (&ge; 250 kW)** in Sri Lanka.

Engineered by **EXIMIUS POWER AND ENERGY** in pure **HTML5, CSS3, and JavaScript (ES6+)** with zero Node.js or backend runtime dependencies.

---

## ⚡ Key Highlights & Architecture

1. **Company Branding & Typography**
   - Brand Identity: **EXIMIUS POWER AND ENERGY**
   - Typography: **Poppins** (clean, modern geometric font) with **JetBrains Mono** for numerical accuracy and financial metrics.
   - Design Aesthetic: Pristine White & Energy Emerald (`#059669` / `#10b981`), spacious layout, non-wrapping navigation bar, and creative benchmark presets strip.

2. **Approved PUCSL & CEB/LECO Prosumer Tariff Engine**
   - **Rooftop Solar Prosumer Tier 1 (250 kW – 1,000 kW)**:
     $$\text{Priority Tariff} = 33.51 + \frac{R_1'}{0.95}$$
   - **Rooftop Solar Prosumer Tier 2 (> 1,000 kW)**:
     $$\text{Priority Tariff} = 30.27 + \frac{R_1'}{0.95}$$
   - **Other-Period Tariff**: Standard SPPA Feed-in tariff (e.g. 22.00 LKR/kWh or custom rate).
   - **Ground-Mounted Solar Distinction**: Operates under CEB avoided-cost utility dispatch schedules.
   - **Admin Tariff Configuration Modal**: Live administrative modification of $R_1'$ variable cost factor, base rates, formula divisors, and regulatory gazette dates with `localStorage` persistence.

3. **Multi-Step Financial Calculator (5 Steps)**
   - **Step 1: Existing Solar Plant Details** (Capacity with &ge; 250 kW validation, utility CEB/LECO, plant type, tariff).
   - **Step 2: Generation & Export Dynamics** (Monthly yield, excess solar percentage, CSV generation parser & sample CSV generator).
   - **Step 3: Proposed BESS Configuration** (Smart Auto-Sizing recommendation for 4-hour evening peak, C-rate, DoD %, RTE %, degradation).
   - **Step 4: Project Financials & Capex** (Turnkey Capex breakdown, debt/equity split, interest rate, tenor, WACC).
   - **Step 5: Dynamic Intelligence Dashboard** (Real-time recalculations upon any change).

4. **6 High-Resolution Light Mode Interactive Charts (Chart.js)**
   - Monthly Energy Generation & Shifted Storage (kWh)
   - Daily 24-Hour Battery Dispatch Profile (Midday charge vs 18:30–22:30 priority discharge)
   - Priority vs Other-Period Revenue Uplift (Baseline vs Solar + BESS)
   - 15-Year Annual Revenue & O&M Cash Flow Projection
   - 15-Year Cumulative Cash Flow & Break-Even Recovery Curve
   - Scenario Sensitivity Matrix (Conservative vs Base vs Optimistic)

5. **Executive Bankable PDF Proposal Generator**
   - Direct one-click compilation using `html2pdf.js` with printable fallback.
   - Branded for **EXIMIUS POWER AND ENERGY** with technical parameters, official equations, 10-year pro-forma, and carbon decarbonization metrics.

---

## 🚀 How to Run the Platform

Simply open [`index.html`](file:///e:/AI%20Systems/BESS%20Revenue%20&%20Tariff%20Calculator%20Platform/index.html) in any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari). No installation, build steps, or servers required.
