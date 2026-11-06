/**
 * EXIMIUS POWER AND ENERGY - Interactive Mouse Cursor & Energy Trail System
 * Provides an ultra-sleek, responsive interactive cursor follower with smooth physics
 * and an ambient renewable-energy particle spark trail.
 */

(function () {
  'use strict';

  // Only activate on devices with fine pointer (mouse / trackpad)
  if (!window.matchMedia('(pointer: fine)').matches) {
    return;
  }

  // Create DOM Elements
  const canvas = document.createElement('canvas');
  canvas.id = 'cursorEnergyCanvas';
  canvas.className = 'cursor-energy-canvas';
  document.body.appendChild(canvas);

  const ring = document.createElement('div');
  ring.id = 'cursorRing';
  ring.className = 'custom-cursor-ring';
  document.body.appendChild(ring);

  const dot = document.createElement('div');
  dot.id = 'cursorDot';
  dot.className = 'custom-cursor-dot';
  document.body.appendChild(dot);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Coordinates
  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  let isHovered = false;
  let isClicked = false;
  let isVisible = false;

  // Particle pool for performance
  const particles = [];
  const maxParticles = 60;

  // Energy Green Palette: Dark Green, Rich Emerald, Vibrant Mint
  const energyColors = [
    'rgba(4, 92, 62, ',    // Dark Green (#045c3e)
    'rgba(5, 150, 105, ',  // Emerald (#059669)
    'rgba(16, 185, 129, ', // Energy Green (#10b981)
    'rgba(52, 211, 153, '  // Mint Sparkle (#34d399)
  ];

  class EnergyParticle {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.size = Math.random() * 3.2 + 1.6;
      this.baseSize = this.size;
      this.life = 1.0;
      this.decay = Math.random() * 0.035 + 0.025;
      this.colorBase = energyColors[Math.floor(Math.random() * energyColors.length)];
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.95;
      this.vy *= 0.95;
      this.life -= this.decay;
      this.size = this.baseSize * Math.max(this.life, 0);
    }

    draw(ctx) {
      if (this.life <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(this.size, 0.4), 0, Math.PI * 2);
      ctx.fillStyle = this.colorBase + (this.life * 0.8) + ')';
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.colorBase + '0.6)';
      ctx.fill();
      ctx.restore();
    }
  }

  function addParticle(x, y, count = 1) {
    if (particles.length >= maxParticles) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.6 + 0.4;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particles.push(new EnergyParticle(x, y, vx, vy));
    }
  }

  // Mouse Move Event Listener
  let prevX = -100;
  let prevY = -100;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      ringX = mouseX;
      ringY = mouseY;
      ring.style.opacity = '1';
      dot.style.opacity = '1';
    }

    // Direct dot positioning (instant)
    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

    // Spawn energy particles based on cursor motion distance
    const dist = Math.hypot(mouseX - prevX, mouseY - prevY);
    if (dist > 3) {
      const count = Math.min(Math.floor(dist / 8) + 1, 3);
      addParticle(mouseX, mouseY, count);
      prevX = mouseX;
      prevY = mouseY;
    }
  }, { passive: true });

  window.addEventListener('mousedown', () => {
    isClicked = true;
    ring.classList.add('cursor-clicked');
    addParticle(mouseX, mouseY, 6);
  });

  window.addEventListener('mouseup', () => {
    isClicked = false;
    ring.classList.remove('cursor-clicked');
  });

  document.addEventListener('mouseleave', () => {
    isVisible = false;
    ring.style.opacity = '0';
    dot.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    isVisible = true;
    ring.style.opacity = '1';
    dot.style.opacity = '1';
  });

  // Track hover on interactive elements
  const interactiveSelectors = 'a, button, .btn, input, select, textarea, .preset-pill-btn, .step-indicator-item, .kpi-card, .chart-card, [role="button"], label, .stat-item, .how-it-works-card';

  document.addEventListener('mouseover', (e) => {
    if (e.target && e.target.closest && e.target.closest(interactiveSelectors)) {
      isHovered = true;
      ring.classList.add('cursor-hover');
    }
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    if (e.target && e.target.closest && e.target.closest(interactiveSelectors)) {
      isHovered = false;
      ring.classList.remove('cursor-hover');
    }
  }, { passive: true });

  // Animation Loop (60 FPS / 120 FPS hardware accelerated)
  function animate() {
    // Smooth Ring Follower Physics (Lerp easing)
    if (isVisible) {
      const ease = isHovered ? 0.22 : 0.16;
      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    }

    // Clear Canvas and Draw Energy Particle Sparks
    ctx.clearRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);

      // Connect nearby particles with subtle energy threads
      for (let j = i - 1; j >= 0; j--) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const d = Math.hypot(dx, dy);
        if (d < 36) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(16, 185, 129, ${p.life * 0.18})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();

