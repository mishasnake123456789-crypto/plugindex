// Client-side search and filters for /plugins/. The static grid stays for crawlers and no-JS users.
(() => {
  const box = document.getElementById('filter');
  const out = document.getElementById('results');
  if (!box || !out) return;
  box.hidden = false;
  const q = document.getElementById('q'), fa = document.getElementById('fa'), fp = document.getElementById('fp');
  const params = new URLSearchParams(location.search);
  q.value = params.get('q') || '';
  fa.value = params.get('app') || '';
  fp.value = params.get('price') || '';
  const staticParts = [...document.querySelectorAll('main .grid, main .pager')];
  const prices = { free: 'Free', freemium: 'Free version', paid: 'Paid', subscription: 'Subscription', unknown: 'See website' };
  const apps = { 'after-effects': 'AE', 'premiere-pro': 'PR', 'davinci-resolve': 'DVR', 'cinema-4d': 'C4D', '3ds-max': 'MAX', blender: 'BL' };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hue = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h % 360; };
  const initials = n => esc((n || 'P').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'P');
  let data = [];

  function render() {
    const term = q.value.trim().toLowerCase();
    const active = term || fa.value || fp.value;
    staticParts.forEach(el => (el.hidden = !!active));
    const url = new URL(location.href);
    ['q', 'app', 'price'].forEach((k, i) => { const v = [q, fa, fp][i].value.trim(); v ? url.searchParams.set(k, v) : url.searchParams.delete(k); });
    history.replaceState(null, '', url);
    if (!active) { out.innerHTML = ''; return; }
    const hits = data.filter(p =>
      (!fa.value || p.a.includes(fa.value)) &&
      (!fp.value || p.p === fp.value) &&
      (!term || (p.n + ' ' + p.d + ' ' + p.u + ' ' + p.t.join(' ')).toLowerCase().includes(term)));
    out.innerHTML = `<p class="muted">Found: ${hits.length}</p><div class="grid">` + hits.slice(0, 200).map(p => {
      const chips = (p.a || []).slice(0, 3).map(a => `<a class="chip" href="/${a}/">${apps[a] || a}</a>`).join('');
      return `<article class="card" style="--h:${hue(p.n)}"><a class="card-link" href="/plugin/${p.s}/"><span class="mono" style="--h:${hue(p.n)}" aria-hidden="true">${initials(p.n)}</span><span class="card-title">${esc(p.n)}</span></a><p class="card-dev">${esc(p.d)}</p><p class="card-sum">${esc(p.u)}</p><div class="card-meta"><span class="badge price-${p.p}">${prices[p.p]}</span>${chips}</div></article>`;
    }).join('') + '</div>';
  }

  fetch('/assets/search-index.json').then(r => r.json()).then(d => { data = d; render(); });
  [q, fa, fp].forEach(el => el.addEventListener('input', render));
})();
