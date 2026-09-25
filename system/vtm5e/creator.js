// system/vtm5e/creator.js — making a character: the core rulebook's own Character Creation
// summary (the Session Zero sidebar, printed 136-137), walked step by step.
//
// The steps ARE the summary's paragraphs: each paragraph that opens in capitals ("CORE
// CONCEPT", "ATTRIBUTES", "SKILLS" … "SEA OF TIME") starts a step, and the paragraphs after
// it belong to it; the text is shown verbatim beside the step's controls. Every number the
// creator checks is PARSED from those sentences — "Take one Attribute at 4; three Attributes
// at 3; four Attributes at 2; one Attribute at 1", the three Skill distributions, "Put two
// dots in one and one dot in the other", "Spend 7 points on Advantages, and take 2 points of
// Flaws", "Select one to three Convictions", "Set your Humanity to 7" — so a corrected corpus
// corrects the creator. It counts and warns; it refuses nothing the book does not.
//
// The controls are the sheet's (system/vtm5e/sheet.js), over the ACTOR "Kindred" fields each
// step names. Which fields a step sets is this tool's (STEP_FIELDS); nothing else is.
//
// A second walk, where the Storyteller turns it on (campaign state creation.blackHand — only a
// player's page has a campaign): The Black Hand's Quick Character Creation (p. 107), whose steps
// are the headings under it, read the same way, making The Black Hand's ACTOR "Sabbat Kindred"
// (the Kindred and its Path of Enlightenment). A draft walks it exactly when it is a Sabbat
// character (Sheet.isSabbat).
window.VtmCreator = (function () {
  const { el, button, debounce } = window.VttRender;
  const D = window.VtmData;
  const E = window.VtmEntity;
  const Sheet = window.VtmSheet;
  const G = () => window.VtmCreatorGuides;

  const ROSTER = (window.VttConfig.storagePrefix || 'sortilege-vtt') + ':site:roster';

  // number words as the summary spells them
  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const num = (w) => (/^\d+$/.test(w) ? +w : WORDS[String(w).toLowerCase()]);

  // A step's fields on the sheet (the tool's mapping from the summary's headings to the
  // ACTOR's labels); a step with a group key takes a whole kind of field.
  const STEP_FIELDS = {
    'CORE CONCEPT': ['Name', 'Concept', 'Chronicle', 'Ambition', 'Desire'],
    'CLAN AND SIRE': ['Clan', 'Sire', 'Clan Bane'],
    ATTRIBUTES: ['@attributes'],
    SKILLS: ['@skills', 'Specialties'],
    DISCIPLINES: ['Disciplines'],
    PREDATOR: ['Predator'],
    ADVANTAGES: ['Advantages & Flaws'],
    'CONVICTIONS AND TOUCHSTONES': ['Touchstones & Convictions', 'Chronicle Tenets', 'Humanity'],
    'SEA OF TIME': ['Generation', 'Blood Potency', 'Total Experience', 'Spent Experience'],
    'PATH OF ENLIGHTENMENT': ['Path of Enlightenment', 'Touchstones & Convictions', 'Chronicle Tenets', 'Humanity'],
  };
  // The Black Hand's steps, each the core step it corresponds to (its checks and fields); shown
  // under the book's own heading
  const BH_STEP = { 'Core Concept': 'CORE CONCEPT', Clan: 'CLAN AND SIRE', Attributes: 'ATTRIBUTES', Skills: 'SKILLS', Disciplines: 'DISCIPLINES',
    'Path of Enlightenment': 'PATH OF ENLIGHTENMENT', 'Predator Type': 'PREDATOR', Advantages: 'ADVANTAGES', 'Years Dead': 'SEA OF TIME' };
  const BH_BOOK = 'black-hand';

  // ── the summary, read from the core ──
  function summaryParas() {
    const core = D.all(['core']).filter((e) => /core-characters/.test(e.file));
    const texts = [];
    core.forEach((e) => (e.guidance || []).forEach((g) => { if (g.text) texts.push(g.text); }));
    const start = texts.findIndex((t) => /^CORE CONCEPT\b/.test(t));
    if (start === -1) return [];
    const paras = [];
    for (let i = start; i < texts.length; i++) {
      texts[i].split(/\n\s*\n/).forEach((p, j) => {
        p = p.trim();
        // a word the page break split ("Preda-" | "tor type."): one paragraph, as printed
        if (j === 0 && paras.length && /[a-z]-$/.test(paras[paras.length - 1]) && /^[a-z]/.test(p)) paras[paras.length - 1] = paras[paras.length - 1].slice(0, -1) + p;
        else paras.push(p);
      });
      if (paras.some((p) => /^SEA OF TIME\b/.test(p)) && /Each player spends 35|experience points\.?$/.test(texts[i])) break;
      if (i > start + 4) break;
    }
    return paras.filter(Boolean);
  }
  function steps() {   // the core's walk
    const out = [];
    summaryParas().forEach((p) => {
      const m = /^([A-Z][A-Z ]{3,}[A-Z])\b\s*(.*)$/s.exec(p);
      if (m && STEP_FIELDS[m[1].trim()] !== undefined) out.push({ key: m[1].trim(), paras: [m[2] || ''] });
      else if (out.length) out[out.length - 1].paras.push(p);
    });
    return out.map((s) => Object.assign(s, { text: s.paras.filter(Boolean).join('\n\n') }));
  }
  // The Black Hand's walk: the headings under its "Quick Character Creation", each with its
  // sentence, its list (Skills' distributions, the Predator's grants) and its printed options
  // (Years Dead's Childer / Neonates / Ancillae) as the paragraphs the checks read
  function bhSteps() {
    const q = D.loaded(BH_BOOK) ? D.all([BH_BOOK]).find((e) => e.name === 'Quick Character Creation') : null;
    if (!q) return [];
    return D.children(q.id).filter((k) => BH_STEP[k.name]).map((k) => {
      const paras = [k.desc || ''].concat((D.val(k, 'Items') || []).map((x) => (x && typeof x === 'object' ? x.value : x)))
        .concat((k.props || []).filter((x) => x.vk === 'scalar').map((x) => x.name + ': ' + x.value)).filter(Boolean);
      return { key: BH_STEP[k.name], label: k.name, entity: k, paras, text: paras.join('\n\n') };
    });
  }
  const walkOf = (v) => (Sheet.isSabbat(v) ? bhSteps() : steps());

  // ── what the sentences say ──
  function attributeSpread(text) {
    const out = {};
    let m;
    const re = /(\w+) Attributes? at (\d)/g;
    while ((m = re.exec(text))) out[m[2]] = (out[m[2]] || 0) + num(m[1]);
    return out;                                           // { "4": 1, "3": 3, "2": 4, "1": 1 }
  }
  function skillDistributions(paras) {
    const out = [];
    paras.forEach((p) => {
      const m = /^([a-z][a-z ]+):\s*(.+)$/i.exec(p);
      if (!m) return;
      const spread = {};
      let x;
      const re = /(\w+) Skills? at (\d)/g;
      while ((x = re.exec(m[2]))) spread[x[2]] = (spread[x[2]] || 0) + num(x[1]);
      if (Object.keys(spread).length) out.push({ name: m[1].trim(), text: p, spread });
    });
    return out;
  }
  function freeSpecialties(text) {
    const m = /free specialties to ([^.]+?) Skills/.exec(text);
    const named = m ? m[1].split(/,\s*|\s+and\s+/).map((x) => x.replace(/^and\s+/, '').trim()).filter(Boolean) : [];
    const more = /Take (\w+) more free specialty/.exec(text);
    return { named, more: more ? num(more[1]) : 0 };
  }
  function disciplineDots(text) {
    const m = /Put (\w+) dots in one and (\w+) dot in the other/.exec(text);
    return m ? [num(m[1]), num(m[2])] : null;
  }
  function advantagePoints(text) {
    const m = /Spend (\d+) points on Advantages, and take (\d+) points of Flaws/.exec(text);
    return m ? { advantages: +m[1], flaws: +m[2] } : null;
  }
  function convictions(text) {
    const m = /(?:Select|and) (\w+) to (\w+) Convictions/.exec(text);   // the core: "Select one to three"; The Black Hand: "…and one to three Convictions"
    const h = /Set your Humanity to (\d+)/.exec(text);
    return { min: m ? num(m[1]) : null, max: m ? num(m[2]) : null, humanity: h ? +h[1] : null };
  }

  // ── the book behind the picks ──
  // clans and their in-clan Disciplines: VtmData's (shared with Advancement)
  const clans = () => D.clans();
  const clanNamed = (name) => clans().find((c) => c.name === name) || null;
  const clanDisciplines = (name) => D.clanDisciplines(name);
  // Caitiff and thin-bloods: the core's own chapters (VtmData.clanless); a thin-blood has no bane
  const clanlessNamed = (name) => D.clanless().find((c) => c.name === name) || null;
  const isThin = (v) => /^thin-?blood/i.test(v.Clan || '');
  function clanBane(name) {
    const cl = clanlessNamed(name);
    if (cl) return cl.bane ? cl.bane.desc : '';
    const c = clanNamed(name);
    const b = c && D.children(c.entity.id).find((k) => k.name === 'Bane');
    return b ? b.desc : null;
  }
  // a sentence the core prints outside the summary (the step-by-step chapter), found by its words
  const sentences = {};
  function bookSentence(key, re) {
    if (!(key in sentences)) {
      let hit = null;
      D.all(['core']).some((e) => { const m = re.exec(e.desc || ''); if (m) hit = m[0].trim(); return !!m; });
      sentences[key] = hit;
    }
    return sentences[key];
  }
  const noPredator = () => bookSentence('predator', /[^.]*\bdo not select a Predator type[^.]*\./);
  const lackingSkill = () => bookSentence('lacking', /If a Predator type adds a specialty for which you lack the matching Skill[^.]*\./);
  const thinForbidden = () => bookSentence('forbidden', /No thin-blood can buy [^.]*during character creation\./);
  // Predator types: the headings under a "Predator Types" section (core, Players Guide)
  // that print their grants (an Items list: "Add a specialty…", "Gain one dot of…"). The
  // Players Guide's summary sheet also heads a "Predator Types" of one-line reminders
  // ("Alleycat:"), and a notes sidebar sits among the types; neither prints grants.
  function predators(v) {
    const out = [];
    // a Sabbat character picks from The Black Hand's ("Pick your Sabbat Predator type (see pg. 24)")
    D.all(v && Sheet.isSabbat(v) ? [BH_BOOK] : ['core', 'players-guide']).forEach((e) => {
      if (e.name !== 'Predator Types') return;
      D.children(e.id).forEach((k) => {
        if ((k.props || []).some((p) => p.name === 'Items') && !out.some((p) => p.name === k.name)) out.push({ name: k.name, entity: k });
      });
    });
    return out;
  }

  // The Paths of Enlightenment: every heading on the third-party shelf that carries a "Path
  // Compulsion" (The Black Hand's five, and a homebrew Path written on its template)
  function paths() {
    return D.all(['black-hand', 'sunburners'].filter((b) => D.loaded(b))).filter((e) => (e.props || []).some((x) => x.name === 'Path Compulsion'))
      .map((e) => ({ name: e.name, entity: e, book: e.book }));
  }

  // ── the roster: drafts in this browser ──
  function load() { try { return JSON.parse(localStorage.getItem(ROSTER) || '{"current":null,"drafts":{}}'); } catch (e) { return { current: null, drafts: {} }; } }
  function save(r) { try { localStorage.setItem(ROSTER, JSON.stringify(r)); } catch (e) { /* no storage */ } }
  const newId = () => 'draft-' + Math.random().toString(36).slice(2, 9);

  // ── the walk ──
  let stepIndex = 0;
  let opts = {};
  // o (a player's page): { blackHand: the Storyteller allows The Black Hand's walk, done(values):
  // the button that takes the character to the table }
  function render(container, path, ctx, o) {
    opts = o || {};
    const page = el('div', { class: 'page creator' });
    container.appendChild(page);
    page.appendChild(el('div', { class: 'loading' }, ['Opening the Core Rulebook and the Players Guide…']));
    const sabbatDraft = Object.values(load().drafts || {}).some((d) => Sheet.isSabbat(d));
    const books = Sheet.BOOKS.concat(['players-guide'], opts.blackHand || sabbatDraft ? [BH_BOOK, 'sunburners'].filter((b) => D.books().some((x) => x.id === b)) : []);
    D.ready(books).then(() => { page.innerHTML = ''; draw(page); });
  }

  // The page is rebuilt on every edit so the checks and derived values follow the draft; a rebuild
  // replaces the box being typed in, so the focused field is found again by its place among the
  // page's fields and given back its caret, and the scroll stays put.
  function keepFocus(page, rebuild) {
    const fields = () => Array.from(page.querySelectorAll('input, textarea, select'));
    const a = document.activeElement;
    const i = a && page.contains(a) ? fields().indexOf(a) : -1;
    const sel = i !== -1 && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
    const y = window.scrollY;
    rebuild();
    window.scrollTo(0, y);
    const b = i === -1 ? null : fields()[i];
    if (!b || b.tagName !== a.tagName || b.type !== a.type) return;
    b.focus({ preventScroll: true });
    if (sel) b.setSelectionRange(sel[0], sel[1]);
    else if (b.type === 'number') { b.type = 'text'; b.setSelectionRange(b.value.length, b.value.length); b.type = 'number'; } // a number box hides its caret: put it at the end
  }

  const draw = (page) => keepFocus(page, () => drawNow(page));
  function drawNow(page) {
    const roster = load();
    if (!roster.current || !roster.drafts[roster.current]) {
      const id = newId();
      roster.drafts[id] = Sheet.blank();
      roster.current = id;
      save(roster);
    }
    const v = roster.drafts[roster.current];
    const st = walkOf(v);
    if (Sheet.isSabbat(v) && !D.loaded(BH_BOOK)) {
      page.innerHTML = '';
      page.appendChild(el('div', { class: 'loading' }, ['Opening The Black Hand…']));
      D.ready([BH_BOOK]).then(() => draw(page));
      return;
    }
    const commit = (nv) => { roster.drafts[roster.current] = nv; save(roster); };
    // the creator's own bookkeeping for this draft (the chosen distribution, the Predator's applied
    // grants), kept beside it in the roster, never in the character
    roster.meta = roster.meta || {};
    const meta = roster.meta[roster.current] || {};
    const setMeta = (patch, values) => {
      roster.meta[roster.current] = Object.assign({}, meta, patch);
      if (values) roster.drafts[roster.current] = Object.assign({}, v, values);
      save(roster);
      draw(page);
    };
    page.innerHTML = '';
    page.appendChild(el('h2', { class: 'chapter-h' }, ['Making a character']));
    // the roster
    page.appendChild(el('div', { class: 'chiprow' }, [
      el('select', { class: 'scope', onchange: (ev) => { roster.current = ev.target.value; save(roster); draw(page); } },
        Object.keys(roster.drafts).map((id) => el('option', { value: id, selected: id === roster.current || null }, [(roster.drafts[id].Name || 'An unnamed Kindred') + (Sheet.isSabbat(roster.drafts[id]) ? ' · Sabbat' : '')]))),
      button('New character', () => { const id = newId(); roster.drafts[id] = Sheet.blank(); roster.current = id; save(roster); stepIndex = 0; draw(page); }, 'ghost tiny'),
      opts.done ? button('Take this character to the table', () => opts.done(v), 'tiny') : null,
      button('Download character file', () => Sheet.download(Sheet.fileOf(v, { hunger: +v.Hunger || 0 }), v.Name), 'tiny'),
      button('Remove', () => { if (confirm('Remove ' + (v.Name || 'this character') + ' from this browser?')) { delete roster.drafts[roster.current]; delete roster.meta[roster.current]; roster.current = Object.keys(roster.drafts)[0] || null; save(roster); draw(page); } }, 'ghost tiny'),
    ]));
    page.appendChild(rulesChoice(v, (sabbat) => {
      const nv = Object.assign({}, v);
      if (sabbat) nv['Path of Enlightenment'] = '';
      else {
        if (v['Path of Enlightenment'] && !confirm('Make ' + (v.Name || 'this character') + ' a core character? Their Path of Enlightenment (' + v['Path of Enlightenment'] + ') is cleared.')) return;
        delete nv['Path of Enlightenment'];
      }
      roster.drafts[roster.current] = nv;
      save(roster);
      stepIndex = 0;
      draw(page);
    }));
    if (!st.length) {
      page.appendChild(el('div', { class: 'empty' }, [Sheet.isSabbat(v) ? 'The Black Hand’s Quick Character Creation was not found in the data.' : 'The core’s Character Creation summary was not found in the data.']));
      return;
    }
    if (stepIndex >= st.length) stepIndex = 0;
    // the step list
    page.appendChild(el('ol', { class: 'steps' }, st.map((s, i) => el('li', { class: i === stepIndex ? 'active' : '' }, [
      el('button', { type: 'button', class: 'ref', onclick: () => { stepIndex = i; draw(page); } }, [s.label || s.key]),
      el('span', { class: 'step-flag' }, [checks(s, v, meta).some((c) => !c.ok) ? '•' : '✓']),
    ]))));
    const s = st[stepIndex];
    const side = el('aside', { class: 'creator-book' }, [el('div', { class: 'group-h' }, [s.label || s.key]), s.entity ? E.render(s.entity, { noKids: true }) : E.prose(s.text)]);
    const main = el('div', { class: 'creator-step' });
    main.appendChild(stepControls(s, v, (nv) => { commit(nv); draw(page); }, meta, setMeta));
    const cs = checks(s, v, meta);
    if (cs.length) main.appendChild(el('ul', { class: 'checks' }, cs.map((c) => el('li', { class: c.ok ? 'ok' : 'warn' }, [c.text]))));
    main.appendChild(el('div', { class: 'chiprow' }, [
      stepIndex > 0 ? button('← ' + (st[stepIndex - 1].label || st[stepIndex - 1].key), () => { stepIndex--; draw(page); }, 'ghost tiny') : null,
      stepIndex < st.length - 1 ? button((st[stepIndex + 1].label || st[stepIndex + 1].key) + ' →', () => { stepIndex++; draw(page); }, 'tiny') : null,
    ]));
    page.appendChild(el('div', { class: 'creator-cols' }, [main, side]));
    page.appendChild(el('details', { class: 'sheet-details' }, [el('summary', {}, ['The whole sheet']), Sheet.render(v, { edit: (nv) => commit(nv) })]));
  }

  // Which rules this character is made by. Where the Storyteller allows The Black Hand (a player's
  // page), the choice is on screen for every draft; elsewhere the page says where it is made.
  function rulesChoice(v, choose) {
    const bh = D.books().find((b) => b.id === BH_BOOK);
    if (!bh) return el('span', {});
    const sabbat = Sheet.isSabbat(v);
    if (opts.blackHand && D.loaded(BH_BOOK)) {
      const card = (on, title, sub, pickIt) => el('button', { type: 'button', class: 'dist-card' + (on ? ' on' : ''), onclick: () => { if (!on) pickIt(); } }, [el('div', { class: 'dist-name' }, [title]), el('div', { class: 'small' }, [sub])]);
      return el('div', { class: 'rules-choice' }, [
        el('div', { class: 'prop-k' }, ['Rules for this character']),
        el('div', { class: 'dist-cards' }, [
          card(!sabbat, 'Core Rulebook', 'Character Creation, the summary: a Kindred of the Camarilla, the Anarchs or neither', () => choose(false)),
          card(sabbat, bh.label, 'Quick Character Creation (p. 107): a Sabbat character on a Path of Enlightenment', () => choose(true)),
        ]),
      ]);
    }
    if (sabbat) return el('p', { class: 'muted small' }, ['A Sabbat character, made with ' + bh.label + '’s Quick Character Creation.']);
    return el('p', { class: 'muted small rules-note' }, opts.where === 'play'
      ? [opts.joined ? 'Sabbat characters (' + bh.label + ') are offered here when your Storyteller allows them, in the Loresheets panel.' : 'Sabbat characters (' + bh.label + ') are offered here once you have joined, if your Storyteller allows them.']
      : ['Making a Sabbat character with ' + bh.label + '? That is done on the ', el('a', { href: 'gm/play.html' }, ['player’s page']), ', once you have joined a table whose Storyteller allows it.']);
  }

  // the controls for one step: the sheet's own, restricted to the step's fields
  function stepControls(s, v, commit, meta, setMeta) {
    const box = el('div', {});
    const names = [];
    (STEP_FIELDS[s.key] || []).forEach((f) => {
      if (f === '@attributes') names.push.apply(names, Sheet.attributes());
      else if (f === '@skills') names.push.apply(names, Sheet.skills());
      else names.push(f);
    });
    const sub = {};
    names.forEach((n) => { sub[n] = v[n]; });
    const set = (nv) => commit(Object.assign({}, v, nv, derivedFor(s, Object.assign({}, v, nv))));
    const ctx = { v, meta: meta || {}, set, setMeta: (m, values) => setMeta(m, values ? Object.assign({}, values, derivedFor(s, Object.assign({}, v, values))) : null) };
    const hidden = [];   // the step's fields a guide draws instead of the sheet
    if (s.key === 'ATTRIBUTES' && G()) {
      box.appendChild(G().allocator(Sheet.attributes(), v, attributeSpread(s.text), 1, set, 'Attributes'));
      hidden.push.apply(hidden, Sheet.attributes());
    }
    if (s.key === 'SKILLS' && G()) {
      box.appendChild(G().skills(ctx, skillDistributions(s.paras), freeSpecialties(s.text)));
      hidden.push.apply(hidden, Sheet.skills());
    }
    const pv = G() ? G().fromPredator(ctx.meta) : { humanity: 0, potency: 0, advantages: [] };
    if ((s.key === 'CONVICTIONS AND TOUCHSTONES' || s.key === 'PATH OF ENLIGHTENMENT') && convictions(s.text).humanity != null) {
      const h = convictions(s.text).humanity + pv.humanity;
      if (+v.Humanity !== h) box.appendChild(el('div', { class: 'chiprow tight' }, [button('Set Humanity to ' + h, () => set({ Humanity: h }), 'tiny'),
        pv.humanity ? el('span', { class: 'muted small' }, [convictions(s.text).humanity + ', ' + (pv.humanity > 0 ? 'plus ' : 'less ') + Math.abs(pv.humanity) + ' from your Predator type']) : null]));
    }
    if (s.key === 'SEA OF TIME' && pv.potency) box.appendChild(el('p', { class: 'small' }, ['Your Predator type adds ' + pv.potency + ' to the Blood Potency the Sea of Time gives.']));
    // the step's own picks from the book
    if (s.key === 'CLAN AND SIRE') {
      const cl = clans();
      box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Clan']), el('div', { class: 'prop-v' }, [
        el('select', { class: 'scope', onchange: (ev) => { const b = clanBane(ev.target.value); set({ Clan: ev.target.value, 'Clan Bane': b != null ? b : v['Clan Bane'] }); } },
          [el('option', { value: '' }, ['—'])].concat(cl.map((c) => el('option', { value: c.name, selected: c.name === v.Clan || null }, [c.name + ' (' + (D.indexBook(c.book) || {}).label + ')'])))
            .concat(D.clanless().length ? [el('optgroup', { label: 'Without a clan' }, D.clanless().map((c) => el('option', { value: c.name, selected: c.name === v.Clan || null }, [c.name + ' (' + (D.indexBook(c.book) || {}).label + ')'])))] : [])),
        v.Clan && clanDisciplines(v.Clan).length ? el('div', { class: 'muted small' }, ['Clan Disciplines: ' + clanDisciplines(v.Clan).join(', ')]) : null,
        clanlessNamed(v.Clan) ? el('div', { class: 'small' }, clanlessNamed(v.Clan).about.map((a) => el('div', {}, [el('div', { class: 'prop-k' }, [a.name]), E.prose(a.desc)]))) : null,
      ])]));
    }
    if (s.key === 'PATH OF ENLIGHTENMENT') {
      const ps = paths();
      const cur = ps.find((x) => x.name === v['Path of Enlightenment']);
      box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Path of Enlightenment']), el('div', { class: 'prop-v' }, [
        el('select', { class: 'scope', onchange: (ev) => set({ 'Path of Enlightenment': ev.target.value }) }, [el('option', { value: '' }, ['—'])]
          .concat(ps.map((x) => el('option', { value: x.name, selected: x.name === v['Path of Enlightenment'] || null }, [x.name + ' (' + ((D.indexBook(x.book) || {}).label || x.book) + ')'])))),
      ])]));
      if (cur) box.appendChild(el('details', { class: 'paper' }, [el('summary', {}, [cur.name + ', as printed']), E.render(cur.entity, { noKids: true })]));
    }
    if (s.key === 'PREDATOR' && G()) {
      box.appendChild(G().predator(ctx, predators(v), lackingSkill()));
      const cur = predators(v).find((p) => p.name === v.Predator);
      if (cur) box.appendChild(el('details', { class: 'paper' }, [el('summary', {}, [cur.name + ', as printed']), E.render(cur.entity, { noKids: true })]));
    }
    if (s.key === 'ADVANTAGES' && isThin(v)) {
      const tb = D.thinBloodTraits();
      const rows = v['Advantages & Flaws'] || [];
      const has = (n, flaw) => rows.some((r) => r.Name === n && !!r.Flaw === flaw);
      const toggle = (n, flaw) => set({ 'Advantages & Flaws': has(n, flaw) ? rows.filter((r) => !(r.Name === n && !!r.Flaw === flaw)) : rows.concat([{ Name: n, Dots: 0, Flaw: flaw }]) });
      const chips = (list, flaw) => el('div', { class: 'chiprow tight' }, list.map((t) => { const b = button(t.name + (has(t.name, flaw) ? ' ✓' : ''), () => toggle(t.name, flaw), has(t.name, flaw) ? 'tiny' : 'ghost tiny'); b.title = t.text || ''; return b; }));
      if (tb.entity) box.appendChild(el('div', { class: 'muted small' }, [tb.entity.desc]));
      box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Thin-blood Merits']), el('div', { class: 'prop-v' }, [chips(tb.merits, false)])]));
      box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Thin-blood Flaws']), el('div', { class: 'prop-v' }, [chips(tb.flaws, true)])]));
    }
    // the sheet's fields for the step (Clan/Predator/Path drawn above as picks; Attributes and Skills by the guides)
    const shown = names.filter((n) => hidden.indexOf(n) === -1 && !(s.key === 'CLAN AND SIRE' && n === 'Clan') && !(s.key === 'PREDATOR' && n === 'Predator') && !(s.key === 'PATH OF ENLIGHTENMENT' && n === 'Path of Enlightenment'));
    if (s.key === 'SKILLS' && shown.length) box.appendChild(el('div', { class: 'prop-k' }, ['Every specialty']));
    const full = Object.assign({}, v);
    const part = Sheet.render(full, { edit: (nv) => set(pick(nv, shown)), only: shown });
    box.appendChild(part);
    return box;
  }
  const pick = (o, keys) => keys.reduce((a, k) => { a[k] = o[k]; return a; }, {});

  // values a step fills in from the book when its fields change
  function derivedFor(s, v) {
    const out = {};
    if (s.key === 'ATTRIBUTES') {
      const d = Sheet.derived(v);
      out.Health = d.Health;
      out.Willpower = d.Willpower;
    }
    return out;
  }

  // what the step's sentences ask, against the draft
  function checks(s, v, meta) {
    const out = [];
    const pv = G() ? G().fromPredator(meta || {}) : { humanity: 0, potency: 0, advantages: [] };
    const count = (fields, min) => {
      const c = {};
      fields.forEach((f) => { const n = +v[f] || 0; if (n > min) c[n] = (c[n] || 0) + 1; });
      return c;
    };
    const spreadText = (sp) => Object.keys(sp).sort().reverse().map((k) => sp[k] + ' at ' + k).join(', ');
    const same = (a, b) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k]]));
    if (s.key === 'CORE CONCEPT') out.push({ ok: !!v.Name, text: v.Name ? 'Named ' + v.Name : 'A name is required (the sheet declares it so).' });
    if (s.key === 'CLAN AND SIRE') out.push({ ok: !!v.Clan, text: v.Clan ? 'Clan: ' + v.Clan : 'Pick a clan.' });
    if (s.key === 'ATTRIBUTES') {
      const want = attributeSpread(s.text);
      const have = count(Sheet.attributes(), 0);
      out.push({ ok: same(want, have), text: 'The book: ' + spreadText(want) + '. This sheet: ' + (spreadText(have) || 'none set') + '.' });
      const d = Sheet.derived(v);
      out.push({ ok: true, text: 'Health ' + d.Health + ' (' + Sheet.HEALTH_FROM.join(' + ') + '), Willpower ' + d.Willpower + ' (' + Sheet.WILLPOWER_FROM.join(' + ') + ').' });
    }
    if (s.key === 'SKILLS') {
      const have = count(Sheet.skills(), 0);
      const ds = skillDistributions(s.paras);
      const chosen = ds.find((d) => d.name === (meta || {}).skillDist);
      if (chosen) out.push({ ok: same(chosen.spread, have), text: chosen.name + ': ' + spreadText(chosen.spread) + '. This sheet: ' + (spreadText(have) || 'none set') + '.' });
      else {
        const match = ds.find((d) => same(d.spread, have));
        out.push({ ok: !!match, text: match ? 'Matches ' + match.name + '.' : 'Choose a distribution: ' + ds.map((d) => d.name).join(', ') + '.' });
      }
      const fs = freeSpecialties(s.text);
      const specs = (v.Specialties || []).filter((x) => x.Specialty).map((x) => x.Skill);
      const missing = fs.named.filter((n) => (+v[n] || 0) > 0 && specs.indexOf(n) === -1);
      out.push({ ok: !missing.length, text: 'Free specialties for ' + fs.named.join(', ') + (fs.more ? ', and ' + fs.more + ' more' : '') + (missing.length ? ' — still to add: ' + missing.join(', ') : '') + '.' });
    }
    if (s.key === 'DISCIPLINES' && isThin(v)) {
      const none = /Thin-blood(?: character)?s have no (?:intrinsic )?Disciplines\./.exec(s.text);
      const extra = (v.Disciplines || []).filter((d) => (+d.Dots || 0) > 0 && d.Discipline !== 'Thin-Blood Alchemy').map((d) => d.Discipline);
      if (none) out.push({ ok: !extra.length, text: none[0] + (extra.length ? ' This sheet: ' + extra.join(', ') + '.' : '') });
    } else if (s.key === 'DISCIPLINES') {
      const want = disciplineDots(s.text);
      const have = (v.Disciplines || []).map((d) => +d.Dots || 0).sort().reverse();
      if (want) out.push({ ok: JSON.stringify(have) === JSON.stringify(want.slice().sort().reverse()), text: 'The book: ' + want.join(' and ') + ' dots. This sheet: ' + (have.join(' and ') || 'none') + '.' });
      if (v.Clan && clanDisciplines(v.Clan).length) {
        const off = (v.Disciplines || []).filter((d) => d.Discipline && clanDisciplines(v.Clan).indexOf(d.Discipline) === -1).map((d) => d.Discipline);
        out.push({ ok: !off.length || /Caitiff/.test(v.Clan), text: off.length ? off.join(', ') + ' is not among ' + v.Clan + '’s ' + clanDisciplines(v.Clan).join(', ') + '.' : 'Clan Disciplines: ' + clanDisciplines(v.Clan).join(', ') + '.' });
      }
    }
    if (s.key === 'PREDATOR' && isThin(v) && !v.Predator && noPredator()) out.push({ ok: true, text: noPredator() });
    else if (s.key === 'PREDATOR') {
      const cur = predators(v).find((p) => p.name === v.Predator);
      const n = cur && G() ? G().grantsOf(cur.entity).length : 0;
      const done = Object.keys((((meta || {}).pred || {}).name === v.Predator && (meta || {}).pred.applied) || {}).length;
      out.push({ ok: !!v.Predator && done >= n, text: v.Predator ? v.Predator + ': ' + done + ' of ' + n + ' grants applied.' : 'Pick a Predator type.' });
    }
    if (s.key === 'ADVANTAGES') {
      const want = advantagePoints(s.text);
      // the Predator's own Advantages and Flaws are "in addition to" these points
      const theirs = pv.advantages.map((r) => JSON.stringify(r));
      const rows = (v['Advantages & Flaws'] || []).filter((r) => { const k = theirs.indexOf(JSON.stringify(r)); if (k === -1) return true; theirs.splice(k, 1); return false; });
      const adv = rows.filter((r) => !r.Flaw).reduce((a, r) => a + (+r.Dots || 0), 0);
      const fl = rows.filter((r) => r.Flaw).reduce((a, r) => a + (+r.Dots || 0), 0);
      if (want) out.push({ ok: adv === want.advantages && fl >= want.flaws, text: 'The book: ' + want.advantages + ' points of Advantages, ' + want.flaws + ' points of Flaws (besides the Predator’s). This sheet: ' + adv + ' and ' + fl + '.' });
      const tm = /Thin-blood characters must take between (\w+) and (\w+) Thin-Blood Merits and the same number of Thin-Blood Flaws\./i.exec(s.text);
      if (isThin(v) && tm) {
        const tb = D.thinBloodTraits();
        const m = rows.filter((r) => !r.Flaw && tb.merits.some((t) => t.name === r.Name)).length;
        const f = rows.filter((r) => r.Flaw && tb.flaws.some((t) => t.name === r.Name)).length;
        out.push({ ok: m >= num(tm[1]) && m <= num(tm[2]) && m === f, text: tm[0] + ' This sheet: ' + m + ' and ' + f + '.' });
      }
      const fb = isThin(v) && thinForbidden();
      if (fb) {
        const names = /buy (.+) during/.exec(fb)[1].split(/,\s*(?:or\s+)?|\s+or\s+/).map((x) => x.trim()).filter(Boolean);
        const bad = rows.filter((r) => !r.Flaw && names.some((n) => new RegExp('^' + n + '\\b', 'i').test(r.Name || ''))).map((r) => r.Name);
        out.push({ ok: !bad.length, text: fb + (bad.length ? ' This sheet: ' + bad.join(', ') + '.' : '') });
      }
    }
    if (s.key === 'SEA OF TIME' && isThin(v)) {
      const g = /((?:\d+th,?\s*(?:or\s+)?)+)Generation \(thin-bloods\): Blood Potency (\d+)/.exec(s.text);
      const bh = /(\d+)\+ Generation Thinblood: Blood Potency (\d+)/.exec(s.text);   // The Black Hand's "14+ Generation Thinblood: Blood Potency 0"
      if (bh && !g) {
        const gen = parseInt(v.Generation, 10);
        out.push({ ok: gen >= +bh[1] && +v['Blood Potency'] === +bh[2], text: bh[0] + '. This sheet: Generation ' + (v.Generation || '—') + ', Blood Potency ' + (v['Blood Potency'] != null ? v['Blood Potency'] : '—') + '.' });
      }
      if (g) {
        const gens = g[1].match(/\d+/g).map(Number);
        const gen = parseInt(v.Generation, 10);
        out.push({ ok: gens.indexOf(gen) !== -1 && +v['Blood Potency'] === +g[2], text: g[0] + '. This sheet: Generation ' + (v.Generation || '—') + ', Blood Potency ' + (v['Blood Potency'] != null ? v['Blood Potency'] : '—') + '.' });
      }
    }
    if (s.key === 'PATH OF ENLIGHTENMENT') out.push({ ok: !!v['Path of Enlightenment'], text: v['Path of Enlightenment'] ? 'Path: ' + v['Path of Enlightenment'] + '.' : 'Select a Path of Enlightenment.' });
    if (s.key === 'CONVICTIONS AND TOUCHSTONES' || s.key === 'PATH OF ENLIGHTENMENT') {
      const c = convictions(s.text);
      const n = (v['Touchstones & Convictions'] || []).filter(Boolean).length;
      if (c.min != null) out.push({ ok: n >= c.min && n <= c.max, text: c.min + ' to ' + c.max + ' Convictions, each with a ' + (s.key === 'PATH OF ENLIGHTENMENT' ? 'Touchstone Ritae or a Touchstone' : 'Touchstone') + '. This sheet: ' + n + '.' });
      if (c.humanity != null) out.push({ ok: +v.Humanity === c.humanity + pv.humanity, text: 'Humanity ' + c.humanity + ' (the book)' + (pv.humanity ? ', ' + (c.humanity + pv.humanity) + ' with your Predator type' : '') + '. This sheet: ' + (v.Humanity || 0) + '.' });
    }
    return out;
  }

  return { render, steps, bhSteps, paths, attributeSpread, skillDistributions, freeSpecialties, disciplineDots, advantagePoints, convictions, clans, clanDisciplines, clanBane, predators };
})();
