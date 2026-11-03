// Läget (Auto/Ljust/Mörkt/Natt) på alla sidor utanför startsidan – samma inställning som startsidan (lpv_theme).
// Laddas i <head> så att sidan inte blinkar till i fel läge.
(function () {
  const THEMES = ['auto', 'light', 'dark', 'night'];
  const NAMES = { auto: '🌓 Auto', light: '☀️ Ljust', dark: '🌙 Mörkt', night: '🔴 Natt' };
  const COLORS = { light: '#e6eff9', dark: '#0b1220', night: '#000000' };
  const media = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const setting = () => { let t = 'auto'; try { t = localStorage.getItem('lpv_theme') || 'auto'; } catch (e) { /* privat läge */ } return THEMES.includes(t) ? t : 'auto'; };
  const resolve = (t) => t !== 'auto' ? t : (media && media.matches ? 'dark' : 'light');
  function apply() {
    const t = resolve(setting());
    document.documentElement.setAttribute('data-theme', t);
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = COLORS[t];
    document.querySelectorAll('.theme-btn').forEach(b => { const [ic, ...rest] = NAMES[setting()].split(' '); b.innerHTML = ic + '<span class="tl"> ' + rest.join(' ') + '</span>'; b.title = 'Läge: ' + NAMES[setting()].slice(3) + ' – tryck för att byta'; });
  }
  window.lpvCycleTheme = function () {
    const next = THEMES[(THEMES.indexOf(setting()) + 1) % THEMES.length];
    try { localStorage.setItem('lpv_theme', next); } catch (e) { /* privat läge */ }
    apply();
  };
  apply();
  if (media && media.addEventListener) media.addEventListener('change', apply);
  window.addEventListener('storage', (e) => { if (e.key === 'lpv_theme') apply(); });
  // Knappen läggs i [data-theme-slot] om sidan har en sådan, annars flytande nere till vänster
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'theme-btn'; btn.onclick = window.lpvCycleTheme;
    const slot = document.querySelector('[data-theme-slot]');
    if (slot) slot.appendChild(btn); else { btn.classList.add('floating'); document.body.appendChild(btn); }
    apply();
  });
})();
