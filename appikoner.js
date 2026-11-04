// APPIKONER: AI-ritade glaskulor i stället för emoji i navigeringen.
// Element med data-icon="nyckel" får kulan om den finns – annars står emojin kvar (även utan nät).
// Kulorna skapas av admin på ikoner.html och hämtas härifrån högst var 12:e timme.
(function () {
  if (window.lpvIcons) { window.lpvIcons.apply(); return; }
  const css = document.createElement('style');
  css.textContent = '.lpv-ico{width:1.5em;height:1.5em;border-radius:50%;object-fit:cover;vertical-align:middle;display:inline-block}' +
    '.tool-dock .lpv-ico{width:24px;height:24px}h1 .lpv-ico{width:1.6em;height:1.6em;margin-right:2px}' +
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
      const im = document.createElement('img');
      im.className = 'lpv-ico'; im.alt = ''; im.src = url;
      im.onerror = () => { el.innerHTML = el.dataset.fallback; }; // ingen bild (t.ex. utan nät) → emojin
      el.appendChild(im);
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
