/**
 * VOLTX BESS Analytics - Main Application Entrypoint
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Initialize UI controller
  if (window.voltxUI) {
    window.voltxUI.init();
    // Run initial calculation with default inputs
    window.voltxUI.recalculateAll();
  }

  // Re-run icons creation on any dynamic injection
  setTimeout(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, 150);

  console.log("⚡ VOLTX BESS Revenue & Tariff Intelligence Platform Initialized Successfully.");
});

