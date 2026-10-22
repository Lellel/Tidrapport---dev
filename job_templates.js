// ==========================================
// JOBBMALLAR & ZONRITARE v3.0
// ==========================================

const JOB_TEMPLATES = {
  SNOROJNING_SANDNING: {
    id: "SNOROJNING_SANDNING",
    name: "Snöröjning & Sandspridning",
    requiresEgenkontroll: false,
    passiveGPS: true,
    hasMapDrawing: true,
    icon: "snow"
  },
  PLATSBESOK: {
    id: "PLATSBESOK",
    name: "Platsbesök & Uppmätning",
    requiresEgenkontroll: false,
    passiveGPS: true,
    hasPhotoArrows: true,
    icon: "ruler"
  },
  FASAD_LINJEMALNING: {
    id: "FASAD_LINJEMALNING",
    name: "Fasad- & Linjemålning",
    requiresEgenkontroll: true,
    passiveGPS: true,
    icon: "paint"
  },
  MARK_GRAV: {
    id: "MARK_GRAV",
    name: "Mark & Bandgrävare",
    requiresEgenkontroll: false,
    passiveGPS: true,
    icon: "excavator"
  },
  STALLTVATT_HOGTRYCK: {
    id: "STALLTVATT_HOGTRYCK",
    name: "Stalltvätt & Högtryck",
    requiresEgenkontroll: false,
    passiveGPS: true,
    icon: "wash"
  }
};

// ==========================================
// KANVAS-RITARE FÖR PLOGZONER
// ==========================================
class SnowMapDrawer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.currentTool = 'machine'; // 'machine' (blue), 'hand' (orange), 'warning' (red)
    this.isDrawing = false;
    this.initEvents();
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  initEvents() {
    const start = (e) => {
      this.isDrawing = true;
      this.draw(e);
    };
    const stop = () => {
      this.isDrawing = false;
      this.ctx.beginPath();
    };
    const move = (e) => {
      if (!this.isDrawing) return;
      this.draw(e);
    };

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

    this.ctx.lineWidth = this.currentTool === 'warning' ? 8 : 16;
    this.ctx.lineCap = 'round';

    if (this.currentTool === 'machine') {
      this.ctx.strokeStyle = 'rgba(10, 132, 255, 0.6)'; // Blå genomskinlig för Plog
    } else if (this.currentTool === 'hand') {
      this.ctx.strokeStyle = 'rgba(255, 159, 10, 0.7)'; // Orange för Handskottning
    } else if (this.currentTool === 'warning') {
      this.ctx.strokeStyle = 'rgba(255, 69, 58, 0.9)'; // Röd för Hinder
    }

    if (this.currentTool === 'warning') {
      // Rita varningstriangel/punkt
      this.ctx.fillStyle = 'rgba(255, 69, 58, 0.9)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 10, 0, Math.PI * 2);
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
console.log("Jobbmallar & Plogkarta laddade i DEV!");
