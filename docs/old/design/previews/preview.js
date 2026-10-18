(function () {
  var root = document.documentElement;
  var q = new URLSearchParams(location.search);
  var dark = q.get('dark') === '1';
  try { if (!q.has('dark')) dark = localStorage.getItem('pv-dark') === '1'; } catch { /* localStorage may be unavailable in embedded previews. */ }
  if (q.get('embed') === '1') root.classList.add('pv-embed');
  function apply(d) { root.classList.toggle('dark', d); var b = document.getElementById('pv-dark'); if (b) b.textContent = d ? 'Modo claro' : 'Modo oscuro'; }
  apply(dark);
  window.addEventListener('message', function (e) { if (e.data && typeof e.data.pvDark === 'boolean') apply(e.data.pvDark); });
  function track() {
    var bar = document.querySelector('.pv-bar'), note = document.querySelector('.pv-note');
    var el = note && note.previousElementSibling === bar ? note : bar;
    var b = el && el.offsetParent !== null ? Math.max(0, el.getBoundingClientRect().bottom) : 0;
    root.style.setProperty('--pv-top', b + 'px');
  }
  window.addEventListener('scroll', track, { passive: true });
  window.addEventListener('resize', track);
  window.addEventListener('DOMContentLoaded', function () {
    track();
    var bd = document.getElementById('pv-dark'), bm = document.getElementById('pv-mobile');
    apply(root.classList.contains('dark'));
    if (bd) bd.onclick = function () {
      var d = !root.classList.contains('dark'); apply(d);
      try { localStorage.setItem('pv-dark', d ? '1' : '0'); } catch { /* localStorage may be unavailable in embedded previews. */ }
      var f = document.querySelector('.pv-device iframe'); if (f) f.contentWindow.postMessage({ pvDark: d }, '*');
    };
    if (bm) bm.onclick = function () {
      var on = !document.body.classList.contains('pv-mobile');
      document.body.classList.toggle('pv-mobile', on);
      bm.textContent = on ? 'Vista escritorio' : 'Vista móvil (390px)';
      var dev = document.querySelector('.pv-device');
      if (on && !dev.firstChild) {
        var f = document.createElement('iframe');
        f.src = location.pathname + '?embed=1&dark=' + (root.classList.contains('dark') ? 1 : 0);
        f.title = 'Vista móvil'; dev.appendChild(f);
      }
    };
  });
})();
(function () {
  function menus() { return Array.prototype.slice.call(document.querySelectorAll('.pv-menu')); }
  document.addEventListener('click', function (e) { menus().forEach(function (m) { if (!m.contains(e.target)) m.removeAttribute('open'); }); });
  document.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('pv-menu') && e.target.open) menus().forEach(function (m) { if (m !== e.target) m.removeAttribute('open'); }); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menus().forEach(function (m) { m.removeAttribute('open'); }); });
})();
