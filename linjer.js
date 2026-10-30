// ==========================================
// LINJEMÅLNING – ritar p-rutor på karta. Delas av offerter.html (admin placerar)
// och kundsidan i app.js (kunden ser ritningen). Kräver Leaflet.
//
// En sektion = en rad rutor bredvid varandra. Ankaret är främre vänstra hörnet,
// rotation i grader medurs från norr = riktningen raden löper åt.
// Rutor delar sidolinje: n rutor ger n+1 sidolinjer (+ bakkant om vald).
// "Dubbel" = en rad till rygg mot rygg bakom den första.
// ==========================================

const LINE_COLORS = ['#f59e0b', '#38bdf8', '#10b981', '#f43f5e', '#a78bfa', '#facc15'];

// Lokala meter (x längs raden, y in i rutan) -> [lat, lng]
function lineOffset(anchor, rotationDeg, x, y) {
  const r = rotationDeg * Math.PI / 180;
  // x pekar i radens riktning, y 90° medurs från den (in i rutorna)
  const east = x * Math.sin(r) + y * Math.sin(r + Math.PI / 2);
  const north = x * Math.cos(r) + y * Math.cos(r + Math.PI / 2);
  const lat = anchor[0] + north / 111320;
  const lng = anchor[1] + east / (111320 * Math.cos(anchor[0] * Math.PI / 180));
  return [lat, lng];
}

// Alla linjesegment för en sektion: [[[lat,lng],[lat,lng]], ...]
function sectionSegments(sec) {
  if (!Array.isArray(sec.anchor)) return [];
  const n = Math.max(0, Math.min(200, Number(sec.count) || 0));
  const w = Number(sec.width) || 2.5, d = Number(sec.depth) || 5;
  const rot = Number(sec.rotation) || 0;
  const rows = sec.double ? 2 : 1;
  const segs = [];
  for (let row = 0; row < rows; row++) {
    const y0 = row * d, y1 = y0 + d;
    for (let i = 0; i <= n; i++) segs.push([lineOffset(sec.anchor, rot, i * w, y0), lineOffset(sec.anchor, rot, i * w, y1)]);
    // Bakkant längst in i varje rad
    if (sec.back) segs.push([lineOffset(sec.anchor, rot, 0, y1), lineOffset(sec.anchor, rot, n * w, y1)]);
  }
  return segs;
}

// Ritar hela layouten. Returnerar en Leaflet-grupp (för fitBounds/borttag).
function drawLineLayout(map, layout, options = {}) {
  const group = L.featureGroup();
  (layout && layout.sections || []).forEach((sec, idx) => {
    if (!Array.isArray(sec.anchor)) return;
    const color = LINE_COLORS[idx % LINE_COLORS.length];
    sectionSegments(sec).forEach(seg => L.polyline(seg, { color, weight: options.weight || 4, opacity: 0.95, interactive: false }).addTo(group));
    // Etikett mitt i sektionen
    const n = Number(sec.count) || 0;
    const center = lineOffset(sec.anchor, Number(sec.rotation) || 0, n * (Number(sec.width) || 2.5) / 2, (Number(sec.depth) || 5) * (sec.double ? 1 : 0.5));
    const letter = String.fromCharCode(65 + idx);
    L.marker(center, { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0],
      html: `<div style="transform:translate(-50%,-50%);background:${color};color:#0b1220;font:800 12px sans-serif;padding:2px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.5);">${letter} · ${n * (sec.double ? 2 : 1)} st</div>` }) }).addTo(group);
  });
  return group.addTo(map);
}

function layoutHasPlacedSections(layout) {
  return !!(layout && Array.isArray(layout.sections) && layout.sections.some(s => Array.isArray(s.anchor)));
}

// ==========================================
// RITNING TILL PDF – skalenlig bild (PNG) utan kartbakgrund:
// rutnät, p-rutor, mått per sektion, norrpil, skalstock och summering.
// Ritas på canvas i webbläsaren och skickas med när offerten skickas.
// ==========================================
function layoutToMeters(layout) {
  const placed = (layout && layout.sections || []).filter(sec => Array.isArray(sec.anchor));
  if (!placed.length) return null;
  const lat0 = placed[0].anchor[0], lng0 = placed[0].anchor[1];
  const k = 111320, kLng = 111320 * Math.cos(lat0 * Math.PI / 180);
  const toM = (p) => [(p[1] - lng0) * kLng, (p[0] - lat0) * k]; // [öst, norr] i meter
  return (layout.sections || []).map((sec, idx) => {
    if (!Array.isArray(sec.anchor)) return null;
    const n = Number(sec.count) || 0, w = Number(sec.width) || 2.5, d = Number(sec.depth) || 5;
    return {
      idx, sec, n, w, d,
      segments: sectionSegments(sec).map(seg => seg.map(toM)),
      label: toM(lineOffset(sec.anchor, Number(sec.rotation) || 0, n * w / 2, d * (sec.double ? 1 : 0.5)))
    };
  }).filter(Boolean);
}

