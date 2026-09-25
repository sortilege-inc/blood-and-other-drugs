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
  function groupedTab(tab, title, key, lede) {
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
      if (!list(tab).length) return p.appendChild(empty('written'));
      groups(list(tab), key).forEach((g) => {
        if (g.name) p.appendChild(el('h4', { class: 'blood-group' }, [g.name]));
        p.appendChild(el('ul', { class: 'blood-toc' }, g.pages.map((y) => el('li', {}, [el('a', { href: ctx.href(tab, [y.slug]) }, [y.name])]))));
      });
    };
  }

  const tabs = window.VttSiteTabs = window.VttSiteTabs || [];
  tabs.unshift(
    { id: 'home', label: CFG.title || 'Home', render: renderHome, group: 'campaign' },
    { id: 'city', label: 'The City', render: groupedTab('city', 'The City', 'region', 'Toronto by night: who holds what, and where the coterie goes.'), group: 'campaign' },
    { id: 'coterie', label: 'The Coterie', render: renderCoterie, group: 'campaign' },
    { id: 'people', label: 'Dramatis Personae', render: renderPeople, group: 'campaign' },
    { id: 'chronicle', label: 'The Chronicle', render: renderChronicle, group: 'campaign' },
    { id: 'trade', label: 'The Trade', render: groupedTab('trade', 'The Trade', 'kind', 'Blood as a drug: what is made, who makes it, and what it costs.'), group: 'campaign' },
  );
})();
