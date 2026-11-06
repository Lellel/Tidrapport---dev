// Nytt i appen – en lista som både bruksanvisningen (guide.html) och startsidans notis läser.
// Lägg NYASTE först. roller: forare, handskottare, ue, ekonom, admin.
// Regel (CLAUDE.md): ändras något som påverkar hur användaren gör → uppdatera guide.html och lägg en rad här.
window.LPV_NYHETER = [
  { id: '2026-11-06-foresla-punkter', datum: '2026-11-06', roller: ['admin'], modul: 'sno',
    titel: '🤖 Föreslå punkter för kundkartan',
    text: 'AI:n pekar ut gemensamma punkter i kundkartan och satelliten, appen räknar läget och godkänner bara om det stämmer inom 2 m. Kan köras för alla kartor som inte är utlagda (⋯ Mer). LandInfo-kartor som sparas mer än 3° vridna ger en varning.' },
  { id: '2026-11-06-passa-in-grannar', datum: '2026-11-06', roller: ['admin'], modul: 'sno',
    titel: 'Passa in: grannarnas kartor döljs',
    text: 'När du passar in en kundkarta med 📌 döljs grannarnas kartor, så att du inte råkar pricka på fel karta. De visas igen när du är klar.' },
  { id: '2026-11-06-vaderval', datum: '2026-11-06', roller: ['forare', 'handskottare', 'ue', 'admin'], modul: 'sno',
    titel: 'Välj vilka vädermätare du vill ha',
    text: 'Längst ner på startsidan under Väder: slå av eller på 🚜 Plogometern och 🪣 Sandometern. Den du stänger av syns inte och ger inga notiser.' },
  { id: '2026-11-06-guide', datum: '2026-11-06', roller: ['forare', 'handskottare', 'ue', 'ekonom', 'admin'],
    titel: 'Bruksanvisning för din roll',
    text: 'Tryck 📖 Bruksanvisning på startsidan. Här står alltid hur appen fungerar just nu, och vad som är nytt.' },
  { id: '2026-11-06-snoplanering', datum: '2026-11-06', roller: ['admin'], modul: 'sno',
    titel: 'Snöplaneringen är ny',
    text: 'Tavlan ser ut som Radarn: traktorremsan överst, kulpåsen till vänster och fastigheterna som kort. Fastigheter och traktorer ändras under ⚙️ Register.' },
  { id: '2026-11-05-snojour', datum: '2026-11-05', roller: ['forare', 'handskottare', 'ue', 'admin'], modul: 'sno',
    titel: 'Snöjour visar dina fastigheter',
    text: 'Du ser fastigheterna där din kula ligger, närmast först. Tryck ✅ Klar på varje fastighet när du är färdig. Slingorna finns inte längre.' }
];

// Vilken bruksanvisning gäller den som är inloggad på enheten?
window.lpvGuideRoll = function () {
  try {
    const g = localStorage.getItem('lpv_guide_roll'); // från servern (me) – känner även igen handskottare
    if (['forare', 'handskottare', 'ue', 'ekonom', 'admin'].indexOf(g) !== -1) return g;
    if (localStorage.getItem('lpv_is_admin') === 'true') return 'admin';
    const r = (localStorage.getItem('lpv_role') || '').toLowerCase();
    if (r === 'ue') return 'ue';
    if (r === 'ekonom') return 'ekonom';
    if (r === 'handskottare') return 'handskottare';
  } catch (e) { /* privat läge */ }
  return 'forare';
};

// Startsidan: visa det senaste nya för min roll en gång (tills man trycker på det eller ✕)
(function () {
  if (!/(^|\/)(index\.html)?$/.test(location.pathname) || /[?&](offert|ata|dator)=/.test(location.search)) return;
  let seen = '';
  try { seen = localStorage.getItem('lpv_nytt_sett') || ''; } catch (e) { return; }
  const roll = window.lpvGuideRoll();
  const modOk = (n) => !n.modul || !window.lpvModuleOn || window.lpvModuleOn(n.modul);
  const mine = window.LPV_NYHETER.filter(n => n.roller.indexOf(roll) !== -1 && modOk(n));
  if (!mine.length) return;
  const latest = mine[0];
  const markSeen = () => { try { localStorage.setItem('lpv_nytt_sett', latest.datum + '|' + latest.id); } catch (e) { /* privat läge */ } };
  // Första gången på enheten: visa bara det senaste, inte hela historiken
  const lastId = seen.split('|')[1] || '';
  if (lastId === latest.id) return;
  const show = () => {
    const bar = document.createElement('div');
    bar.id = 'lpv-nytt';
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 84px);z-index:900;max-width:560px;margin:0 auto;' +
      'display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:16px;background:var(--t-panel,#fff);color:var(--t-text,#071d33);' +
      'border:1px solid var(--t-line,rgba(0,0,0,.15));box-shadow:var(--t-shadow,0 6px 20px rgba(0,0,0,.15));font:15px/1.35 var(--t-font,system-ui)';
    const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    bar.innerHTML = '<a href="guide.html?roll=' + roll + '#nytt" style="flex:1;color:inherit;text-decoration:none"><b>📖 Nytt: ' + esc(latest.titel) + '</b><br>' +
      '<span style="font-size:13px;opacity:.75">Tryck för att läsa mer</span></a>' +
      '<button type="button" aria-label="Stäng" style="border:0;background:none;color:inherit;font-size:20px;padding:4px 6px;cursor:pointer">✕</button>';
    bar.querySelector('a').addEventListener('click', markSeen);
    bar.querySelector('button').addEventListener('click', () => { markSeen(); bar.remove(); });
    document.body.appendChild(bar);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
