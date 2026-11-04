// SÄSONGSTEMAN (se docs/sasonger.md). Bestämt med Daniel 2026-11-04.
// Rätt tema väljs automatiskt på datumet. <html data-tema="jul"> styr färger, accessoar på avatar-kulorna
// och juliga/påskiga glaskulor (appikoner.js tar "hem_jul" före "hem"). Det fallande ritas på en canvas.
// Förhandsgranska: ?tema=jul (eller ?jul=1), ?tema=av för att sluta. Av/på per enhet med temaknappen.
(function () {
  if (window.lpvSeason) return;

  // ---------- TEMAN ----------
  // fall: vad som faller · acc: accessoar på avatar-kulorna · color: accentfärg [ljust, mörkt]
  const THEMES = {
    vaffla:      { name: 'Våffeldagen',     emoji: '🧇', fall: ['emoji:🧇'] },
    pi:          { name: 'Pi-dagen',        emoji: '🥧', fall: ['pi', 'emoji:🥧'] },
    fettis:      { name: 'Fettisdagen',     emoji: '🥐', fall: ['semla'] },
    pask:        { name: 'Påsk',            emoji: '🐣', fall: ['feather', 'egg'], acc: 'oron', hare: true },
    nationaldag: { name: 'Nationaldagen',   emoji: '🇸🇪', fall: ['emoji:🇸🇪', 'confetti-se'], color: ['#006aa7', '#3b9bdc'] },
    kraftor:     { name: 'Kräftskiva',      emoji: '🦞', fall: ['emoji:🦞'], acc: 'krafthatt' },
    kanelbulle:  { name: 'Kanelbullens dag', emoji: '🍥', fall: ['bulle'], acc: 'kock', color: ['#a0522d', '#d2894f'] },
    halloween:   { name: 'Halloween',       emoji: '🎃', fall: ['emoji:🦇', 'emoji:🍂'], acc: 'haxhatt', color: ['#ea580c', '#fb923c'] },
    lucia:       { name: 'Lucia',           emoji: '🕯️', fall: ['glow', 'emoji:⭐'], acc: 'ljuskrona' },
    jul:         { name: 'Jul',             emoji: '🎄', fall: ['snow'], acc: 'tomteluva', color: ['#c8102e', '#ef4444'] },
    nyar:        { name: 'Nyår',            emoji: '🎆', fall: ['confetti', 'emoji:✨'] }
  };

  // ---------- DATUM ----------
  const day = (y, m, d) => new Date(y, m - 1, d);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function easter(y) { // Gregoriansk påskdag (samma uträkning som radarns helgdagar)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return day(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
  }
  // Halloween: hela helgen (fre–sön) närmast 31 okt, plus själva 31 okt
  function halloween(y) {
    const h = day(y, 10, 31), dow = h.getDay(); // 0 = sön
    const toSat = (6 - dow + 7) % 7, fromSat = (dow + 1) % 7; // dagar fram till nästa / sedan förra lördagen
    const sat = toSat <= fromSat ? addDays(h, toSat) : addDays(h, -fromSat);
    const fri = addDays(sat, -1), sun = addDays(sat, 1);
    return [fri < h ? fri : h, sun > h ? sun : h];
  }
  // Kräftskiva: hela andra veckan i augusti (mån–sön för veckan med andra onsdagen, den gamla kräftpremiären)
  function kraftor(y) {
    const first = day(y, 8, 1), wed = addDays(first, ((3 - first.getDay() + 7) % 7) + 7);
    const mon = addDays(wed, -2);
    return [mon, addDays(mon, 6)];
  }
  // Alla perioder för ett år: [id, från, till] (endagsteman först – de vinner om två krockar)
  function periods(y) {
    const e = easter(y);
    return [
      ['vaffla', day(y, 3, 25), day(y, 3, 25)],
      ['pi', day(y, 3, 14), day(y, 3, 14)],
      ['fettis', addDays(e, -47), addDays(e, -47)],
      ['nationaldag', day(y, 6, 6), day(y, 6, 6)],
      ['kanelbulle', day(y, 10, 4), day(y, 10, 4)],
      ['lucia', day(y, 12, 13), day(y, 12, 13)],
      ['nyar', day(y, 1, 1), day(y, 1, 1)],
      ['nyar', day(y, 12, 31), day(y, 12, 31)],
      ['pask', addDays(e, -7), addDays(e, 1)],
      ['kraftor'].concat(kraftor(y)),
      ['halloween'].concat(halloween(y)),
      ['jul', day(y, 12, 23), day(y, 12, 30)]
    ];
  }
  function activeOn(date) {
    const t = iso(date);
    const hit = periods(date.getFullYear()).find(([, a, b]) => iso(a) <= t && t <= iso(b));
    return hit ? { id: hit[0], start: hit[1], end: hit[2] } : null;
  }
  // Teman som börjar inom n dagar (för påminnelsekortet)
  function upcoming(n, from) {
    const now = from || new Date(), today = day(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const list = [];
    [now.getFullYear(), now.getFullYear() + 1].forEach(y => periods(y).forEach(([id, a]) => {
      const days = Math.round((a - today) / 864e5);
      if (days > 0 && days <= n && !list.some(x => x.id === id)) list.push({ id, start: a, days, theme: THEMES[id] });
    }));
    return list.sort((a, b) => a.days - b.days);
  }

  // ---------- VILKET TEMA GÄLLER NU ----------
  const store = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* privat läge */ } };
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const params = new URLSearchParams(location.search);
  try {
    let pv = params.get('tema');
    Object.keys(THEMES).forEach(id => { if (params.get(id) === '1') pv = id; if (params.get(id) === '0') pv = 'av'; });
    if (pv === 'av') sessionStorage.removeItem('lpv_tema_preview');
    else if (pv && THEMES[pv]) sessionStorage.setItem('lpv_tema_preview', pv);
  } catch (e) { /* privat läge */ }
  let preview = null;
  try { preview = sessionStorage.getItem('lpv_tema_preview'); } catch (e) { preview = null; }
  const found = preview && THEMES[preview] ? { id: preview, start: new Date(), preview: true } : activeOn(new Date());
  const offKey = found ? found.id + ':' + iso(found.start) : '';
  const isOff = () => !!found && !found.preview && read('lpv_tema_av') === offKey;

  // ---------- UTSEENDE ----------
  const PAGE = location.pathname.split('/').pop() || 'index.html';
  const MAP_PAGES = ['planering.html', 'snozoner.html', 'snojour.html', 'snohinder.html'];
  const svg = (s) => 'url("data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" + s + '</svg>') + '")';
  const ACC = {
    tomteluva: { img: svg("<path d='M14 80 C28 42 54 16 86 20 C80 34 74 54 80 80 Z' fill='#d61f2c'/><rect x='6' y='70' width='82' height='19' rx='9.5' fill='#fff'/><circle cx='86' cy='20' r='11' fill='#fff'/>"), box: 'width:72%;height:72%;left:40%;top:-40%;transform:rotate(16deg)' },
    oron: { img: svg("<g transform='rotate(-14 32 92)'><ellipse cx='32' cy='48' rx='13' ry='42' fill='#f4f4f5' stroke='#d4d4d8' stroke-width='2'/><ellipse cx='32' cy='54' rx='6' ry='30' fill='#f9a8d4'/></g><g transform='rotate(14 68 92)'><ellipse cx='68' cy='48' rx='13' ry='42' fill='#f4f4f5' stroke='#d4d4d8' stroke-width='2'/><ellipse cx='68' cy='54' rx='6' ry='30' fill='#f9a8d4'/></g>"), box: 'width:74%;height:78%;left:13%;top:-60%' },
    haxhatt: { img: svg("<path d='M50 4 C46 26 38 48 28 74 L74 74 C66 54 60 34 64 18 Z' fill='#2e1f47'/><rect x='30' y='62' width='42' height='9' fill='#f97316'/><ellipse cx='50' cy='78' rx='47' ry='10' fill='#1e1433'/>"), box: 'width:80%;height:80%;left:28%;top:-50%;transform:rotate(14deg)' },
    kock: { img: svg("<g fill='#fff' stroke='#cbd5e1' stroke-width='2'><circle cx='30' cy='44' r='20'/><circle cx='50' cy='32' r='24'/><circle cx='70' cy='44' r='20'/><rect x='24' y='44' width='52' height='34' rx='4'/></g><rect x='24' y='66' width='52' height='12' fill='#e2e8f0'/>"), box: 'width:66%;height:66%;left:17%;top:-48%' },
    ljuskrona: { img: svg("<g fill='#fff' stroke='#e5e7eb' stroke-width='1.5'><rect x='16' y='34' width='9' height='34' rx='2'/><rect x='36' y='26' width='9' height='42' rx='2'/><rect x='55' y='26' width='9' height='42' rx='2'/><rect x='75' y='34' width='9' height='34' rx='2'/></g><g fill='#fbbf24'><ellipse cx='20.5' cy='26' rx='4.5' ry='8'/><ellipse cx='40.5' cy='18' rx='4.5' ry='8'/><ellipse cx='59.5' cy='18' rx='4.5' ry='8'/><ellipse cx='79.5' cy='26' rx='4.5' ry='8'/></g><ellipse cx='50' cy='72' rx='46' ry='12' fill='#15803d'/><g fill='#dc2626'><circle cx='22' cy='72' r='3.5'/><circle cx='42' cy='76' r='3.5'/><circle cx='62' cy='76' r='3.5'/><circle cx='80' cy='71' r='3.5'/></g>"), box: 'width:92%;height:60%;left:4%;top:-36%' },
    krafthatt: { img: svg("<path d='M50 6 L22 78 L78 78 Z' fill='#facc15'/><path d='M43 24 L57 24 M37 40 L63 40 M31 56 L69 56 M26 70 L74 70' stroke='#dc2626' stroke-width='5'/><circle cx='50' cy='7' r='7' fill='#dc2626'/>"), box: 'width:66%;height:66%;left:38%;top:-44%;transform:rotate(16deg)' }
  };
  const ORBS = ':is(.orb, .kula:not(.spin), .postman-pat-bubble)';
  let css = '';
  Object.keys(THEMES).forEach(id => {
    const t = THEMES[id];
    if (t.color) css += `:root[data-tema="${id}"]:not([data-theme="night"]){--t-accent:${t.color[0]};--accent:${t.color[0]}}` +
      `:root[data-tema="${id}"][data-theme="dark"]{--t-accent:${t.color[1]};--accent:${t.color[1]}}`;
    if (t.acc) css += `:root[data-tema="${id}"] ${ORBS}::before{content:"";position:absolute;pointer-events:none;z-index:4;background:${ACC[t.acc].img} no-repeat center/contain;${ACC[t.acc].box}}`;
  });
  // Kulorna klipper annars bort allt utanför cirkeln – bilderna rundas i stället
  css += ':root[data-tema-acc] :is(.orb, .kula, .postman-pat-bubble){overflow:visible!important}:root[data-tema-acc] .orb{position:relative}' +
    ':root[data-tema-acc] .kula img{border-radius:50%}' +
    '.lpv-tema-btn{min-height:36px;min-width:36px;padding:0 10px;border-radius:999px;border:1px solid var(--t-line,rgba(127,127,127,.3));background:var(--t-btn,transparent);font-size:16px;cursor:pointer;margin-left:6px}' +
    '.lpv-tema-btn.off{opacity:.45;filter:grayscale(1)}' +
    '#lpv-fall{position:fixed;inset:0;pointer-events:none;z-index:2500}' +
    '.lpv-hare{position:fixed;z-index:2600;pointer-events:none;font-size:34px;bottom:calc(env(safe-area-inset-bottom) + 90px);right:-60px;animation:lpv-hare-run 7s linear forwards}' +
    '.lpv-hare span{display:inline-block;animation:lpv-hare-hop .5s ease-in-out infinite alternate}' +
    '@keyframes lpv-hare-run{to{transform:translateX(calc(-100vw - 120px))}}@keyframes lpv-hare-hop{from{transform:translateY(0)}to{transform:translateY(-22px)}}';
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // ---------- DET SOM FALLER ----------
  let canvas = null, raf = 0, parts = [], hareTimer = 0;
  const sprites = {};
  function emojiSprite(ch) {
    if (sprites[ch]) return sprites[ch];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.font = '48px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 36);
    return (sprites[ch] = c);
  }
  const PASTEL = ['#f9a8d4', '#fde68a', '#a7f3d0', '#bfdbfe', '#ddd6fe', '#fecaca'];
  const CONF = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
  function newPart(kind, w, h, top) {
    const p = { kind, x: Math.random() * w, y: top ? -20 - Math.random() * h : Math.random() * h, s: 0.6 + Math.random() * 0.8,
      vy: 0.25 + Math.random() * 0.55, sway: Math.random() * Math.PI * 2, rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.03,
      color: (kind === 'confetti-se' ? ['#006aa7', '#fecc02'] : kind === 'confetti' ? CONF : PASTEL)[Math.floor(Math.random() * 6) % (kind === 'confetti-se' ? 2 : 6)],
      a: 0.55 + Math.random() * 0.4 };
    if (kind === 'snow') { p.r = 1.5 + Math.random() * 2.5; p.vy = 0.3 + p.r * 0.15; }
    if (kind === 'pi') p.txt = Math.random() < 0.5 ? 'π' : String('3.14159265')[Math.floor(Math.random() * 10)];
    return p;
  }
  function drawPart(x, p) {
    x.save(); x.globalAlpha = p.a; x.translate(p.x, p.y); x.rotate(p.rot); x.scale(p.s, p.s);
    switch (p.kind) {
      case 'snow': x.rotate(-p.rot); x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, p.r / p.s, 0, 7); x.fill(); break;
      case 'feather': x.fillStyle = p.color; x.beginPath(); x.ellipse(0, 0, 4, 12, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.15)'; x.beginPath(); x.moveTo(0, -12); x.lineTo(0, 14); x.stroke(); break;
      case 'egg': x.fillStyle = p.color; x.beginPath(); x.ellipse(0, 0, 7, 9, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-6, 0); x.lineTo(6, 0); x.stroke(); break;
      case 'confetti': case 'confetti-se': x.fillStyle = p.color; x.fillRect(-4, -2.5 * Math.cos(p.rot * 3), 8, 5 * Math.cos(p.rot * 3) || 1); break;
      case 'glow': { x.rotate(-p.rot); const g = x.createRadialGradient(0, 0, 0, 0, 0, 10); g.addColorStop(0, 'rgba(255,214,120,.95)'); g.addColorStop(1, 'rgba(255,170,60,0)'); x.globalAlpha = p.a * (0.7 + 0.3 * Math.sin(p.sway * 3)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 10, 0, 7); x.fill(); break; }
      case 'semla': x.fillStyle = '#c98a4b'; x.beginPath(); x.arc(0, 3, 9, 0, Math.PI); x.fill(); x.fillStyle = '#fffaf0'; x.beginPath(); x.ellipse(0, 1, 9, 5, 0, Math.PI, 0); x.fill(); x.fillStyle = '#c98a4b'; x.beginPath(); x.ellipse(0, -4, 7, 3.5, 0, Math.PI, 0); x.fill(); break;
      case 'bulle': x.fillStyle = '#b8743c'; x.beginPath(); x.arc(0, 0, 9, 0, 7); x.fill(); x.strokeStyle = '#7c4a1e'; x.lineWidth = 1.6; x.beginPath(); for (let i = 0; i < 26; i++) { const t = i / 26 * 4 * Math.PI, r = 1 + i / 26 * 7; x.lineTo(Math.cos(t) * r, Math.sin(t) * r); } x.stroke(); x.fillStyle = '#fff'; [[-4, -3], [3, -5], [5, 3], [-2, 5], [0, 0]].forEach(([a, b]) => x.fillRect(a, b, 1.6, 1.6)); break;
      case 'pi': x.fillStyle = 'rgba(120,140,170,.9)'; x.font = 'bold 18px Georgia,serif'; x.textAlign = 'center'; x.fillText(p.txt, 0, 6); break;
      default: { const sp = emojiSprite(p.kind.slice(6)); x.drawImage(sp, -10, -10, 20, 20); }
    }
    x.restore();
  }
  function startFall(theme) {
    if (MAP_PAGES.includes(PAGE) || document.documentElement.getAttribute('data-theme') === 'night') return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    canvas = document.createElement('canvas'); canvas.id = 'lpv-fall'; document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0;
    const size = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const n = Math.round(Math.min(45, Math.max(18, w * h / 26000)));
    parts = Array.from({ length: n }, (_, i) => newPart(theme.fall[i % theme.fall.length], w, h, false));
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p, i) => {
        p.sway += 0.012; p.y += p.vy; p.x += Math.sin(p.sway) * 0.35; p.rot += p.vr;
        if (p.y > h + 24) parts[i] = newPart(p.kind, w, h, true);
        drawPart(ctx, p);
      });
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (canvas && document.visibilityState === 'visible') raf = requestAnimationFrame(tick); });
    raf = requestAnimationFrame(tick);
    if (theme.hare) {
      const hop = () => {
        const el = document.createElement('div'); el.className = 'lpv-hare'; el.innerHTML = '<span>🐇</span>';
        document.body.appendChild(el); setTimeout(() => el.remove(), 7500);
        hareTimer = setTimeout(hop, 45000 + Math.random() * 45000);
      };
      hareTimer = setTimeout(hop, 8000);
    }
  }
  function stopFall() {
    cancelAnimationFrame(raf); clearTimeout(hareTimer);
    if (canvas) { canvas.remove(); canvas = null; }
  }

  function apply() {
    const root = document.documentElement;
    const on = found && !isOff();
    if (on) { root.setAttribute('data-tema', found.id); if (THEMES[found.id].acc) root.setAttribute('data-tema-acc', ''); else root.removeAttribute('data-tema-acc'); }
    else { root.removeAttribute('data-tema'); root.removeAttribute('data-tema-acc'); }
    if (window.lpvIcons) window.lpvIcons.apply();
    stopFall();
    if (on && document.body) startFall(THEMES[found.id]);
    document.querySelectorAll('.lpv-tema-btn').forEach(b => { b.classList.toggle('off', !on); b.title = (on ? 'Stäng av ' : 'Slå på ') + THEMES[found.id].name.toLowerCase() + '-temat på den här enheten'; });
  }

  // Av/på-knapp bredvid lägesknappen (🌓) – bara när ett tema gäller
  function addButton() {
    if (!found || document.querySelector('.lpv-tema-btn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lpv-tema-btn'; b.textContent = THEMES[found.id].emoji;
    b.onclick = () => { store('lpv_tema_av', isOff() ? null : offKey); apply(); };
    const themeBtn = document.querySelector('.theme-btn:not(.floating)');
    const picker = document.querySelector('.theme-picker');
    if (themeBtn) themeBtn.after(b);
    else if (picker) picker.appendChild(b);
    else return;
  }

  window.lpvSeason = { THEMES, activeOn, upcoming, periods, current: () => (found && !isOff() ? found.id : null), iso };
  if (found && !isOff()) document.documentElement.setAttribute('data-tema', found.id); // direkt, innan sidan ritas
  const go = () => { apply(); addButton(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
