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
window.VtmCreator = (function () {
  const { el, button, debounce } = window.VttRender;
  const D = window.VtmData;
  const E = window.VtmEntity;
  const Sheet = window.VtmSheet;

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
  };

  // ── the summary, read from the core ──
  function summaryParas() {
    const core = D.all(['core']).filter((e) => /core-characters/.test(e.file));
    const texts = [];
    core.forEach((e) => (e.guidance || []).forEach((g) => { if (g.text) texts.push(g.text); }));
    const start = texts.findIndex((t) => /^CORE CONCEPT\b/.test(t));
    if (start === -1) return [];
    const paras = [];
    for (let i = start; i < texts.length; i++) {
      texts[i].split(/\n\s*\n/).forEach((p) => paras.push(p.trim()));
      if (paras.some((p) => /^SEA OF TIME\b/.test(p)) && /Each player spends 35|experience points\.?$/.test(texts[i])) break;
      if (i > start + 4) break;
    }
    return paras.filter(Boolean);
  }
  function steps() {
    const out = [];
    summaryParas().forEach((p) => {
      const m = /^([A-Z][A-Z ]{3,}[A-Z])\b\s*(.*)$/s.exec(p);
      if (m && STEP_FIELDS[m[1].trim()] !== undefined) out.push({ key: m[1].trim(), paras: [m[2] || ''] });
      else if (out.length) out[out.length - 1].paras.push(p);
    });
    return out.map((s) => Object.assign(s, { text: s.paras.filter(Boolean).join('\n\n') }));
  }

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
    const m = /Select (\w+) to (\w+) Convictions/.exec(text);
    const h = /Set your Humanity to (\d+)/.exec(text);
    return { min: m ? num(m[1]) : null, max: m ? num(m[2]) : null, humanity: h ? +h[1] : null };
  }

  // ── the book behind the picks ──
  // A clan is a heading in a Clans chapter (core, Players Guide) that prints a "Bane" under it.
  function clans() {
    const out = [];
    D.all(['core', 'players-guide']).forEach((e) => {
      if (!/clans|caitiff|thin-blooded/.test(e.file)) return;
      const kids = D.children(e.id);
      if (kids.some((k) => k.name === 'Bane') && !out.some((c) => c.name === e.name)) out.push({ name: e.name, entity: e, book: e.book });
    });
    return out;
  }
  const clanNamed = (name) => clans().find((c) => c.name === name) || null;
  function clanDisciplines(name) {
    const c = clanNamed(name);
    const d = c && D.children(c.entity.id).find((k) => k.name === 'Disciplines');
    const names = d ? D.children(d.id).map((k) => k.name) : [];
    return names.filter((n) => D.disciplines().indexOf(n) !== -1);
  }
  function clanBane(name) {
    const c = clanNamed(name);
    const b = c && D.children(c.entity.id).find((k) => k.name === 'Bane');
    return b ? b.desc : null;
  }
  // Predator types: the headings under a "Predator Types" section (core, Players Guide)
  // that print their grants (an Items list: "Add a specialty…", "Gain one dot of…"). The
  // Players Guide's summary sheet also heads a "Predator Types" of one-line reminders
  // ("Alleycat:"), and a notes sidebar sits among the types; neither prints grants.
  function predators() {
    const out = [];
    D.all(['core', 'players-guide']).forEach((e) => {
      if (e.name !== 'Predator Types') return;
      D.children(e.id).forEach((k) => {
        if ((k.props || []).some((p) => p.name === 'Items') && !out.some((p) => p.name === k.name)) out.push({ name: k.name, entity: k });
      });
    });
    return out;
  }

  // ── the roster: drafts in this browser ──
  function load() { try { return JSON.parse(localStorage.getItem(ROSTER) || '{"current":null,"drafts":{}}'); } catch (e) { return { current: null, drafts: {} }; } }
  function save(r) { try { localStorage.setItem(ROSTER, JSON.stringify(r)); } catch (e) { /* no storage */ } }
  const newId = () => 'draft-' + Math.random().toString(36).slice(2, 9);

  // ── the walk ──
  let stepIndex = 0;
  function render(container) {
    const page = el('div', { class: 'page creator' });
    container.appendChild(page);
    page.appendChild(el('div', { class: 'loading' }, ['Opening the Core Rulebook and the Players Guide…']));
    D.ready(Sheet.BOOKS.concat(['players-guide'])).then(() => { page.innerHTML = ''; draw(page); });
  }

  function draw(page) {
    const roster = load();
    if (!roster.current || !roster.drafts[roster.current]) {
      const id = newId();
      roster.drafts[id] = Sheet.blank();
      roster.current = id;
      save(roster);
    }
    const v = roster.drafts[roster.current];
    const st = steps();
    const commit = (nv) => { roster.drafts[roster.current] = nv; save(roster); };
    page.innerHTML = '';
    page.appendChild(el('h2', { class: 'chapter-h' }, ['Making a character']));
    // the roster
    page.appendChild(el('div', { class: 'chiprow' }, [
      el('select', { class: 'scope', onchange: (ev) => { roster.current = ev.target.value; save(roster); draw(page); } },
        Object.keys(roster.drafts).map((id) => el('option', { value: id, selected: id === roster.current || null }, [roster.drafts[id].Name || 'An unnamed Kindred']))),
      button('New character', () => { const id = newId(); roster.drafts[id] = Sheet.blank(); roster.current = id; save(roster); stepIndex = 0; draw(page); }, 'ghost tiny'),
      button('Download character file', () => Sheet.download(Sheet.fileOf(v, { hunger: +v.Hunger || 0 }), v.Name), 'tiny'),
      button('Remove', () => { if (confirm('Remove ' + (v.Name || 'this character') + ' from this browser?')) { delete roster.drafts[roster.current]; roster.current = Object.keys(roster.drafts)[0] || null; save(roster); draw(page); } }, 'ghost tiny'),
    ]));
    if (!st.length) {
      page.appendChild(el('div', { class: 'empty' }, ['The core’s Character Creation summary was not found in the data.']));
      return;
    }
    // the step list
    page.appendChild(el('ol', { class: 'steps' }, st.map((s, i) => el('li', { class: i === stepIndex ? 'active' : '' }, [
      el('button', { type: 'button', class: 'ref', onclick: () => { stepIndex = i; draw(page); } }, [s.key]),
      el('span', { class: 'step-flag' }, [checks(s, v).some((c) => !c.ok) ? '•' : '✓']),
    ]))));
    const s = st[stepIndex];
    const side = el('aside', { class: 'creator-book' }, [el('div', { class: 'group-h' }, [s.key]), E.prose(s.text)]);
    const main = el('div', { class: 'creator-step' });
    main.appendChild(stepControls(s, v, (nv) => { commit(nv); draw(page); }));
    const cs = checks(s, v);
    if (cs.length) main.appendChild(el('ul', { class: 'checks' }, cs.map((c) => el('li', { class: c.ok ? 'ok' : 'warn' }, [c.text]))));
    main.appendChild(el('div', { class: 'chiprow' }, [
      stepIndex > 0 ? button('← ' + st[stepIndex - 1].key, () => { stepIndex--; draw(page); }, 'ghost tiny') : null,
      stepIndex < st.length - 1 ? button(st[stepIndex + 1].key + ' →', () => { stepIndex++; draw(page); }, 'tiny') : null,
    ]));
    page.appendChild(el('div', { class: 'creator-cols' }, [main, side]));
    page.appendChild(el('details', { class: 'sheet-details' }, [el('summary', {}, ['The whole sheet']), Sheet.render(v, { edit: (nv) => commit(nv) })]));
  }

  // the controls for one step: the sheet's own, restricted to the step's fields
  function stepControls(s, v, commit) {
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
    // the step's own picks from the book
    if (s.key === 'CLAN AND SIRE') {
      const cl = clans();
      box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Clan']), el('div', { class: 'prop-v' }, [
        el('select', { class: 'scope', onchange: (ev) => set({ Clan: ev.target.value, 'Clan Bane': clanBane(ev.target.value) || v['Clan Bane'] }) },
          [el('option', { value: '' }, ['—'])].concat(cl.map((c) => el('option', { value: c.name, selected: c.name === v.Clan || null }, [c.name + ' (' + (D.indexBook(c.book) || {}).label + ')'])))),
        v.Clan && clanDisciplines(v.Clan).length ? el('div', { class: 'muted small' }, ['Clan Disciplines: ' + clanDisciplines(v.Clan).join(', ')]) : null,
      ])]));
    }
    if (s.key === 'PREDATOR') {
      const pr = predators();
      const cur = pr.find((p) => p.name === v.Predator);
      box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Predator']), el('div', { class: 'prop-v' }, [
        el('select', { class: 'scope', onchange: (ev) => set({ Predator: ev.target.value }) }, [el('option', { value: '' }, ['—'])].concat(pr.map((p) => el('option', { value: p.name, selected: p.name === v.Predator || null }, [p.name])))),
      ])]));
      if (cur) box.appendChild(el('div', { class: 'paper' }, [E.render(cur.entity, { noKids: true })]));
    }
    if (s.key === 'SKILLS') {
      const ds = skillDistributions(s.paras);
      box.appendChild(el('div', { class: 'muted small' }, ['Distributions the book offers: ' + ds.map((d) => d.name).join(' · ')]));
    }
    // the sheet's fields for the step (Clan/Predator drawn above as picks)
    const shown = names.filter((n) => !(s.key === 'CLAN AND SIRE' && n === 'Clan') && !(s.key === 'PREDATOR' && n === 'Predator'));
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
  function checks(s, v) {
    const out = [];
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
      const match = ds.find((d) => same(d.spread, have));
      out.push({ ok: !!match, text: match ? 'Matches ' + match.name + '.' : 'This sheet: ' + (spreadText(have) || 'none set') + ' — the book’s distributions: ' + ds.map((d) => d.name + ' (' + spreadText(d.spread) + ')').join('; ') + '.' });
      const fs = freeSpecialties(s.text);
      const specs = (v.Specialties || []).map((x) => x.Skill);
      const missing = fs.named.filter((n) => (+v[n] || 0) > 0 && specs.indexOf(n) === -1);
      out.push({ ok: !missing.length, text: 'Free specialties for ' + fs.named.join(', ') + (fs.more ? ', and ' + fs.more + ' more' : '') + (missing.length ? ' — still to add: ' + missing.join(', ') : '') + '.' });
    }
    if (s.key === 'DISCIPLINES') {
      const want = disciplineDots(s.text);
      const have = (v.Disciplines || []).map((d) => +d.Dots || 0).sort().reverse();
      if (want) out.push({ ok: JSON.stringify(have) === JSON.stringify(want.slice().sort().reverse()), text: 'The book: ' + want.join(' and ') + ' dots. This sheet: ' + (have.join(' and ') || 'none') + '.' });
      if (v.Clan && clanDisciplines(v.Clan).length) {
        const off = (v.Disciplines || []).filter((d) => d.Discipline && clanDisciplines(v.Clan).indexOf(d.Discipline) === -1).map((d) => d.Discipline);
        out.push({ ok: !off.length || /Caitiff/.test(v.Clan), text: off.length ? off.join(', ') + ' is not among ' + v.Clan + '’s ' + clanDisciplines(v.Clan).join(', ') + '.' : 'Clan Disciplines: ' + clanDisciplines(v.Clan).join(', ') + '.' });
      }
    }
    if (s.key === 'PREDATOR') out.push({ ok: !!v.Predator, text: v.Predator ? 'Predator: ' + v.Predator + ' — apply what it lists.' : 'Pick a Predator type.' });
    if (s.key === 'ADVANTAGES') {
      const want = advantagePoints(s.text);
      const rows = v['Advantages & Flaws'] || [];
      const adv = rows.filter((r) => !r.Flaw).reduce((a, r) => a + (+r.Dots || 0), 0);
      const fl = rows.filter((r) => r.Flaw).reduce((a, r) => a + (+r.Dots || 0), 0);
      if (want) out.push({ ok: adv === want.advantages && fl >= want.flaws, text: 'The book: ' + want.advantages + ' points of Advantages, ' + want.flaws + ' points of Flaws (besides the Predator’s). This sheet: ' + adv + ' and ' + fl + '.' });
    }
    if (s.key === 'CONVICTIONS AND TOUCHSTONES') {
      const c = convictions(s.text);
      const n = (v['Touchstones & Convictions'] || []).filter(Boolean).length;
      if (c.min != null) out.push({ ok: n >= c.min && n <= c.max, text: c.min + ' to ' + c.max + ' Convictions, each with a Touchstone. This sheet: ' + n + '.' });
      if (c.humanity != null) out.push({ ok: +v.Humanity === c.humanity, text: 'Humanity ' + c.humanity + ' (the book). This sheet: ' + (v.Humanity || 0) + '.' });
    }
    return out;
  }

  return { render, steps, attributeSpread, skillDistributions, freeSpecialties, disciplineDots, advantagePoints, convictions, clans, clanDisciplines, clanBane, predators };
})();
