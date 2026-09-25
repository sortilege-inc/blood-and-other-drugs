// campaign/site/site.js — Blood & Other Drugs' own tabs on the VTT's site, ahead of the books
// (PLAN.md O6, the shape of War of Princes): Home, The City, The Coterie, Dramatis Personae,
// The Chronicle, The Trade. Loaded at the `site` stage (engine/instance.js), after the system's
// tabs and before engine/site.js renders, so the chronicle's Home is the tab the site opens on.
// The prose is campaign/data/docs.js, built from campaign/docs/ by campaign/build/build_docs.py.
//
// Everything here is public, so it holds only what the coterie knows: a person is in Dramatis
// Personae once they have been met, and their page says what has been learned of them. What they
// really are is the Storyteller's, in the GM tabs on /gm/ — and no stat block is drawn here.
(function () {
  const { el } = window.VttRender;
  const CFG = window.VttConfig || {};
  const DOCS = window.BloodDocs || {};
  const Site = () => window.VttSite;

  // the band: the brand opens the chronicle, not the shelf
  document.querySelectorAll('a.brand').forEach((a) => a.setAttribute('href', '#home'));
  document.querySelectorAll('.brand-sub').forEach((n) => (n.textContent = 'a Vampire: The Masquerade chronicle · Toronto'));

  const list = (k) => DOCS[k] || [];
  const bySlug = (k, slug) => list(k).find((p) => p.slug === slug) || null;

  // A doc's HTML, its [[links]] routed through the site's own tabs.
  function prose(html, cls) {
    const box = el('div', { class: 'prose blood-prose' + (cls ? ' ' + cls : '') });
    box.innerHTML = html || '';
    box.querySelectorAll('a.doc-link').forEach((a) => {
      const tab = a.getAttribute('data-tab');
      if (tab) a.setAttribute('href', Site().href(tab, [a.getAttribute('data-slug')]));
    });
    return box;
  }
  const empty = (what) => el('div', { class: 'empty' }, ['Nothing ' + what + ' yet.']);
  const crumbs = (ctx, tab, title, name) => el('div', { class: 'crumbs' }, [el('a', { href: ctx.href(tab, []) }, [title]), ' › ', name]);
  const portrait = (src, name) => (src ? el('img', { class: 'blood-portrait', src, alt: name || '' }) : null);
  const meta = (bits) => el('div', { class: 'entity-sub' }, [bits.filter(Boolean).join(' · ')]);
  // groups in the order their first page appears (the file names set the order)
  function groups(pages, key) {
    const out = [];
    pages.forEach((p) => {
      const g = p[key] || '';
      let grp = out.find((x) => x.name === g);
      if (!grp) out.push((grp = { name: g, pages: [] }));
      grp.pages.push(p);
    });
    return out;
  }
  const page = (container) => { const p = el('div', { class: 'page blood-page' }); container.appendChild(p); return p; };
  const reader = (kids, cls) => el('div', { class: 'site-reader solo' + (cls ? ' ' + cls : '') }, kids);

  // ── Home ────────────────────────────────────────────────────────────
  const SECTIONS = [
    ['city', 'The City', (n) => n('city', 'place', 'places')],
    ['coterie', 'The Coterie', (n) => n('coterie', 'of them', 'of them')],
    ['people', 'Dramatis Personae', (n) => n('people', 'person met', 'people met')],
    ['chronicle', 'The Chronicle', (n) => n('chronicle', 'night', 'nights')],
    ['trade', 'The Trade', (n) => n('trade', 'entry', 'entries')],
  ];
  function renderHome(container, path, ctx) {
    const p = page(container);
    p.appendChild(el('div', { class: 'hero blood-hero' }, [
      el('div', { class: 'blood-title' }, [CFG.title || 'The chronicle']),
      el('p', { class: 'hero-sub' }, ['Toronto, by night. The thin-blooded, the trade, and what the old blood does about them.']),
    ]));
    if (DOCS.home && DOCS.home.html) {
      const body = prose(DOCS.home.html);
      const h1 = body.querySelector('h1');
      if (h1 && h1.textContent.trim() === (CFG.title || '').trim()) h1.remove();
      if (body.textContent.trim()) p.appendChild(reader([body], 'blood-home'));
    }
    const n = (k, one, many) => { const c = list(k).length; return c ? c + ' ' + (c === 1 ? one : many) : 'nothing yet'; };
    p.appendChild(el('div', { class: 'shelf blood-shelf' }, SECTIONS.map(([tab, title, sub]) =>
      el('a', { class: 'shelf-book blood-card', href: ctx.href(tab, []) }, [el('div', { class: 'shelf-title' }, [title]), el('div', { class: 'shelf-meta' }, [sub(n)])]))));
  }

  // ── The Chronicle ───────────────────────────────────────────────────
  function renderChronicle(container, path, ctx) {
    const p = page(container);
    const all = list('chronicle');
    const ch = path[0] && bySlug('chronicle', path[0]);
    if (ch) {
      const i = all.indexOf(ch);
      p.appendChild(crumbs(ctx, 'chronicle', 'The Chronicle', ch.title));
      p.appendChild(reader([
        ch.part ? el('div', { class: 'entity-sub blood-part' }, ['Part ' + ch.part]) : null,
        el('h2', { class: 'chapter-h' }, [ch.title]),
        meta([ch.date, ch.played ? 'played ' + ch.played : null]),
        prose(ch.html, 'blood-chapter'),
        el('div', { class: 'blood-paging' }, [
          i > 0 ? el('a', { href: ctx.href('chronicle', [all[i - 1].slug]) }, ['‹ ' + all[i - 1].title]) : el('span'),
          i < all.length - 1 ? el('a', { href: ctx.href('chronicle', [all[i + 1].slug]) }, [all[i + 1].title + ' ›']) : el('span'),
        ]),
      ]));
      return;
    }
    p.appendChild(el('h2', { class: 'chapter-h' }, ['The Chronicle']));
    if (!all.length) return p.appendChild(empty('told'));
    groups(all, 'part').forEach((g) => {
      if (g.name) p.appendChild(el('h4', { class: 'blood-group' }, ['Part ' + g.name]));
      p.appendChild(el('ol', { class: 'blood-toc' }, g.pages.map((x) => el('li', {}, [
        el('a', { href: ctx.href('chronicle', [x.slug]) }, [x.title]),
        el('span', { class: 'muted small' }, [' · ' + [x.played, x.date].filter(Boolean).join(' · ')]),
      ]))));
    });
  }

  // ── people: the Coterie and the Dramatis Personae ──────────────────
  function personCard(ctx, tab, x) {
    return el('a', { class: 'card blood-person', href: ctx.href(tab, [x.slug]) }, [
      x.portrait ? el('img', { class: 'blood-thumb', src: x.portrait, alt: '' }) : null,
      el('div', {}, [el('div', { class: 'card-name' }, [x.name]), el('div', { class: 'card-text' }, [[x.epithet, x.clan].filter(Boolean).join(' · ')])]),
    ]);
  }
  function personPage(container, ctx, tab, title, x, bits) {
    const p = page(container);
    p.appendChild(crumbs(ctx, tab, title, x.name));
    p.appendChild(reader([portrait(x.portrait, x.name), el('h2', { class: 'chapter-h' }, [x.name]), meta(bits), prose(x.html)], 'blood-person-page'));
  }
  function renderCoterie(container, path, ctx) {
    const x = path[0] && bySlug('coterie', path[0]);
    if (x) return personPage(container, ctx, 'coterie', 'The Coterie', x, [x.epithet, x.clan]);
    const p = page(container);
    p.appendChild(el('h2', { class: 'chapter-h' }, ['The Coterie']));
    if (!list('coterie').length) return p.appendChild(empty('written'));
    p.appendChild(el('div', { class: 'cards' }, list('coterie').map((y) => personCard(ctx, 'coterie', y))));
  }
  function renderPeople(container, path, ctx) {
    const x = path[0] && bySlug('people', path[0]);
    if (x) return personPage(container, ctx, 'people', 'Dramatis Personae', x, [x.epithet, x.circle, x.first ? 'first met: ' + x.first : null]);
    const p = page(container);
    p.appendChild(el('h2', { class: 'chapter-h' }, ['Dramatis Personae']));
    p.appendChild(el('p', { class: 'muted small' }, ['The people the coterie has met, and what it has learned of them.']));
    if (!list('people').length) return p.appendChild(empty('met'));
    groups(list('people'), 'circle').forEach((g) => {
      p.appendChild(el('h4', { class: 'blood-group' }, [g.name]));
      p.appendChild(el('div', { class: 'cards' }, g.pages.map((y) => personCard(ctx, 'people', y))));
    });
  }

  // ── The City and The Trade: pages grouped by region / kind ─────────
  function groupedTab(tab, title, key, lede, above) {
    return function (container, path, ctx) {
      const x = path[0] && bySlug(tab, path[0]);
      if (x) {
        const p = page(container);
        p.appendChild(crumbs(ctx, tab, title, x.name));
        p.appendChild(reader([portrait(x.portrait, x.name), el('h2', { class: 'chapter-h' }, [x.name]), meta([x[key]]), prose(x.html)], 'blood-person-page'));
        return;
      }
      const p = page(container);
      p.appendChild(el('h2', { class: 'chapter-h' }, [title]));
      p.appendChild(el('p', { class: 'muted small' }, [lede]));
      if (above) above(p, ctx);
      if (!list(tab).length) return p.appendChild(empty('written'));
      groups(list(tab), key).forEach((g) => {
        if (g.name) p.appendChild(el('h4', { class: 'blood-group' }, [g.name]));
        p.appendChild(el('ul', { class: 'blood-toc' }, g.pages.map((y) => el('li', {}, [el('a', { href: ctx.href(tab, [y.slug]) }, [y.name])]))));
      });
    };
  }


  // ── The City's map: YYZ by Night, the chronicle's Google map (campaign/data/map.js, built by
  // campaign/build/build_map.py). Who holds each neighbourhood, and the persons of interest on it.
  // Drawn as SVG from the map's own shapes and colours; no tiles, nothing fetched.
  const MAP = window.BloodMap || null;
  const SVG = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, kids) {
    const n = document.createElementNS(SVG, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => v != null && n.setAttribute(k, v));
    (kids || []).forEach((c) => n.appendChild(c));
    return n;
  }
  function cityMap(p, ctx) {
    if (!MAP || !MAP.hoods || !MAP.hoods.length) return;
    const fcol = Object.fromEntries(MAP.legend.factions.map((f) => [f.name, f.colour]));
    const pcol = Object.fromEntries(MAP.legend.people.map((f) => [f.key, f.colour]));
    const info = el('div', { class: 'blood-map-info', 'aria-live': 'polite' });
    const hint = () => { info.innerHTML = ''; info.appendChild(el('p', { class: 'muted small' }, ['Tap a neighbourhood to see who holds it, or a pin for a person of interest.'])); };
    const row = (k, v) => (v ? el('div', { class: 'blood-map-row' }, [el('span', { class: 'blood-map-k' }, [k]), el('span', {}, [v])]) : null);
    const hoodG = svg('g', { class: 'blood-map-hoods' });
    const pinG = svg('g', { class: 'blood-map-pins' });
    let picked = null;
    const pick = (node, fill) => {
      if (picked) picked.classList.remove('on');
      picked = node; if (node) node.classList.add('on');
      info.innerHTML = ''; fill();
    };
    MAP.hoods.forEach((h) => {
      const path = svg('path', { d: h.d, fill: fcol[h.faction] || '#999', 'fill-rule': 'evenodd', class: 'blood-hood', 'data-faction': h.faction }, [svg('title', {}, [document.createTextNode(h.name + ' · ' + h.faction)])]);
      path.addEventListener('click', () => pick(path, () => {
        info.appendChild(el('h4', { class: 'blood-map-name' }, [h.name]));
        info.appendChild(el('div', { class: 'blood-map-swatch-line' }, [el('span', { class: 'blood-swatch', style: 'background:' + (fcol[h.faction] || '#999') }), h.faction]));
        if (h.desc) info.appendChild(el('p', {}, [h.desc]));
        if (h.pop != null) info.appendChild(row('Kindred', String(h.pop)));
      }));
      hoodG.appendChild(path);
    });
    MAP.people.forEach((pp) => {
      const dot = svg('circle', { cx: pp.x, cy: pp.y, r: 6, fill: pcol[pp.faction || ''] || '#bdbdbd', class: 'blood-pin', tabindex: 0, role: 'button', 'aria-label': pp.name }, [svg('title', {}, [document.createTextNode(pp.name)])]);
      const show = () => pick(dot, () => {
        info.appendChild(el('h4', { class: 'blood-map-name' }, [pp.name]));
        [['', pp.description], ['Faction', pp.faction], ['Clan', pp.clan], ['Religion', pp.religion], ['Status', pp.status]].forEach(([k, v]) => {
          if (!v) return;
          info.appendChild(k ? row(k, v) : el('p', {}, [v]));
        });
        if (pp.page) info.appendChild(el('p', {}, [el('a', { class: 'doc-link', href: ctx.href('people', [pp.page]) }, ['In Dramatis Personae ›'])]));
      });
      dot.addEventListener('click', (e) => { e.stopPropagation(); show(); });
      dot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
      pinG.appendChild(dot);
    });
    const map = svg('svg', { viewBox: '0 0 ' + MAP.width + ' ' + MAP.height, class: 'blood-map-svg', role: 'img', 'aria-label': 'Map of Toronto by faction' }, [hoodG, pinG]);
    // zoom and pan: the buttons, the wheel, a drag. Pins shrink as it zooms, so a crowded
    // downtown comes apart instead of just getting bigger.
    const W = MAP.width, H = MAP.height;
    let vb = { x: 0, y: 0, w: W, h: H };
    const apply = () => {
      vb.w = Math.min(W, Math.max(W / 12, vb.w)); vb.h = vb.w * H / W;
      vb.x = Math.min(W - vb.w, Math.max(0, vb.x)); vb.y = Math.min(H - vb.h, Math.max(0, vb.y));
      map.setAttribute('viewBox', [vb.x, vb.y, vb.w, vb.h].map((n) => n.toFixed(1)).join(' '));
      const r = (6 * Math.sqrt(vb.w / W)).toFixed(2);
      pinG.querySelectorAll('circle').forEach((c) => c.setAttribute('r', r));
    };
    const zoom = (f, cx, cy) => {
      if (cx == null) { cx = vb.x + vb.w / 2; cy = vb.y + vb.h / 2; }
      vb = { x: cx - (cx - vb.x) * f, y: cy - (cy - vb.y) * f, w: vb.w * f, h: vb.h * f };
      apply();
    };
    const toMap = (e) => { const b = map.getBoundingClientRect(); return [vb.x + (e.clientX - b.left) / b.width * vb.w, vb.y + (e.clientY - b.top) / b.height * vb.h]; };
    map.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = toMap(e); zoom(e.deltaY > 0 ? 1.25 : 0.8, x, y); }, { passive: false });
    let drag = null, moved = false;
    map.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vb: { ...vb } }; moved = false; });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const b = map.getBoundingClientRect(), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      vb.x = drag.vb.x - dx / b.width * vb.w; vb.y = drag.vb.y - dy / b.height * vb.h; apply();
    });
    window.addEventListener('pointerup', () => { drag = null; });
    window.addEventListener('pointercancel', () => { drag = null; moved = false; });
    map.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    const zbtn = (label, title, fn) => { const b = el('button', { type: 'button', class: 'blood-zoom-btn', title, 'aria-label': title }, [label]); b.addEventListener('click', fn); return b; };
    const zoomBar = el('div', { class: 'blood-zoom' }, [
      zbtn('+', 'Zoom in', () => zoom(0.66)), zbtn('−', 'Zoom out', () => zoom(1.5)),
      zbtn('⟲', 'Whole city', () => { vb = { x: 0, y: 0, w: W, h: H }; apply(); }),
    ]);
    // the legend: a faction dims the rest; the pins can be hidden
    let only = null;
    const facts = MAP.legend.factions.map((f) => {
      const b = el('button', { type: 'button', class: 'blood-legend-item' }, [el('span', { class: 'blood-swatch', style: 'background:' + f.colour }), f.name + ' ', el('span', { class: 'muted' }, [String(f.count)])]);
      b.addEventListener('click', () => {
        only = only === f.name ? null : f.name;
        map.classList.toggle('filtered', !!only);
        hoodG.querySelectorAll('path').forEach((n) => n.classList.toggle('dim', !!only && n.getAttribute('data-faction') !== only));
        facts.forEach((x) => x.classList.toggle('on', x === b && !!only));
      });
      return b;
    });
    const toggle = el('input', { type: 'checkbox', checked: 'checked' });
    toggle.addEventListener('change', () => pinG.classList.toggle('hidden', !toggle.checked));
    const peopleKey = MAP.legend.people.map((g) => el('span', { class: 'blood-legend-item static' }, [el('span', { class: 'blood-swatch round', style: 'background:' + g.colour }), g.name + ' ', el('span', { class: 'muted' }, [String(g.count)])]));
    hint();
    p.appendChild(el('figure', { class: 'blood-map' }, [
      el('div', { class: 'blood-map-frame' }, [el('div', { class: 'blood-map-canvas' }, [map, zoomBar]), info]),
      el('div', { class: 'blood-legend' }, [el('h4', { class: 'blood-group' }, ['Who holds what'])].concat(facts)),
      el('div', { class: 'blood-legend' }, [el('h4', { class: 'blood-group' }, [el('label', {}, [toggle, ' Persons of interest'])])].concat(peopleKey)),
      el('figcaption', { class: 'muted small' }, [MAP.source + '.']),
    ]));
  }

  const tabs = window.VttSiteTabs = window.VttSiteTabs || [];
  tabs.unshift(
    { id: 'home', label: CFG.title || 'Home', render: renderHome, group: 'campaign' },
    { id: 'city', label: 'The City', render: groupedTab('city', 'The City', 'region', 'Toronto by night: who holds what, and where the coterie goes.', cityMap), group: 'campaign' },
    { id: 'coterie', label: 'The Coterie', render: renderCoterie, group: 'campaign' },
    { id: 'people', label: 'Dramatis Personae', render: renderPeople, group: 'campaign' },
    { id: 'chronicle', label: 'The Chronicle', render: renderChronicle, group: 'campaign' },
    { id: 'trade', label: 'The Trade', render: groupedTab('trade', 'The Trade', 'kind', 'Blood as a drug: what is made, who makes it, and what it costs.'), group: 'campaign' },
  );
})();
