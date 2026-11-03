// ==========================================
// VÄDER – Plogometern, Sandometern och kaffebryggaren (delas av index.html, snojour.html och vader.html)
// Ritar bara; datan kommer från servern (getWeather). Se docs/vader.md.
// ==========================================
(function () {
  if (document.getElementById('vader-css')) return;
  const css = document.createElement('style');
  css.id = 'vader-css';
  css.textContent = `
    .vx-meters { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .vx-meter { position: relative; border-radius: 18px; padding: 10px 10px 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(148,163,184,.25); overflow: hidden; min-width: 0; text-align: center; }
    .vx-meter h4 { margin: 0; font-size: 14px; font-weight: 800; text-align: left; }
    .vx-meter svg { display: block; width: 100%; height: auto; }
    .vx-needle { transform-origin: 150px 150px; transition: transform 1.1s cubic-bezier(.34,1.56,.64,1); }
    .vx-pct { font-size: 30px; font-weight: 800; line-height: 1; margin-top: -4px; font-variant-numeric: tabular-nums; }
    .vx-pct small { font-size: 16px; }
    .vx-label { font-weight: 800; font-size: 14px; margin-top: 2px; }
    .vx-why { font-size: 12px; opacity: .75; margin-top: 3px; line-height: 1.3; }
    .vx-when { display: inline-block; margin-top: 5px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(148,163,184,.18); }
    .vx-brewer { display: flex; gap: 12px; align-items: center; }
    .vx-brewer svg { width: 64px; height: auto; flex: none; }
    .vx-drip { opacity: 0; }
    .vx-brewing .vx-drip { animation: vxdrip .9s linear infinite; }
    .vx-brewing .vx-drip.d2 { animation-delay: .3s; } .vx-brewing .vx-drip.d3 { animation-delay: .6s; }
    @keyframes vxdrip { 0% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; transform: translateY(16px); } 100% { opacity: 0; transform: translateY(18px); } }
    .vx-steam { opacity: 0; }
    .vx-brewing .vx-steam { animation: vxsteam 2.2s ease-in-out infinite; } .vx-brewing .vx-steam.s2 { animation-delay: 1.1s; }
    @keyframes vxsteam { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: .8; } 100% { opacity: 0; transform: translateY(-14px) scaleX(1.4); } }
    .vx-ready .vx-lamp { fill: #f2b705; }
    .vx-brewing .vx-lamp { fill: #e5484d; animation: vxblink 1s steps(2) infinite; }
    @keyframes vxblink { 50% { fill: #ffb3ad; } }
    .vx-ready svg, .vx-brewing svg { animation: vxwiggle .5s ease 2; }
    @keyframes vxwiggle { 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
    :root[data-theme="night"] .vx-meter svg, :root[data-theme="night"] .vx-brewer svg { filter: sepia(1) saturate(3) hue-rotate(-38deg) brightness(.7); }
    :root[data-theme="night"] .vx-label { color: #ff4a3d !important; }
    @media (prefers-reduced-motion: reduce) { .vx-needle { transition: none; } .vx-brewing .vx-drip, .vx-brewing .vx-steam, .vx-brewing .vx-lamp, .vx-ready svg, .vx-brewing svg { animation: none; } }
  `;
  document.head.appendChild(css);
})();

const VX_PLOG = [[25, 'Sov gott 😴', '#2f9e6e'], [50, 'Ha luren nära 📱', '#d9a400'], [70, 'Håll koll ☕', '#e8762b'], [90, 'Ladda kaffebryggaren ☕', '#e8762b'], [101, 'Starta kaffebryggaren! 🚜', '#d6453d']];
const VX_SAND = [[25, 'Torrt och fint 😎', '#2f9e6e'], [50, 'Kan bli halt 📱', '#d9a400'], [70, 'Håll koll 🧊', '#e8762b'], [90, 'Fyll sandspridaren 🪣', '#e8762b'], [101, 'Ut och sanda! 🪣', '#d6453d']];

