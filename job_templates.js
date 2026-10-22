// ==========================================
// JOBBMALLAR, MÅTTPILAR & PLOGKARTA v3.0
// ==========================================

const JOB_TEMPLATES = {
  SNOROJNING_SANDNING: {
    id: "SNOROJNING_SANDNING",
    name: "Snöröjning & Sandspridning",
    requiresEgenkontroll: false,
    passiveGPS: true,
    hasMapDrawing: true,
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 4v4m-2-2h4m-3.5-1.5l3 3m-3 0l3-3"/><path d="M12 16v-6h-4l-2-4h-4v10"/><circle cx="5" cy="16" r="2"/><circle cx="12" cy="16" r="2"/><path d="M16 19l2-8" stroke-width="2"/><path d="M17 17h4"/></svg>`
  },
  PLATSBESOK: {
    id: "PLATSBESOK",
    name: "Platsbesök & Uppmätning",
    requiresEgenkontroll: false,
    passiveGPS: true,
    hasPhotoArrows: true,
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M2 12l4-4M2 12l4 4M22 12l-4-4M22 12l4 4"/><rect x="8" y="5" width="8" height="14" rx="2"/><path d="M12 8v8"/></svg>`
  },
  FASAD_LINJEMALNING: {
    id: "FASAD_LINJEMALNING",
    name: "Fasad- & Linjemålning",
    requiresEgenkontroll: true,
    passiveGPS: true,
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12h14"/><rect x="7" y="3" width="10" height="5" rx="1"/></svg>`
  },
  MARK_GRAV: {
    id: "MARK_GRAV",
    name: "Mark & Bandgrävare",
    requiresEgenkontroll: false,
    passiveGPS: true,
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="15" width="13" height="5" rx="2.5"/><circle cx="5.5" cy="17.5" r="1"/><circle cx="9.5" cy="17.5" r="1"/><circle cx="13.5" cy="17.5" r="1"/><path d="M5 15v-5a2 2 0 0 1 2-2h4v7M9 11l4-5 6 4-2 4M17 14h4l1-3-3-2"/></svg>`
  },
  STALLTVATT_HOGTRYCK: {
    id: "STALLTVATT_HOGTRYCK",
    name: "Stalltvätt & Högtryck",
    requiresEgenkontroll: false,
    passiveGPS: true,
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c-1-1-1-3 0-4l3-3 4 4-3 3c-1 1-3 1-4 0z"/><path d="M10 14l5-5M14 8l2-2M17 7l4-4M19 9l3-2M15 5l2-3"/><path d="M21 14l-1 2-2 1-2 1-1 2" stroke-width="1"/></svg>`
  }
};

class SnowMapDrawer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.currentTool = 'machine';
    this.isDrawing = false;
    this.initEvents();
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  initEvents() {
    const start = (e) => { this.isDrawing = true; this.draw(e); };
    const stop = () => { this.isDrawing = false; this.ctx.beginPath(); };
    const move = (e) => { if (this.isDrawing) this.draw(e); };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mouseup', stop);
    this.canvas.addEventListener('mousemove', move);

    this.canvas.addEventListener('touchstart', (e) => { start(e.touches[0]); e.preventDefault(); });
    this.canvas.addEventListener('touchend', stop);
    this.canvas.addEventListener('touchmove', (e) => { move(e.touches[0]); e.preventDefault(); });
  }

  draw(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.ctx.lineWidth = this.currentTool === 'warning' ? 6 : 14;
    this.ctx.lineCap = 'round';

    if (this.currentTool === 'machine') {
      this.ctx.strokeStyle = 'rgba(10, 132, 255, 0.7)'; // Blå Maskinplog
    } else if (this.currentTool === 'hand') {
      this.ctx.strokeStyle = 'rgba(255, 159, 10, 0.8)'; // Orange Handskottning
    } else if (this.currentTool === 'warning') {
      this.ctx.strokeStyle = 'rgba(255, 69, 58, 0.95)'; // Rött Hinder
    }

    if (this.currentTool === 'warning') {
      this.ctx.fillStyle = 'rgba(255, 69, 58, 0.95)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 9, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    }
  }

  clearMap() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  exportImage() {
    return this.canvas.toDataURL('image/png');
  }
}

window.JOB_TEMPLATES = JOB_TEMPLATES;
window.SnowMapDrawer = SnowMapDrawer;
