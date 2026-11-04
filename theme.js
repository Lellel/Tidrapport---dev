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
  // Flikraden för admin i telefon – samma som på startsidan, så man aldrig fastnar på en sida.
  // Radarn har en egen helskärmslayout och klarar sig med sin tillbakaknapp.
  function addTabBar() {
    let admin = false;
    try { admin = localStorage.getItem('lpv_is_admin') === 'true'; } catch (e) { admin = false; }
    const page = location.pathname.split('/').pop() || 'index.html';
    if (!admin || page === 'radar.html' || document.querySelector('.lpv-tabbar')) return;
    const snow = ['planering.html', 'snozoner.html', 'snojour.html', 'snohinder.html', 'vader.html'].includes(page);
    const tabs = [['index.html', '🏠', 'Hem', false, 'hem'], ['radar.html', '🔭', 'Radarn', false, 'radar'], ['planering.html', '🚜', 'Snö', snow, 'sno'], ['offerter.html', '📄', 'Offerter', page === 'offerter.html', 'offerter']];
    const bar = document.createElement('nav');
    bar.className = 'lpv-tabbar'; bar.setAttribute('aria-label', 'Admin');
    bar.innerHTML = tabs.map(([href, ic, txt, on, key]) => `<a href="${href}" class="${on ? 'on' : ''}"><span data-icon="${key}">${ic}</span>${txt}</a>`).join('') +
      `<button type="button" class="${page === 'ekonomi.html' ? 'on' : ''}"><span data-icon="mer">•••</span>Mer</button>`;
    const more = document.createElement('div');
    more.className = 'lpv-more';
    more.innerHTML = '<div><a href="offerter.html?view=customers"><span data-icon="kunder">💼</span>&nbsp; Kunder</a><a href="vader.html"><span data-icon="vader">🌨️</span>&nbsp; Väder – Plogometern</a><a href="snozoner.html"><span data-icon="zoner">❄️</span>&nbsp; Rita snözoner</a><a href="ekonomi.html"><span data-icon="ekonomi">💰</span>&nbsp; Ekonomi</a><a href="widget.html"><span data-icon="widget">📱</span>&nbsp; Widget</a><a href="ikoner.html">🎨&nbsp; Appikoner</a></div>';
    more.onclick = (e) => { if (e.target === more) more.classList.remove('open'); };
    bar.querySelector('button').onclick = () => more.classList.add('open');
    document.body.append(bar, more);
    document.body.classList.add('lpv-has-tabbar');
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
    addTabBar();
    // Appikonerna (glaskulor) i flikraden och Mer-menyn
    if (window.lpvIcons) window.lpvIcons.apply();
    else { const s = document.createElement('script'); s.src = 'appikoner.js'; document.head.appendChild(s); }
  });
})();
