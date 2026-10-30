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