function vxEsc(t) { return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function vxGauge(title, val, kind, why, when) {
  const levels = kind === 'sand' ? VX_SAND : VX_PLOG;
  const l = levels.find(x => val < x[0]);
  return `<div class="vx-meter" aria-label="${vxEsc(title)} ${val} %">
    <h4>${title}</h4>
    <svg viewBox="0 0 300 175" aria-hidden="true">
      <path d="M30 150 A120 120 0 0 1 64.9 65.1" fill="none" stroke="#2f9e6e" stroke-width="22" stroke-linecap="round"/>
      <path d="M68.5 61.5 A120 120 0 0 1 147 30" fill="none" stroke="#d9a400" stroke-width="22"/>
      <path d="M153 30 A120 120 0 0 1 220 52" fill="none" stroke="#e8762b" stroke-width="22"/>
      <path d="M224 55 A120 120 0 0 1 270 150" fill="none" stroke="#d6453d" stroke-width="22" stroke-linecap="round"/>
      <g class="vx-needle" style="transform: rotate(${-90 + val * 1.8}deg)"><path d="M150 150 L146 148 L150 42 L154 148 Z" fill="currentColor"/><text x="138" y="40" font-size="22">${kind === 'sand' ? '🧊' : '❄️'}</text></g>
      <circle cx="150" cy="150" r="11" fill="currentColor"/>
    </svg>
    <div class="vx-pct">${val}<small>%</small></div>
    <div class="vx-label" style="color:${l[2]}">${l[1]}</div>
    <div class="vx-why">${vxEsc(why)}</div>
    ${when ? `<div class="vx-when">🕒 ${vxEsc(when)}</div>` : ''}
  </div>`;
}

// level 1 = laddad (vickar, gul lampa), 2 = bryggning (droppar, ånga, röd lampa)
function vxBrewer(level, title, text) {
  return `<div class="vx-brewer ${level >= 2 ? 'vx-brewing' : level >= 1 ? 'vx-ready' : ''}">
    <svg viewBox="0 0 90 100" aria-hidden="true">
      <rect x="10" y="6" width="70" height="16" rx="5" fill="#8a98a8"/>
      <rect x="64" y="40" width="16" height="50" rx="4" fill="#8a98a8"/>
      <rect x="10" y="88" width="70" height="8" rx="3" fill="#8a98a8"/>
      <circle class="vx-lamp" cx="72" cy="80" r="3.5" fill="#cbd5e1"/>
      <rect class="vx-drip" x="35" y="24" width="3" height="5" rx="1.5" fill="#7a4424"/>
      <rect class="vx-drip d2" x="35" y="24" width="3" height="5" rx="1.5" fill="#7a4424"/>
      <rect class="vx-drip d3" x="35" y="24" width="3" height="5" rx="1.5" fill="#7a4424"/>
      <path d="M18 46 h38 l-4 40 h-30 z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      ${level >= 2 ? '<path d="M21.5 58 h31 l-2.8 26.5 h-25.5 z" fill="#7a4424"/>' : ''}
      <path class="vx-steam" d="M30 40 q-4 -6 0 -12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path class="vx-steam s2" d="M42 40 q4 -6 0 -12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>
    <div><div style="font-weight:800;font-size:16px;">${vxEsc(title)}</div><div style="font-size:14px;opacity:.85;line-height:1.35;">${vxEsc(text)}</div></div>
  </div>`;
}

function vxMeters(a) {
  return `<div class="vx-meters">${vxGauge('🚜 Plogometern', a.plog, 'plog', a.plogWhy, a.plogWhen)}${vxGauge('🪣 Sandometern', a.sand, 'sand', a.sandWhy, a.sandWhen)}</div>`;
}

function vxAge(at) {
  if (!at) return '';
  const min = Math.round((Date.now() - at) / 60000);
  return min < 2 ? 'mätt nyss' : min < 90 ? `mätt för ${min} min sedan` : `mätt ${new Date(at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
}
