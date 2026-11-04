// APPIKONER: AI-ritade glaskulor i stället för emoji i navigeringen.
// Element med data-icon="nyckel" får kulan om den finns – annars står emojin kvar (även utan nät).
// Kulorna skapas av admin på ikoner.html och hämtas härifrån högst var 12:e timme.
(function () {
  if (window.lpvIcons) { window.lpvIcons.apply(); return; }
  const css = document.createElement('style');
  // Kulan beskärs tätt (den mörkblå kanten bort) så att motivet syns även i 24 px
  css.textContent = '.lpv-icw{display:inline-block;width:1.5em;height:1.5em;border-radius:50%;overflow:hidden;vertical-align:middle;flex:none}' +
    '.lpv-ico{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.28)}' +
    '.tool-dock .lpv-icw{width:28px;height:28px}h1 .lpv-icw{width:1.7em;height:1.7em;margin-right:4px}' +
    '[data-theme="night"] .lpv-ico{filter:grayscale(1) sepia(1) saturate(6) hue-rotate(-45deg) brightness(.55)}';
  document.head.appendChild(css);
  const read = () => { try { return JSON.parse(localStorage.getItem('lpv_app_icons') || '{}'); } catch (e) { return {}; } };

  function apply(root) {
    const icons = read();
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      const url = icons[el.dataset.icon];
      if (el.dataset.fallback === undefined) el.dataset.fallback = el.innerHTML;
      if (!url) { if (el.querySelector('img.lpv-ico')) el.innerHTML = el.dataset.fallback; return; }
      const img = el.querySelector('img.lpv-ico');
      if (img && img.getAttribute('src') === url) return;
      el.innerHTML = '';
      const wrap = document.createElement('span'), im = document.createElement('img');
      wrap.className = 'lpv-icw';
      im.className = 'lpv-ico'; im.alt = ''; im.src = url;
      im.onerror = () => { el.innerHTML = el.dataset.fallback; }; // ingen bild (t.ex. utan nät) → emojin
      wrap.appendChild(im); el.appendChild(wrap);
    });
  }

  function set(icons) {
    try { localStorage.setItem('lpv_app_icons', JSON.stringify(icons || {})); localStorage.setItem('lpv_app_icons_at', String(Date.now())); } catch (e) { /* privat läge */ }
    apply();
  }

  async function refresh(force) {
    try {
      const at = Number(localStorage.getItem('lpv_app_icons_at') || 0);
      if (!force && Date.now() - at < 12 * 3600e3) return;
      if (typeof CONFIG === 'undefined' || !CONFIG.API_URL) return;
      const user = localStorage.getItem('lpv_user') || localStorage.getItem('lpv_user_name') || '';
      if (!user) return;
      const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow',
        body: JSON.stringify({ user, key: localStorage.getItem('lpv_key') || '', token: CONFIG.API_TOKEN, site: location.origin + location.pathname.replace(/[^/]*$/, ''), action: 'getAppIcons' }) });
      const j = await res.json();
      if (j.status === 'success') set(j.icons);
    } catch (e) { /* nästa gång */ }
  }

  window.lpvIcons = { apply, set, refresh };
  // Sidor som ritar om sitt innehåll (verktygslådan, korten) får kulorna direkt
  let pending = false;
  const watch = () => new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; if (document.querySelector('[data-icon]:not([data-fallback])')) apply(); });
  }).observe(document.body, { childList: true, subtree: true });
  const go = () => { apply(); watch(); refresh(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
