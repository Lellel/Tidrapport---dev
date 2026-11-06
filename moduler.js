// Moduler per person (docs/moduler-su.md): kolumn M i Personal → me → localStorage lpv_modules.
// Länkar och knappar till en dold modul göms överallt (menyer, flikrad, admin-knappar) och element med data-modul.
// Döljer – spärrar inte. Laddas på alla sidor direkt efter theme.js (startsidan: före app.js).
(function () {
  const PAGE_MODULE = { 'radar.html': 'radar', 'planering.html': 'sno', 'snoregister.html': 'sno', 'snozoner.html': 'sno', 'snojour.html': 'sno',
    'snohinder.html': 'sno', 'vader.html': 'sno', 'offerter.html': 'offerter', 'ekonomi.html': 'ekonomi', 'personal.html': 'personal' };
  function myModules() {
    try { const m = JSON.parse(localStorage.getItem('lpv_modules') || 'null'); return Array.isArray(m) ? m : null; } catch (e) { return null; }
  }
  window.lpvModuleOn = function (mod) { const m = myModules(); return !m || !mod || m.indexOf(mod) !== -1; };
  window.lpvModuleOfPage = function (page) { return PAGE_MODULE[String(page || '').split('#')[0].split('?')[0].split('/').pop()] || ''; };
  window.lpvApplyModules = function () {
    const m = myModules();
    document.querySelectorAll('a[href], [onclick*="location.href"], [data-modul]').forEach(el => {
      let mod = el.getAttribute('data-modul');
      if (!mod) {
        const oc = (el.getAttribute('onclick') || '').match(/location\.href\s*=\s*'([^']+)'/);
        mod = window.lpvModuleOfPage(oc ? oc[1] : el.getAttribute('href'));
      }
      if (!mod) return;
      const hide = !!m && m.indexOf(mod) === -1;
      if (hide) { if (!el.hasAttribute('data-modul-dold')) { el.setAttribute('data-modul-dold', el.style.display || ''); el.style.display = 'none'; } }
      else if (el.hasAttribute('data-modul-dold')) { el.style.display = el.getAttribute('data-modul-dold'); el.removeAttribute('data-modul-dold'); }
    });
  };
  function run() { window.lpvApplyModules(); new MutationObserver(() => { if (myModules()) window.lpvApplyModules(); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
