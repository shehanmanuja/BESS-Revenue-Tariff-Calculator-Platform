/**
 * VOLTX BESS Analytics - UI Controller & Interactions Module
 * Handles multi-step wizard, interactive 24-hour simulation slider,
 * modal dialogs, CSV uploads, preset loaders, and reactive updates.
 */

class VoltxUI {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 5;
    this.simulationHour = 12;
    this.simulationInterval = null;
    this.activeScenario = "base";
  }

  init() {
    this.bindNavigation();
    this.bindWizard();
    this.bindSimulationSlider();
    this.bindTariffSandbox();
    this.bindAdminModal();
    this.bindCsvUpload();
    this.bindContactForm();
    this.bindScenarioToggles();
    this.bindPdfButtons();
    this.bindPresetSelector();
    this.bindQuickCapacityButtons();

    // Listen to administrative config changes to recompute
    window.addEventListener("voltx:configChanged", () => {
      this.recalculateAll();
      this.updateTariffSandboxDisplay();
    });
  }

  /**
   * Navigation links smooth scrolling and mobile toggle.
   */
  bindNavigation() {
    document.querySelectorAll("a[href^='#']").forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const targetId = anchor.getAttribute("href");
        if (targetId && targetId !== "#") {
          e.preventDefault();
          const targetElem = document.querySelector(targetId);
          if (targetElem) {
            targetElem.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          // Close mobile menu if open
          document.getElementById("mobileNavMenu")?.classList.add("hidden");
        }
      });
    });

    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileNavMenu = document.getElementById("mobileNavMenu");
    if (mobileMenuBtn && mobileNavMenu) {
      mobileMenuBtn.addEventListener("click", () => {
        mobileNavMenu.classList.toggle("hidden");
      });
    }
  }

  /**
   * Multi-Step Wizard Navigation & Validation.
   */
  bindWizard() {
    const nextBtn = document.getElementById("wizardNextBtn");
    const prevBtn = document.getElementById("wizardPrevBtn");
    const autoSizeBtn = document.getElementById("smartAutoSizeBtn");

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (this.currentStep === this.totalSteps) {
          document.getElementById("downloadPdfBtn")?.click();
          return;
        }
        if (this.validateStep(this.currentStep)) {
          this.goToStep(this.currentStep + 1);
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        this.goToStep(this.currentStep - 1);
      });
    }

    // Step indicators click
    document.querySelectorAll(".step-indicator-item").forEach((item) => {
      item.addEventListener("click", () => {
        const stepNum = parseInt(item.dataset.step, 10);
        if (stepNum < this.currentStep || this.validateStep(this.currentStep)) {
          this.goToStep(stepNum);
        }
      });
    });

    // Auto-Size Button
    if (autoSizeBtn) {
      autoSizeBtn.addEventListener("click", () => {
        this.applySmartSizing();
      });
    }

    // Auto calculate inputs on change
    const autoCalcInputs = [
      "inputSolarCapacity", "selectPlantType", "selectUtility", "inputExistingTariff",
      "inputMonthlyGen", "inputExcessPercent", "inputBessCapacity", "inputBessPower",
      "inputDoD", "inputRTE", "inputDegradation", "inputCustomCapex", "inputDebtShare",
      "inputInterestRate", "inputLoanTenor", "inputDiscountRate"
    ];

    autoCalcInputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => {
          if (id === "inputSolarCapacity") {
            const cap = parseFloat(el.value);
            const monthlyEl = document.getElementById("inputMonthlyGen");
            if (!isNaN(cap) && cap >= 250 && monthlyEl && !monthlyEl.dataset.custom) {
              monthlyEl.value = Math.round(cap * 122);
            }
          } else if (id === "inputMonthlyGen") {
            el.dataset.custom = "true";
          }
          this.recalculateAll();
        });
      }
    });

    // Plant type toggle specific logic
    const plantTypeSelect = document.getElementById("selectPlantType");
    if (plantTypeSelect) {
      plantTypeSelect.addEventListener("change", (e) => {
        const isGround = e.target.value === "ground";
        const alertEl = document.getElementById("groundMountNotice");
        if (alertEl) {
          alertEl.classList.toggle("hidden", !isGround);
        }
        this.recalculateAll();
      });
    }
  }

  /**
   * Validate current wizard step.
   */
  validateStep(step) {
    if (step === 1) {
      const cap = parseFloat(document.getElementById("inputSolarCapacity")?.value);
      const minCap = window.voltxConfigManager.getConfig().technicalDefaults.minSolarCapacity;
      const errorEl = document.getElementById("step1Error");
      if (isNaN(cap) || cap < minCap) {
        if (errorEl) {
          errorEl.textContent = `Plant capacity must be at least ${minCap} kW to be eligible under the PUCSL prosumer BESS framework.`;
          errorEl.classList.remove("hidden");
        }
        return false;
      }
      if (errorEl) errorEl.classList.add("hidden");
      return true;
    }
    return true;
  }

  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;
    this.currentStep = step;

    // Update wizard containers
    for (let i = 1; i <= this.totalSteps; i++) {
      const panel = document.getElementById(`wizardStep${i}`);
      const indicator = document.querySelector(`.step-indicator-item[data-step="${i}"]`);
      if (panel) {
        panel.classList.toggle("hidden", i !== step);
      }
      if (indicator) {
        if (i < step) {
          indicator.classList.add("step-completed");
          indicator.classList.remove("step-active");
        } else if (i === step) {
          indicator.classList.add("step-active");
          indicator.classList.remove("step-completed");
        } else {
          indicator.classList.remove("step-active", "step-completed");
        }
      }
    }

    // Prev / Next button state
    const prevBtn = document.getElementById("wizardPrevBtn");
    const nextBtn = document.getElementById("wizardNextBtn");
    if (prevBtn) prevBtn.disabled = step === 1;
    if (nextBtn) {
      if (step === this.totalSteps) {
        nextBtn.innerHTML = `<span>Generate Full PDF Report</span> <i data-lucide="file-text" class="w-4 h-4 ml-1"></i>`;
      } else {
        nextBtn.innerHTML = `<span>Next Step</span> <i data-lucide="arrow-right" class="w-4 h-4 ml-1"></i>`;
      }
      if (window.lucide) window.lucide.createIcons();
    }

    // Scroll smoothly to calculator top
    const calcSection = document.getElementById("calculator");
    if (calcSection) {
      calcSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    this.recalculateAll();
  }

  /**
   * Apply smart BESS auto-sizing recommendation.
   */
  applySmartSizing() {
    const solarCap = parseFloat(document.getElementById("inputSolarCapacity")?.value) || 500;
    const monthlyGen = parseFloat(document.getElementById("inputMonthlyGen")?.value) || (solarCap * 122);
    const excess = parseFloat(document.getElementById("inputExcessPercent")?.value) || 55;

    const rec = window.voltxEnergyEngine.recommendBessSizing(solarCap, monthlyGen, excess);

    const capInput = document.getElementById("inputBessCapacity");
    const powerInput = document.getElementById("inputBessPower");

    if (capInput) capInput.value = rec.recommendedCapacityKwh;
    if (powerInput) powerInput.value = rec.recommendedPowerKw;

    // Toast notice
    this.showToast(`Auto-sized BESS: ${rec.recommendedCapacityKwh} kWh storage with ${rec.recommendedPowerKw} kW PCS (${rec.cRate}C 4-hour duration)`);
    this.recalculateAll();
  }

  /**
   * Quick buttons to set solar capacity (250kW, 500kW, 1000kW, 2000kW).
   */
  bindQuickCapacityButtons() {
    document.querySelectorAll(".quick-cap-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cap = btn.dataset.capacity;
        const input = document.getElementById("inputSolarCapacity");
        if (input && cap) {
          input.value = cap;
          // Auto update monthly generation estimate
          const monthInput = document.getElementById("inputMonthlyGen");
          if (monthInput) {
            monthInput.value = Math.round(parseFloat(cap) * 122);
          }
          this.recalculateAll();
        }
      });
    });
  }

  /**
   * Preset configurations selector.
   */
  bindPresetSelector() {
    const presetSelect = document.getElementById("presetSelector");
    if (presetSelect) {
      presetSelect.addEventListener("change", (e) => {
        const presetId = e.target.value;
        if (!presetId) return;
        const presets = window.voltxConfigManager.getConfig().presets;
        const chosen = presets.find((p) => p.id === presetId);
        if (chosen) {
          this.loadPreset(chosen);
        }
      });
    }

    document.querySelectorAll(".preset-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".preset-pill-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const presetId = btn.dataset.preset;
        const presets = window.voltxConfigManager.getConfig().presets;
        const chosen = presets.find((p) => p.id === presetId);
        if (chosen) {
          this.loadPreset(chosen);
          const calcSection = document.getElementById("calculator");
          if (calcSection) calcSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  loadPreset(preset) {
    if (document.getElementById("inputSolarCapacity")) document.getElementById("inputSolarCapacity").value = preset.solarCapacityKw;
    if (document.getElementById("selectPlantType")) document.getElementById("selectPlantType").value = preset.plantType;
    if (document.getElementById("selectUtility")) document.getElementById("selectUtility").value = preset.utility;
    if (document.getElementById("inputExistingTariff")) document.getElementById("inputExistingTariff").value = preset.existingTariff;
    if (document.getElementById("inputMonthlyGen")) document.getElementById("inputMonthlyGen").value = preset.monthlyGenKwh;
    if (document.getElementById("inputExcessPercent")) document.getElementById("inputExcessPercent").value = preset.excessSolarPercent;
    if (document.getElementById("inputBessCapacity")) document.getElementById("inputBessCapacity").value = preset.bessCapacityKwh;
    if (document.getElementById("inputBessPower")) document.getElementById("inputBessPower").value = preset.bessPowerKw;
    if (document.getElementById("inputCustomCapex")) document.getElementById("inputCustomCapex").value = preset.totalCapexLkr || "";

    // Toggle ground mount notice if needed
    const alertEl = document.getElementById("groundMountNotice");
    if (alertEl) {
      alertEl.classList.toggle("hidden", preset.plantType !== "ground");
    }

    this.showToast(`Loaded Preset: ${preset.name}`);
    this.goToStep(1);
    this.recalculateAll();
  }

  /**
   * Interactive 24-Hour Energy Flow Simulation (Slider & Play button).
   */
  bindSimulationSlider() {
    const slider = document.getElementById("simHourSlider");
    const playBtn = document.getElementById("simPlayBtn");
    const hourLabel = document.getElementById("simHourLabel");
    const statusLabel = document.getElementById("simStatusLabel");

    if (slider) {
      slider.addEventListener("input", (e) => {
        this.updateSimulationState(parseFloat(e.target.value));
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        if (this.simulationInterval) {
          clearInterval(this.simulationInterval);
          this.simulationInterval = null;
          playBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4 mr-1"></i> Play Simulation`;
        } else {
          playBtn.innerHTML = `<i data-lucide="pause" class="w-4 h-4 mr-1"></i> Pause`;
          this.simulationInterval = setInterval(() => {
            let nextH = (parseFloat(slider.value) + 0.5) % 24;
            slider.value = nextH;
            this.updateSimulationState(nextH);
          }, 350);
        }
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // Quick stage jump buttons
    document.querySelectorAll(".stage-jump-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hr = parseFloat(btn.dataset.hour);
        if (slider) slider.value = hr;
        this.updateSimulationState(hr);
      });
    });

    // Initial update
    this.updateSimulationState(12.0);
  }

  updateSimulationState(hour) {
    const hourLabel = document.getElementById("simHourLabel");
    const statusLabel = document.getElementById("simStatusLabel");
    const solarValEl = document.getElementById("simSolarVal");
    const bessStateEl = document.getElementById("simBessState");
    const gridStateEl = document.getElementById("simGridState");
    const pulseSolarToBess = document.getElementById("pulseSolarToBess");
    const pulseBessToGrid = document.getElementById("pulseBessToGrid");
    const pulseSolarToGrid = document.getElementById("pulseSolarToGrid");

    const wholeH = Math.floor(hour);
    const mins = hour % 1 === 0.5 ? "30" : "00";
    const timeFormatted = `${String(wholeH).padStart(2, "0")}:${mins}`;

    if (hourLabel) hourLabel.textContent = `${timeFormatted} hrs`;

    // Determine energy status
    let statusText = "";
    let solarKw = 0;
    let bessKw = 0; // positive = discharge, negative = charge
    let gridKw = 0;

    // Daytime solar: 6:00 to 18:00
    if (hour >= 6 && hour <= 18) {
      const rad = Math.sin(((hour - 6) / 12) * Math.PI);
      solarKw = Math.round(500 * 0.85 * Math.pow(rad, 1.4));
    }

    if (hour >= 10 && hour <= 14) {
      // Midday BESS Charging
      bessKw = -250;
      gridKw = solarKw - 250;
      statusText = "Midday Peak: BESS Charging from Excess Solar at DC/AC Bus";
      if (pulseSolarToBess) pulseSolarToBess.classList.add("active-pulse");
      if (pulseBessToGrid) pulseBessToGrid.classList.remove("active-pulse");
      if (pulseSolarToGrid) pulseSolarToGrid.classList.add("active-pulse");
    } else if (hour >= 18.5 && hour <= 22.5) {
      // Priority Peak Discharging Window (18:30 - 22:30)
      bessKw = 250;
      gridKw = 250;
      statusText = "PRIORITY PEAK WINDOW (18:30–22:30): Discharging at Premium Priority Tariff!";
      if (pulseSolarToBess) pulseSolarToBess.classList.remove("active-pulse");
      if (pulseBessToGrid) pulseBessToGrid.classList.add("active-pulse");
      if (pulseSolarToGrid) pulseSolarToGrid.classList.remove("active-pulse");
    } else if (hour > 14 && hour < 18.5) {
      // Afternoon standby / direct export
      gridKw = solarKw;
      statusText = "Afternoon: Battery Fully Charged (Standby). Surplus solar exported directly.";
      if (pulseSolarToBess) pulseSolarToBess.classList.remove("active-pulse");
      if (pulseBessToGrid) pulseBessToGrid.classList.remove("active-pulse");
      if (pulseSolarToGrid) pulseSolarToGrid.classList.toggle("active-pulse", solarKw > 20);
    } else {
      // Night standby (22:30 - 06:00)
      statusText = "Night Off-Peak: Battery in standby state, thermal BMS regulation.";
      if (pulseSolarToBess) pulseSolarToBess.classList.remove("active-pulse");
      if (pulseBessToGrid) pulseBessToGrid.classList.remove("active-pulse");
      if (pulseSolarToGrid) pulseSolarToGrid.classList.remove("active-pulse");
    }

    if (statusLabel) statusLabel.textContent = statusText;
    if (solarValEl) solarValEl.textContent = `${solarKw} kW`;
    if (bessStateEl) {
      if (bessKw < 0) {
        bessStateEl.textContent = `CHARGING (${Math.abs(bessKw)} kW)`;
        bessStateEl.className = "text-cyan-700 font-bold";
      } else if (bessKw > 0) {
        bessStateEl.textContent = `DISCHARGING (${bessKw} kW @ PEAK TARIFF)`;
        bessStateEl.className = "text-emerald-700 font-extrabold animate-pulse";
      } else {
        bessStateEl.textContent = "STANDBY (0 kW)";
        bessStateEl.className = "text-slate-500 font-medium";
      }
    }
    if (gridStateEl) {
      gridStateEl.textContent = gridKw > 0 ? `Exporting ${gridKw} kW` : "Zero Grid Feed-in";
      gridStateEl.className = gridKw > 0 ? "text-emerald-700 font-semibold" : "text-slate-500";
    }
  }

  /**
   * Interactive Tariff Sandbox in "Tariff Methodology" Section.
   */
  bindTariffSandbox() {
    const capSlider = document.getElementById("sandboxCapacity");
    const r1Slider = document.getElementById("sandboxR1");

    if (capSlider) {
      capSlider.addEventListener("input", () => this.updateTariffSandboxDisplay());
    }
    if (r1Slider) {
      r1Slider.addEventListener("input", () => this.updateTariffSandboxDisplay());
    }

    this.updateTariffSandboxDisplay();
  }

  updateTariffSandboxDisplay() {
    const capSlider = document.getElementById("sandboxCapacity");
    const r1Slider = document.getElementById("sandboxR1");
    if (!capSlider || !r1Slider) return;

    const cap = parseFloat(capSlider.value) || 500;
    const r1 = parseFloat(r1Slider.value) || 13.45;

    const capLabel = document.getElementById("sandboxCapacityLabel");
    const r1Label = document.getElementById("sandboxR1Label");
    if (capLabel) capLabel.textContent = `${cap.toLocaleString()} kW`;
    if (r1Label) r1Label.textContent = `${r1.toFixed(2)} LKR/kWh`;

    const divisor = window.voltxConfigManager.getConfig().tariffs.efficiencyDivisor || 0.95;
    const isTier1 = cap <= 1000;
    const baseRate = isTier1 ? 33.51 : 30.27;
    const variableAdj = r1 / divisor;
    const priorityTariff = Math.round((baseRate + variableAdj) * 100) / 100;

    const tierBadge = document.getElementById("sandboxTierBadge");
    const baseRateDisplay = document.getElementById("sandboxBaseRate");
    const r1Display = document.getElementById("sandboxR1Display");
    const varAdjDisplay = document.getElementById("sandboxVarAdj");
    const resultDisplay = document.getElementById("sandboxResultTariff");
    const formulaDisplay = document.getElementById("sandboxFormulaText");

    if (tierBadge) {
      tierBadge.textContent = isTier1 ? "Rooftop Tier 1 (250–1,000 kW)" : "Rooftop Tier 2 (> 1,000 kW)";
      tierBadge.className = isTier1 ? "badge-tier1" : "badge-tier2";
    }
    if (baseRateDisplay) baseRateDisplay.textContent = `${baseRate.toFixed(2)} LKR/kWh`;
    if (r1Display) r1Display.textContent = `${r1.toFixed(2)} LKR/kWh`;
    if (varAdjDisplay) varAdjDisplay.textContent = `${variableAdj.toFixed(2)} LKR/kWh`;
    if (resultDisplay) resultDisplay.textContent = `${priorityTariff.toFixed(2)} LKR/kWh`;
    if (formulaDisplay) {
      formulaDisplay.textContent = `Priority Tariff = ${baseRate.toFixed(2)} + (${r1.toFixed(2)} / 0.95) = ${priorityTariff.toFixed(2)} LKR/kWh`;
    }
  }

  /**
   * Admin Tariff Configuration Modal & Controls.
   */
  bindAdminModal() {
    const openBtn = document.getElementById("openAdminModalBtn");
    const closeBtn = document.getElementById("closeAdminModalBtn");
    const modal = document.getElementById("adminConfigModal");
    const form = document.getElementById("adminConfigForm");
    const resetBtn = document.getElementById("adminResetBtn");

    if (openBtn && modal) {
      openBtn.addEventListener("click", () => {
        this.populateAdminFields();
        modal.classList.remove("hidden");
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("Reset all tariff parameters and regulatory benchmarks to official default gazette values?")) {
          window.voltxConfigManager.resetToDefault();
          this.populateAdminFields();
          modal.classList.add("hidden");
          this.showToast("Tariff configuration reset to official PUCSL defaults.");
        }
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const currentCfg = window.voltxConfigManager.getConfig();

        // Update with form values
        currentCfg.tariffs.r1Prime = parseFloat(document.getElementById("adminR1Prime").value) || 13.45;
        currentCfg.tariffs.efficiencyDivisor = parseFloat(document.getElementById("adminDivisor").value) || 0.95;
        currentCfg.tariffs.rooftopTier1.baseRate = parseFloat(document.getElementById("adminTier1Base").value) || 33.51;
        currentCfg.tariffs.rooftopTier2.baseRate = parseFloat(document.getElementById("adminTier2Base").value) || 30.27;
        currentCfg.tariffs.groundMounted.baseAvoidedCostRate = parseFloat(document.getElementById("adminGmBase").value) || 28.50;
        currentCfg.tariffs.groundMounted.peakMultiplier = parseFloat(document.getElementById("adminGmMultiplier").value) || 1.35;
        currentCfg.regulatory.effectiveDate = document.getElementById("adminEffectiveDate").value || currentCfg.regulatory.effectiveDate;
        currentCfg.regulatory.gazetteRef = document.getElementById("adminGazetteRef").value || currentCfg.regulatory.gazetteRef;

        window.voltxConfigManager.saveConfig(currentCfg);
        modal.classList.add("hidden");
        this.showToast("Admin Tariff Configuration saved successfully.");
      });
    }
  }

  populateAdminFields() {
    const cfg = window.voltxConfigManager.getConfig();
    if (document.getElementById("adminR1Prime")) document.getElementById("adminR1Prime").value = cfg.tariffs.r1Prime;
    if (document.getElementById("adminDivisor")) document.getElementById("adminDivisor").value = cfg.tariffs.efficiencyDivisor;
    if (document.getElementById("adminTier1Base")) document.getElementById("adminTier1Base").value = cfg.tariffs.rooftopTier1.baseRate;
    if (document.getElementById("adminTier2Base")) document.getElementById("adminTier2Base").value = cfg.tariffs.rooftopTier2.baseRate;
    if (document.getElementById("adminGmBase")) document.getElementById("adminGmBase").value = cfg.tariffs.groundMounted.baseAvoidedCostRate;
    if (document.getElementById("adminGmMultiplier")) document.getElementById("adminGmMultiplier").value = cfg.tariffs.groundMounted.peakMultiplier;
    if (document.getElementById("adminEffectiveDate")) document.getElementById("adminEffectiveDate").value = cfg.regulatory.effectiveDate;
    if (document.getElementById("adminGazetteRef")) document.getElementById("adminGazetteRef").value = cfg.regulatory.gazetteRef;
  }

  /**
   * CSV Solar Data Upload Parser.
   */
  bindCsvUpload() {
    const fileInput = document.getElementById("solarCsvInput");
    const downloadSampleBtn = document.getElementById("downloadSampleCsvBtn");
    const uploadStatus = document.getElementById("csvUploadStatus");

    if (downloadSampleBtn) {
      downloadSampleBtn.addEventListener("click", () => {
        const sampleContent = window.voltxEnergyEngine.generateSampleCsv();
        const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "VOLTX_Sample_Solar_Generation.csv";
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = window.voltxEnergyEngine.parseSolarCsv(event.target.result);
            const monthInput = document.getElementById("inputMonthlyGen");
            if (monthInput) monthInput.value = parsed.avgMonthlyKwh;

            if (uploadStatus) {
              uploadStatus.textContent = `✓ Uploaded: ${parsed.dataPoints} records parsed. Average monthly generation set to ${parsed.avgMonthlyKwh.toLocaleString()} kWh.`;
              uploadStatus.className = "text-emerald-400 text-xs mt-2";
            }
            this.showToast(`CSV data processed: ${parsed.dataPoints} records loaded.`);
            this.recalculateAll();
          } catch (err) {
            if (uploadStatus) {
              uploadStatus.textContent = `Error: ${err.message}`;
              uploadStatus.className = "text-rose-400 text-xs mt-2";
            }
          }
        };
        reader.readAsText(file);
      });
    }
  }

  /**
   * Contact / Project Enquiry form.
   */
  bindContactForm() {
    const form = document.getElementById("projectEnquiryForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("contactName")?.value || "Client";
      const plantCap = document.getElementById("inputSolarCapacity")?.value || "500";
      const bessCap = document.getElementById("inputBessCapacity")?.value || "1000";

      // Show confirmation dialog / banner
      const successModal = document.getElementById("enquirySuccessModal");
      if (successModal) {
        document.getElementById("modalClientName").textContent = name;
        document.getElementById("modalEnquirySummary").textContent = `${plantCap} kW Solar Plant with ${bessCap} kWh BESS Integration.`;
        successModal.classList.remove("hidden");
      } else {
        alert(`Thank you, ${name}! Your BESS Consultation enquiry for ${plantCap} kW Solar + ${bessCap} kWh BESS has been submitted.`);
      }
    });

    const closeSuccessBtn = document.getElementById("closeEnquirySuccessBtn");
    if (closeSuccessBtn) {
      closeSuccessBtn.addEventListener("click", () => {
        document.getElementById("enquirySuccessModal")?.classList.add("hidden");
      });
    }
  }

  /**
   * Scenario sensitivity toggles (Low / Base / High).
   */
  bindScenarioToggles() {
    document.querySelectorAll(".scenario-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".scenario-toggle-btn").forEach((b) => b.classList.remove("scenario-btn-active"));
        btn.classList.add("scenario-btn-active");
        this.activeScenario = btn.dataset.scenario;
        this.recalculateAll();
      });
    });
  }

  /**
   * PDF Download and Print Handlers.
   */
  bindPdfButtons() {
    const downloadBtn = document.getElementById("downloadPdfBtn");
    const printBtn = document.getElementById("printReportBtn");

    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        const inputs = this.gatherCurrentInputs();
        const result = window.voltxFinancialEngine.evaluateProject(inputs);
        this.showToast("Compiling high-resolution engineering & financial proposal PDF...");
        window.voltxReportGenerator.downloadPdf(result, inputs);
      });
    }

    if (printBtn) {
      printBtn.addEventListener("click", () => {
        const inputs = this.gatherCurrentInputs();
        const result = window.voltxFinancialEngine.evaluateProject(inputs);
        const html = window.voltxReportGenerator.generateReportHtml(result, inputs);
        window.voltxReportGenerator.openPrintWindow(html);
      });
    }
  }

  /**
   * Gather all current form input values into a single object.
   */
  gatherCurrentInputs() {
    const solarCap = parseFloat(document.getElementById("inputSolarCapacity")?.value) || 500;
    const monthlyGen = parseFloat(document.getElementById("inputMonthlyGen")?.value) || (solarCap * 122);

    return {
      plantType: document.getElementById("selectPlantType")?.value || "rooftop",
      solarCapacityKw: solarCap,
      utility: document.getElementById("selectUtility")?.value || "CEB",
      existingTariff: parseFloat(document.getElementById("inputExistingTariff")?.value) || 22.0,
      monthlyGenKwh: monthlyGen,
      excessSolarPercent: parseFloat(document.getElementById("inputExcessPercent")?.value) || 55,
      bessCapacityKwh: parseFloat(document.getElementById("inputBessCapacity")?.value) || 1000,
      bessPowerKw: parseFloat(document.getElementById("inputBessPower")?.value) || 250,
      depthOfDischarge: parseFloat(document.getElementById("inputDoD")?.value) || 90,
      roundTripEfficiency: parseFloat(document.getElementById("inputRTE")?.value) || 88,
      dailyCycles: parseFloat(document.getElementById("inputDailyCycles")?.value) || 1.0,
      annualDegradation: parseFloat(document.getElementById("inputDegradation")?.value) || 1.8,
      totalCapex: parseFloat(document.getElementById("inputCustomCapex")?.value) || null,
      debtShare: parseFloat(document.getElementById("inputDebtShare")?.value) || 70,
      interestRate: parseFloat(document.getElementById("inputInterestRate")?.value) || 11.5,
      loanTenorYears: parseInt(document.getElementById("inputLoanTenor")?.value, 10) || 7,
      discountRate: parseFloat(document.getElementById("inputDiscountRate")?.value) || 12.0
    };
  }

  /**
   * Recalculate full financial & energy models and update UI.
   */
  recalculateAll() {
    const inputs = this.gatherCurrentInputs();
    const result = window.voltxFinancialEngine.evaluateProject(inputs);

    this.renderKpis(result, inputs);
    this.renderTariffMethodology(result.tariffResult);
    this.renderProFormaTable(result.annualSchedule, result.financialSummary.totalCapex);

    // Update charts
    if (window.voltxCharts) {
      window.voltxCharts.updateAllCharts(result, inputs);
    }
  }

  /**
   * Update top KPI metric tiles.
   */
  renderKpis(result, inputs) {
    const f = result.financialSummary;
    const t = result.tariffResult;
    const e = result.energyResult;

    const formatLKR = window.voltxTariffEngine.constructor.formatLKR;
    const formatCompact = window.voltxTariffEngine.constructor.formatLKRCompact;

    // Handle scenarios if non-base is selected
    let displayCapex = f.totalCapex;
    let displayRev = f.yearOneGrossRevenue;
    let displayPayback = f.simplePaybackYears;
    let displayIrr = f.projectIrr;

    if (this.activeScenario === "conservative") {
      displayCapex = result.scenarios.conservative.capex;
      displayRev = result.scenarios.conservative.yearOneRevenue;
      displayPayback = result.scenarios.conservative.paybackYears;
      displayIrr = result.scenarios.conservative.irrPercent;
    } else if (this.activeScenario === "optimistic") {
      displayCapex = result.scenarios.optimistic.capex;
      displayRev = result.scenarios.optimistic.yearOneRevenue;
      displayPayback = result.scenarios.optimistic.paybackYears;
      displayIrr = result.scenarios.optimistic.irrPercent;
    }

    // Set KPI text
    this.setText("kpiPriorityTariff", formatLKR(t.priorityTariff));
    this.setText("kpiOtherTariff", formatLKR(t.otherPeriodTariff));
    this.setText("kpiTariffSpread", `+${formatLKR(t.tariffSpread)} (+${t.spreadPercentage.toFixed(1)}%)`);
    this.setText("kpiBessCapacity", `${inputs.bessCapacityKwh.toLocaleString()} kWh`);
    this.setText("kpiBessPower", `${inputs.bessPowerKw.toLocaleString()} kW (${(inputs.bessPowerKw / inputs.bessCapacityKwh).toFixed(2)}C)`);
    this.setText("kpiAnnualDischarge", `${(e.annualDischargedKwh / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k kWh`);
    this.setText("kpiGrossRevenue", formatCompact(displayRev));
    this.setText("kpiNetCashFlow", formatCompact(f.yearOneNetCashFlow));
    this.setText("kpiTotalCapex", formatCompact(displayCapex));
    this.setText("kpiPayback", typeof displayPayback === "number" ? `${displayPayback} Yrs` : `${displayPayback} Yrs`);
    this.setText("kpiProjectIrr", displayIrr ? `${displayIrr}%` : "N/A");
    this.setText("kpiNpv", formatCompact(f.projectNpv));
    this.setText("kpiRoi", `${f.roiPercent}%`);
    this.setText("kpiCo2Avoided", `${f.annualCo2AvoidedTonnes.toLocaleString()} Tons`);

    // Form pre-fill in contact section
    const contactSolar = document.getElementById("contactSolarCapacity");
    const contactBess = document.getElementById("contactBessCapacity");
    if (contactSolar) contactSolar.value = `${inputs.solarCapacityKw} kW (${inputs.plantType})`;
    if (contactBess) contactBess.value = `${inputs.bessCapacityKwh} kWh / ${inputs.bessPowerKw} kW`;
  }

  /**
   * Update step-by-step tariff methodology display.
   */
  renderTariffMethodology(t) {
    this.setText("tariffMethodCategory", t.category);
    this.setText("tariffMethodFormula", t.formulaString);
    this.setText("tariffMethodDate", t.effectiveDate);
    this.setText("tariffMethodRef", t.regulatoryRef);

    const stepsContainer = document.getElementById("tariffStepsContainer");
    if (stepsContainer && t.steps) {
      stepsContainer.innerHTML = t.steps.map((st) => `
        <div class="method-step-card">
          <div class="font-bold text-slate-900 text-sm mb-1">${st.label}</div>
          <div class="text-xs text-slate-600 mb-2">${st.description}</div>
          ${st.math ? `<div class="font-mono text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200">${st.math}</div>` : ""}
        </div>
      `).join("");
    }
  }

  /**
   * Render 15-Year Financial Pro-Forma Cash Flow Table.
   */
  renderProFormaTable(annualSchedule, totalCapex) {
    const tbody = document.getElementById("proFormaTableBody");
    if (!tbody) return;

    const formatCompact = window.voltxTariffEngine.constructor.formatLKRCompact;

    tbody.innerHTML = annualSchedule.map((row) => `
      <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
        <td class="py-2.5 px-3 font-semibold text-slate-900">Year ${row.year}</td>
        <td class="py-2.5 px-3 text-right text-slate-700">${row.retentionPercent}%</td>
        <td class="py-2.5 px-3 text-right text-slate-700 font-mono">${row.annualDischargeKwh.toLocaleString()}</td>
        <td class="py-2.5 px-3 text-right text-emerald-700 font-semibold font-mono">${formatCompact(row.incrementalGrossRevenue)}</td>
        <td class="py-2.5 px-3 text-right text-rose-600 font-mono">${formatCompact(row.omCost)}</td>
        <td class="py-2.5 px-3 text-right text-slate-600 font-mono">${formatCompact(row.debtPayment)}</td>
        <td class="py-2.5 px-3 text-right text-emerald-800 font-bold font-mono">${formatCompact(row.projectFreeCashFlow)}</td>
        <td class="py-2.5 px-3 text-right font-bold font-mono ${row.cumulativeNetCashFlow >= totalCapex ? 'text-emerald-700 font-extrabold' : 'text-slate-600'}">
          ${formatCompact(row.cumulativeNetCashFlow - totalCapex)}
        </td>
      </tr>
    `).join("");
  }

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  showToast(message) {
    const existing = document.getElementById("voltx-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "voltx-toast";
    toast.className = "voltx-toast-banner";
    toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 mr-2 text-emerald-600"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }
}

// Export singleton to global scope
window.voltxUI = new VoltxUI();