function renderLayoutPng(layout, opts = {}) {
  const parts = layoutToMeters(layout);
  if (!parts || !parts.length) return '';
  const W = opts.width || 1200, H = opts.height || 760;
  const legendH = 76 + Math.ceil(parts.length / 2) * 22, pad = 60;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

  // Skala så att allt får plats
  const pts = parts.flatMap(p => p.segments.flat()).concat(parts.map(p => p.label));
  const minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
  const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
  const spanX = Math.max(5, maxX - minX), spanY = Math.max(5, maxY - minY);
  const drawW = W - pad * 2, drawH = H - legendH - pad * 2;
  const scale = Math.min(drawW / spanX, drawH / spanY); // pixlar per meter
  const offX = pad + (drawW - spanX * scale) / 2, offY = pad + (drawH - spanY * scale) / 2;
  const px = (p) => [offX + (p[0] - minX) * scale, offY + (maxY - p[1]) * scale]; // norr uppåt

  // Rutnät var 5:e meter
  const gridStep = scale > 20 ? 5 : scale > 6 ? 10 : 25;
  ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;
  for (let gx = Math.floor(minX / gridStep) * gridStep; gx <= maxX + gridStep; gx += gridStep) {
    const [x] = px([gx, 0]); ctx.beginPath(); ctx.moveTo(x, pad / 2); ctx.lineTo(x, H - legendH); ctx.stroke();
  }
  for (let gy = Math.floor(minY / gridStep) * gridStep; gy <= maxY + gridStep; gy += gridStep) {
    const [, y] = px([0, gy]); ctx.beginPath(); ctx.moveTo(pad / 2, y); ctx.lineTo(W - pad / 2, y); ctx.stroke();
  }

  // Linjerna
  const darker = ['#d97706', '#0284c7', '#059669', '#e11d48', '#7c3aed', '#ca8a04'];
  ctx.lineCap = 'round';
  parts.forEach(p => {
    ctx.strokeStyle = darker[p.idx % darker.length];
    ctx.lineWidth = Math.max(2, Math.min(6, scale * 0.15));
    p.segments.forEach(([a, b]) => { const A = px(a), B = px(b); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); });
  });
  // Etiketter
  ctx.font = 'bold 18px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  parts.forEach(p => {
    const [x, y] = px(p.label);
    const text = `${String.fromCharCode(65 + p.idx)} · ${p.n * (p.sec.double ? 2 : 1)} st`;
    const tw = ctx.measureText(text).width + 18;
    ctx.fillStyle = darker[p.idx % darker.length];
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - tw / 2, y - 14, tw, 28, 14) : ctx.rect(x - tw / 2, y - 14, tw, 28); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, x, y + 1);
  });

  // Norrpil
  const nx = W - pad, ny = pad;
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(nx, ny - 22); ctx.lineTo(nx - 10, ny + 8); ctx.lineTo(nx, ny + 2); ctx.lineTo(nx + 10, ny + 8); ctx.closePath(); ctx.fill();
  ctx.font = 'bold 16px Arial, sans-serif'; ctx.fillText('N', nx, ny + 24);

  // Skalstock (avrundad längd ≈ 1/5 av bredden)
  const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100];
  const target = (drawW / 5) / scale;
  const barM = niceSteps.reduce((best, s) => Math.abs(s - target) < Math.abs(best - target) ? s : best, niceSteps[0]);
  const bx = pad, by = H - legendH - 18, bw = barM * scale;
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.moveTo(bx, by - 7); ctx.lineTo(bx, by + 7); ctx.moveTo(bx + bw, by - 7); ctx.lineTo(bx + bw, by + 7); ctx.stroke();
  ctx.font = '15px Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#0f172a';
  ctx.fillText(`${barM} m`, bx + bw + 10, by);

  // Summering och mått per sektion
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, H - legendH, W, legendH);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, H - legendH); ctx.lineTo(W, H - legendH); ctx.stroke();
  const totalStalls = parts.reduce((s, p) => s + p.n * (p.sec.double ? 2 : 1), 0);
  const totalMeters = Math.ceil(parts.reduce((s, p) => s + ((p.n + 1) * p.d + (p.sec.back ? p.n * p.w : 0)) * (p.sec.double ? 2 : 1), 0));
  ctx.font = 'bold 20px Arial, sans-serif'; ctx.fillStyle = '#0f172a';
  ctx.fillText(`${opts.title || 'Ritning p-platser'} – ${totalStalls} rutor, ${totalMeters} linjemeter`, pad, H - legendH + 30);
  ctx.font = '15px Arial, sans-serif'; ctx.fillStyle = '#334155';
  const lines = parts.map(p => `${String.fromCharCode(65 + p.idx)}: ${p.n} rutor à ${p.w.toFixed(1).replace('.', ',')} × ${p.d.toFixed(1).replace('.', ',')} m` +
    `${p.sec.double ? ', dubbel rad' : ''}${p.sec.back ? ', med bakkant' : ''}`);
  const perRow = 2;
  lines.forEach((t, i) => ctx.fillText(t, pad + (i % perRow) * ((W - pad * 2) / perRow), H - legendH + 62 + Math.floor(i / perRow) * 22));
  ctx.font = '12px Arial, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'right';
  ctx.fillText('Schematisk ritning, skalenlig. Placering kontrolleras på plats.', W - pad, H - 14);

  return canvas.toDataURL('image/png');
}
