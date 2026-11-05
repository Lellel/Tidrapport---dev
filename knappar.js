// Visuell respons på alla knappar i appen (bestämt 2026-11-04):
// 1) Direkt vid tryck: knappen blir mörkare och lite mindre.
// 2) Medan servern jobbar: snurra före texten, knappen blekare och låst (inga dubbelskick).
// Ingen knapp behöver ändras – anrop (fetch) som startar strax efter ett knapptryck kopplas till den knappen.
(function () {
  if (window.__lpvKnappar) return;
  window.__lpvKnappar = true;

  const WINDOW_MS = 4000;     // ett anrop inom så här lång tid efter trycket räknas till knappen
  const MAX_BUSY_MS = 90000;  // säkerhetsspärr: knappen låses aldrig upp senare än så här

  const css = `
    button:not(:disabled):active { filter: brightness(0.82); transform: scale(0.96); }
    button { transition: filter .08s, transform .08s, opacity .15s; }
    button.lpv-busy { opacity: .65; cursor: progress; pointer-events: none; }
    .lpv-spin { display: inline-block; width: .9em; height: .9em; margin-right: .4em; vertical-align: -0.12em;
      border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%;
      animation: lpv-spin .7s linear infinite; box-sizing: border-box; }
    @keyframes lpv-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .lpv-spin { animation-duration: 2s; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // iPhone/iPad visar bara :active om sidan lyssnar på touchstart
  document.addEventListener('touchstart', function () {}, { passive: true });

  let last = null; // { btn, at }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('lpv-busy')) { // låst: tryck nummer två ska inte göra något
      e.preventDefault(); e.stopImmediatePropagation();
      return;
    }
    last = { btn: btn, at: Date.now() };
  }, true);

  function markBusy(btn) {
    btn._lpvCount = (btn._lpvCount || 0) + 1;
    if (btn._lpvCount > 1) return;
    btn.classList.add('lpv-busy');
    btn.setAttribute('aria-busy', 'true');
    const spin = document.createElement('span');
    spin.className = 'lpv-spin';
    spin.setAttribute('aria-hidden', 'true');
    btn.insertBefore(spin, btn.firstChild);
    btn._lpvTimer = setTimeout(function () { btn._lpvCount = 1; unmark(btn); }, MAX_BUSY_MS);
  }

  function unmark(btn) {
    btn._lpvCount = Math.max(0, (btn._lpvCount || 1) - 1);
    if (btn._lpvCount > 0) return;
    clearTimeout(btn._lpvTimer);
    btn.classList.remove('lpv-busy');
    btn.removeAttribute('aria-busy');
    const spin = btn.querySelector(':scope > .lpv-spin');
    if (spin) spin.remove();
    // flera anrop i följd (t.ex. spara → ladda om listan) räknas fortfarande till samma knapp
    if (last && last.btn === btn) last.at = Date.now();
  }

  // ⏳ som visas medan något väntar vänds sakta upp och ner (2026-11-05). Tecknet byts mot ett animerat element.
  const hgCss = document.createElement('style');
  hgCss.textContent = '.lpv-hourglass{display:inline-block;animation:lpv-hg 1.6s ease-in-out infinite}' +
    '@keyframes lpv-hg{0%,40%{transform:rotate(0)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(360deg)}}' +
    '@media (prefers-reduced-motion: reduce){.lpv-hourglass{animation:none}}';
  (document.head || document.documentElement).appendChild(hgCss);
  function wrapHourglasses(root) {
    if (!root || !document.body) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) =>
      n.nodeValue.indexOf('⏳') !== -1 && !(n.parentNode && (n.parentNode.classList && n.parentNode.classList.contains('lpv-hourglass') || /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|TITLE)$/.test(n.parentNode.nodeName)))
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const parts = n.nodeValue.split('⏳'), frag = document.createDocumentFragment();
      parts.forEach((t, i) => {
        if (i) { const sp = document.createElement('span'); sp.className = 'lpv-hourglass'; sp.textContent = '⏳'; frag.appendChild(sp); }
        if (t) frag.appendChild(document.createTextNode(t));
      });
      n.parentNode.replaceChild(frag, n);
    });
  }
  let hgPending = false;
  const startHourglass = () => {
    wrapHourglasses(document.body);
    new MutationObserver(() => {
      if (hgPending) return;
      hgPending = true;
      setTimeout(() => { hgPending = false; wrapHourglasses(document.body); }, 30);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startHourglass); else startHourglass();

  const origFetch = window.fetch;
  if (!origFetch) return;
  window.fetch = function () {
    const btn = last && Date.now() - last.at < WINDOW_MS && last.btn.isConnected ? last.btn : null;
    const p = origFetch.apply(this, arguments);
    if (!btn) return p;
    markBusy(btn);
    const done = function () { unmark(btn); };
    p.then(done, done);
    return p;
  };
})();
