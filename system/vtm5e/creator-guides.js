// system/vtm5e/creator-guides.js — the creator's guided steps (system/vtm5e/creator.js): placing
// Attributes and Skills against the spread the book prints, the free specialties, and walking a
// Predator type's grants one by one.
//
// Every number and name comes from the book's own sentences, parsed by the creator (the spread
// "one Attribute at 4; three Attributes at 3…", a distribution "Balanced: Three Skills at 3…",
// "Add free specialties to Academics, Craft…"), or from the Predator type's printed list of
// grants, shown verbatim beside the control that applies it. A grant this file cannot read is
// never guessed at: it is offered as a line for the Notes, as printed.
//
// A guide changes the draft through ctx.set(values patch) and keeps its own bookkeeping — which
// distribution was chosen, what a Predator grant added (so it can be undone, and so the Predator's
// Advantages do not count against the 7 points) — through ctx.setMeta(patch), in the creator's
// roster beside the draft, never in the character's values (never in the file).
window.VtmCreatorGuides = (function () {
  const { el, button, debounce } = window.VttRender;
  const D = window.VtmData;
  const Sheet = window.VtmSheet;

  const DOT = '●';
  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  const num = (w) => (/^\d+$/.test(w) ? +w : WORDS[String(w).toLowerCase()] || null);
  const say = (n) => ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);

  // ── placing dots against a printed spread ──
  // spread { "4": 1, "3": 3, "2": 4, "1": 1 } — how many traits the book puts at each level.
  // base: the level a trait sits at when nothing is placed (1 for Attributes, 0 for Skills).
  // A level's button is spent when as many traits hold it as the book allows; clicking the level a
  // trait already holds returns it to the base.
  function allocator(names, v, spread, base, set, label) {
    const levels = Object.keys(spread).map(Number).sort((a, b) => b - a);
    const counted = levels.filter((l) => l !== base);
    const have = {};
    names.forEach((n) => { const x = +v[n] || base; have[x] = (have[x] || 0) + 1; });
    const need = (l) => spread[l] || 0;
    // what is still to place, and what is over
    const left = counted.map((l) => ({ l, left: need(l) - (have[l] || 0) }));
    const chip = (x) => el('span', { class: 'alloc-chip' + (x.left === 0 ? ' done' : x.left < 0 ? ' over' : '') }, [
      DOT.repeat(x.l) + ' ' + (x.left === 0 ? '✓' : x.left > 0 ? say(x.left) + ' to place' : say(-x.left) + ' too many'),
    ]);
    const rest = 'the rest stay at ' + base + (need(base) ? ' (the book: ' + say(need(base)) + ' at ' + base + ')' : '');
    const tally = el('div', { class: 'alloc-tally' }, [el('span', { class: 'prop-k' }, [label + ' still to place'])].concat(left.map(chip), [el('span', { class: 'muted small' }, [rest])]));
    const groups = [];
    names.forEach((n) => {
      const g = Sheet.groupOf(n) || '';
      if (!groups.length || groups[groups.length - 1].g !== g) groups.push({ g, names: [] });
      groups[groups.length - 1].names.push(n);
    });
    const row = (n) => {
      const cur = +v[n] || base;
      return el('div', { class: 'alloc-row' + (cur !== base ? ' placed' : '') }, [
        el('span', { class: 'alloc-name' }, [n]),
        el('span', { class: 'alloc-levels' }, counted.map((l) => {
          const on = cur === l;
          const b = button(String(l), () => set({ [n]: on ? base : l }), 'tiny' + (on ? '' : ' ghost'));
          b.title = on ? 'Back to ' + base : 'Put ' + n + ' at ' + l;
          if (!on && (have[l] || 0) >= need(l)) b.disabled = true;
          return b;
        })),
      ]);
    };
    return el('div', { class: 'alloc' }, [tally, el('div', { class: 'alloc-groups' }, groups.map((g) => el('div', { class: 'alloc-group' }, [g.g ? el('div', { class: 'group-h' }, [g.g]) : null].concat(g.names.map(row)))))]);
  }

  // ── Skills: pick the distribution, then place against it ──
  function skills(ctx, dists, free) {
    const { v, meta, set, setMeta } = ctx;
    const box = el('div', {});
    const chosen = dists.find((d) => d.name === meta.skillDist) || null;
    box.appendChild(el('div', { class: 'prop-k' }, ['Your Skill distribution']));
    box.appendChild(el('div', { class: 'dist-cards' }, dists.map((d) => el('button', {
      type: 'button', class: 'dist-card' + (chosen === d ? ' on' : ''), onclick: () => setMeta({ skillDist: chosen === d ? null : d.name }),
    }, [el('div', { class: 'dist-name' }, [d.name]), el('div', { class: 'small' }, [d.text.replace(/^[^:]*:\s*/, '').split(/\s*Add free specialties/)[0]])]))));
    if (!chosen) {
      box.appendChild(el('p', { class: 'muted' }, ['Choose one, and the Skills below are placed against it.']));
      return box;
    }
    box.appendChild(allocator(Sheet.skills(), v, chosen.spread, 0, set, 'Skills'));
    box.appendChild(specialties(ctx, free));
    return box;
  }

  // the free specialties: one for each named Skill the character has, and "one more"
  function specialties(ctx, free) {
    const { v, meta, set } = ctx;
    const rows = (v.Specialties || []).slice();
    // a specialty a Predator grant added is not a free one
    const fromPredator = new Set(Object.values((meta.pred || {}).applied || {}).reduce((a, rec) => a.concat((rec.rows || []).filter(([f]) => f === 'Specialties').map(([, r]) => r.Skill + '|' + r.Specialty)), []));
    const own = rows.filter((r) => !fromPredator.has(r.Skill + '|' + r.Specialty));
    const box = el('div', { class: 'spec-guide' }, [el('div', { class: 'prop-k' }, ['Free specialties'])]);
    const write = (skill, text, i) => {
      const next = rows.slice();
      if (i === -1) { if (text != null) next.push({ Skill: skill, Specialty: text }); } else if (text != null) next[i] = { Skill: skill, Specialty: text }; else next.splice(i, 1);
      set({ Specialties: next });
    };
    free.named.forEach((skill) => {
      const has = (+v[skill] || 0) > 0;
      const i = rows.findIndex((r) => r.Skill === skill && !fromPredator.has(r.Skill + '|' + r.Specialty));
      box.appendChild(el('div', { class: 'spec-row' + (!has ? ' muted' : i !== -1 ? ' done' : '') }, [
        el('span', { class: 'alloc-name' }, [skill]),
        has ? el('input', { type: 'text', class: 'text', placeholder: 'a specialty in ' + skill, value: i !== -1 ? rows[i].Specialty : '', oninput: debounce((ev) => write(skill, ev.target.value.trim() || (i === -1 ? '' : null), i), 300) })
          : el('span', { class: 'small' }, ['no dots — no free specialty']),
      ]));
    });
    for (let k = 0; k < free.more; k++) {
      const named = new Set(free.named);
      const extra = own.filter((r) => !named.has(r.Skill));
      const r = extra[k] || null;
      const i = r ? rows.indexOf(r) : -1;
      const withDots = Sheet.skills().filter((sk) => (+v[sk] || 0) > 0 && !named.has(sk));
      const pickSkill = el('select', { class: 'scope', onchange: (ev) => write(ev.target.value, ev.target.value ? (r ? r.Specialty : '') : null, i) }, [el('option', { value: '' }, ['a Skill…'])].concat(withDots.map((sk) => el('option', { value: sk, selected: r && r.Skill === sk || null }, [sk]))));
      box.appendChild(el('div', { class: 'spec-row' + (r && r.Specialty ? ' done' : '') }, [
        el('span', { class: 'alloc-name' }, ['One more']), pickSkill,
        el('input', { type: 'text', class: 'text', placeholder: 'its specialty', value: r ? r.Specialty : '', disabled: r ? null : 'disabled', oninput: debounce((ev) => write(r.Skill, ev.target.value.trim(), i), 300) }),
      ]));
    }
    return box;
  }

  // ── a Predator type's grants, read ──
  // Each printed line becomes a grant of a kind this file can apply, or a note:
  //   specialty   "Add a specialty: Intimidation (Stickups) or Brawl (Grappling)"
  //   discipline  "Gain one dot of Celerity or Potence" (and "…of Oblivion and gain one dot of Fortitude or Potence")
  //   humanity    "Lose one dot of Humanity" / "Lose two dots of Humanity" / "Gain one dot of Humanity"
  //   potency     "Increase Blood Potency by one"
  //   split       "Spend three dots between the Fame and Herd Backgrounds"
  //   advantage   a Merit, Flaw or Background with its printed dots, or a choice of them
  //   note        anything else, as printed ("Slake one extra Hunger when you hunt alone")
  const ADV_WORD = /\b(Merit|Flaw|Advantage|Background)s?\b|[•●]|\bdots? of\b/;
  // category labels the book prints before the named Merit or Flaw ("Feeding Merit: Iron Gullet")
  const CATEGORY = /^(Feeding|Looks|Mythic|Haven|Influence|Herd|Retainers?|Mask|Substance Use|Bonding)$/i;
  const dotsIn = (t) => (t.match(/[•●]/g) || []).length;
  const stripParens = (t) => t.replace(/\s*\([^)]*\)/g, '').trim();

  function advantageOption(t) {
    const flaw = /\bFlaw\b/.test(t);
    let dots = dotsIn(t);
    const w = /\b(one|two|three|four|five) dots? of (?:the )?(.+?)(?: Background)?$/i.exec(t);
    if (!dots && w) dots = num(w[1]);
    let name;
    if (w && !dotsIn(t)) name = w[2].replace(/^either\s+/i, '');
    else {
      const s = t.replace(/^(?:Gain\s+)?(?:either\s+)?(?:the\s+)?/i, '');
      // the words before the printed dots ("Dark Secret (Mortal Ties)", "Feeding Merit: Iron Gullet")
      const before = s.split(/\s*\(?[•●]/)[0].replace(/:\s*$/, '').trim();
      // the words after them: a name ("Beautiful", "Prey Exclusion (mortals)"), not a description
      let after = ((/[•●]+\)?\s*(.*)$/.exec(s) || [])[1] || '').replace(/[.■]+\s*$/, '').trim();
      if (after.split(/\s+/).length > 4) after = after.split(/\s*\(/)[0];
      const shortAfter = after && after.split(/\s+/).length <= 4 && !/^[:(]/.test(after) && !/^(\w+\s+)?(Merit|Flaw)\b/.test(after) ? after : '';
      const [label, afterColon] = before.split(/:\s*/);
      const bare = (label || '').replace(/\s*\b(Merit|Flaw|Advantage|Background)\b\s*$/i, '').trim();
      if (afterColon) name = afterColon;
      else if (shortAfter) name = CATEGORY.test(bare) || !bare ? shortAfter : bare + ' (' + shortAfter + ')';
      else name = bare || s;
      name = name.replace(/\s*\b(Feeding|Mythic|Looks|Haven|Retainer|Mask)?\s*(Merit|Flaw|Advantage)\s*$/i, '').replace(/[•●]/g, '').replace(/\(\s*\)/g, '').replace(/^one\s+\w+\s+Flaw$/i, '').replace(/\s+/g, ' ').trim();
    }
    return { name: name.charAt(0).toUpperCase() + name.slice(1), dots, flaw, text: t };
  }
  // "A or B": a choice only where each side names an Advantage of its own; "A and B" (each with its
  // dots) is both, in one choice. A choice is a list of Advantage lines.
  const own = (p) => dotsIn(p) || /\b(Merit|Flaw)\b/.test(p);
  function advantageOptions(t) {
    const body = t.replace(/^Gain\s+(?:either\s+)?/i, '');
    const parts = body.split(/,?\s+or\s+(?:the\s+)?/);
    const choices = parts.length > 1 && parts.every(own) ? parts : [body];
    // "Gain one Haven Flaw: Creepy (•) or Haunted (•)": the Flaw said once is both sides'
    const allFlaws = /\bFlaw\b/.test(t) && !/\bMerit\b/.test(t);
    return choices.map((c) => {
      const both = c.split(/\s+and\s+/);
      return (both.length > 1 && both.every((p) => dotsIn(p)) ? both : [c]).map((p) => Object.assign(advantageOption('Gain ' + p), allFlaws ? { flaw: true } : {}));
    });
  }

  function parseGrant(t) {
    let m;
    if ((m = /^Add a specialty:\s*(.+)$/i.exec(t))) {
      return { kind: 'specialty', options: m[1].split(/,\s*(?:or\s+)?|\s+or\s+/).map((o) => { const x = /^(.+?)\s*\((.+)\)\s*$/.exec(o.trim()); return x ? { skill: x[1].trim(), spec: x[2].trim() } : null; }).filter(Boolean) };
    }
    if ((m = /^(Lose|Gain) (\w+) dots? of Humanity\.?$/i.exec(t))) return { kind: 'humanity', delta: (m[1].toLowerCase() === 'lose' ? -1 : 1) * num(m[2]) };
    if ((m = /^Increase (?:your )?Blood Potency by (\w+)\.?$/i.exec(t))) return { kind: 'potency', delta: num(m[1]) };
    const known = D.disciplines();
    const segs = t.split(/\s+and\s+gain\s+/i).map((sg) => /^(?:Gain\s+)?one dot of (.+?)\.?$/i.exec(sg.trim()));
    if (segs.every(Boolean)) {
      const sets = segs.map((x) => x[1].split(/\s+or\s+/).map((o) => ({ name: stripParens(o), text: o.trim() })));
      if (sets.every((s) => s.every((o) => known.indexOf(o.name) !== -1))) return { kind: 'discipline', sets };
    }
    if ((m = /^(?:Spend|Distribute) (\w+) dots between the (.+?) and (.+?) (Backgrounds|Flaws)\.?$/i.exec(t))) {
      return { kind: 'split', dots: num(m[1]), names: [m[2], m[3]], flaw: /Flaws/i.test(m[4]) };
    }
    if (/^Gain\b/i.test(t) && ADV_WORD.test(t)) return { kind: 'advantage', options: advantageOptions(t) };
    return { kind: 'note' };
  }
  const grantsOf = (entity) => (D.val(entity, 'Items') || []).map((x) => (x && typeof x === 'object' ? x.value : x)).map((t) => Object.assign({ text: t }, parseGrant(t)));

  // ── applying a grant, and undoing it ──
  // An application is recorded as the changes it made: { rows: [[field, row]], fields: [[field, from, to]], notes, humanity, potency }.
  function applyGrant(v, g, choice) {
    const patch = {}, rec = { rows: [], fields: [], choice };
    const rows = (f) => (patch[f] = patch[f] || (v[f] || []).slice());
    const addRow = (f, r) => { rows(f).push(r); rec.rows.push([f, r]); };
    if (g.kind === 'specialty') {
      const o = g.options[choice];
      // "If a Predator type adds a specialty for which you lack the matching Skill, gain a dot in that Skill instead."
      if ((+v[o.skill] || 0) > 0) addRow('Specialties', { Skill: o.skill, Specialty: o.spec });
      else { patch[o.skill] = (+v[o.skill] || 0) + 1; rec.fields.push([o.skill, +v[o.skill] || 0, patch[o.skill]]); }
    } else if (g.kind === 'discipline') {
      const names = g.sets.map((s, k) => (s.length === 1 ? s[0].name : s[(choice || [])[k]].name));
      const ds = rows('Disciplines');
      names.forEach((n) => {
        const i = ds.findIndex((d) => d.Discipline === n);
        if (i === -1) { const r = { Discipline: n, Dots: 1, Powers: [] }; ds.push(r); rec.rows.push(['Disciplines', r]); } else { ds[i] = Object.assign({}, ds[i], { Dots: (+ds[i].Dots || 0) + 1 }); rec.fields.push(['Disciplines:' + n, +ds[i].Dots - 1, +ds[i].Dots]); }
      });
    } else if (g.kind === 'advantage') {
      g.options[choice].forEach((o) => addRow('Advantages & Flaws', { Name: o.name, Dots: o.dots || 0, Flaw: o.flaw }));
    } else if (g.kind === 'split') {
      g.names.forEach((n) => addRow('Advantages & Flaws', { Name: n, Dots: 0, Flaw: g.flaw }));
    } else if (g.kind === 'note') {
      patch.Notes = ((v.Notes || '').trim() ? v.Notes.trim() + '\n' : '') + g.text;
      rec.note = g.text;
    } else if (g.kind === 'humanity') rec.humanity = g.delta;
    else if (g.kind === 'potency') rec.potency = g.delta;
    return { patch, rec };
  }
  function undoGrant(v, rec) {
    const patch = {};
    (rec.rows || []).forEach(([f, r]) => {
      const list = (patch[f] || v[f] || []).slice();
      const i = list.findIndex((x) => JSON.stringify(x) === JSON.stringify(r));
      if (i !== -1) list.splice(i, 1);
      patch[f] = list;
    });
    (rec.fields || []).forEach(([f, from]) => {
      if (f.indexOf('Disciplines:') === 0) {
        const n = f.slice(12), list = (patch.Disciplines || v.Disciplines || []).slice(), i = list.findIndex((d) => d.Discipline === n);
        if (i !== -1) list[i] = Object.assign({}, list[i], { Dots: from });
        patch.Disciplines = list;
      } else patch[f] = from;
    });
    if (rec.note) patch.Notes = (v.Notes || '').split('\n').filter((l) => l !== rec.note).join('\n');
    return patch;
  }

  // the Predator's applied grants: what they add that the other steps must count or expect
  function fromPredator(meta) {
    const applied = Object.values((meta.pred || {}).applied || {});
    return {
      advantages: applied.reduce((a, r) => a.concat((r.rows || []).filter(([f]) => f === 'Advantages & Flaws').map(([, x]) => x)), []),
      humanity: applied.reduce((a, r) => a + (r.humanity || 0), 0),
      potency: applied.reduce((a, r) => a + (r.potency || 0), 0),
    };
  }

  // ── the Predator step ──
  function predator(ctx, types, rule) {
    const { v, meta, set, setMeta } = ctx;
    const box = el('div', {});
    const pred = meta.pred && meta.pred.name === v.Predator ? meta.pred : { name: v.Predator || null, applied: {} };
    const undoAll = () => {
      let cur = Object.assign({}, v), patch = {};
      Object.values(pred.applied || {}).forEach((rec) => { const p = undoGrant(cur, rec); Object.assign(patch, p); cur = Object.assign(cur, p); });
      return patch;
    };
    const choose = (name) => {
      if (name === v.Predator) return;
      const applied = Object.keys(pred.applied || {}).length;
      if (applied && !window.confirm('Changing the Predator type takes back the ' + applied + ' grant' + (applied === 1 ? '' : 's') + ' already applied. Go on?')) return;
      const patch = undoAll();
      setMeta({ pred: { name: name || null, applied: {} } }, Object.assign(patch, { Predator: name }));
    };
    box.appendChild(el('div', { class: 'prop' }, [el('div', { class: 'prop-k' }, ['Predator type']), el('div', { class: 'prop-v' }, [
      el('select', { class: 'scope', onchange: (ev) => choose(ev.target.value) }, [el('option', { value: '' }, ['—'])].concat(types.map((p) => el('option', { value: p.name, selected: p.name === v.Predator || null }, [p.name])))),
    ])]));
    const cur = types.find((p) => p.name === v.Predator);
    if (!cur) return box;
    const grants = grantsOf(cur.entity);
    const done = Object.keys(pred.applied || {}).length;
    box.appendChild(el('div', { class: 'prop-k' }, [cur.name + ' grants · ' + done + ' of ' + grants.length + ' applied']));
    const apply = (i, choice) => {
      const { patch, rec } = applyGrant(v, grants[i], choice);
      setMeta({ pred: { name: pred.name || v.Predator, applied: Object.assign({}, pred.applied, { [i]: rec }) } }, patch);
    };
    const undo = (i) => {
      const patch = undoGrant(v, pred.applied[i]);
      const a = Object.assign({}, pred.applied); delete a[i];
      setMeta({ pred: { name: pred.name || v.Predator, applied: a } }, patch);
    };
    const list = el('ol', { class: 'grants' });
    grants.forEach((g, i) => {
      const rec = (pred.applied || {})[i];
      const controls = [];
      if (rec) {
        controls.push(el('span', { class: 'grant-done' }, ['✓ ' + describe(g, rec)]), button('undo', () => undo(i), 'ghost tiny'));
      } else if (g.kind === 'specialty') {
        g.options.forEach((o, k) => controls.push(button(o.skill + ' (' + o.spec + ')' + ((+v[o.skill] || 0) > 0 ? '' : ' → a dot in ' + o.skill), () => apply(i, k), 'ghost tiny')));
      } else if (g.kind === 'discipline') {
        // one choice per "or"; a single Discipline is given with the choice
        const pick = g.sets.map((s) => (s.length === 1 ? 0 : null));
        const holder = el('span', { class: 'chiprow tight' });
        const draw = () => {
          holder.innerHTML = '';
          g.sets.forEach((s, k) => {
            if (s.length === 1) holder.appendChild(el('span', { class: 'small' }, [s[0].name + ' +1 and']));
            else s.forEach((o, j) => holder.appendChild(button(o.name + (pick[k] === j ? ' ✓' : ''), () => { pick[k] = j; if (pick.every((x) => x != null)) apply(i, pick.slice()); else draw(); }, pick[k] === j ? 'tiny' : 'ghost tiny')));
          });
          if (g.sets.every((s) => s.length === 1)) holder.appendChild(button('Apply', () => apply(i, pick.slice()), 'ghost tiny'));
        };
        draw();
        controls.push(holder);
      } else if (g.kind === 'advantage') {
        g.options.forEach((c, k) => controls.push(button('Add ' + c.map(label).join(' + '), () => apply(i, k), 'ghost tiny')));
      } else if (g.kind === 'split') {
        controls.push(button('Add ' + g.names.join(' and ') + ' lines', () => apply(i, 0), 'ghost tiny'), el('span', { class: 'muted small' }, [' then share the ' + say(g.dots) + ' dots between them on the Advantages step']));
      } else if (g.kind === 'humanity' || g.kind === 'potency') {
        controls.push(button('Apply', () => apply(i, 0), 'ghost tiny'), el('span', { class: 'muted small' }, [g.kind === 'humanity' ? ' counted when you set Humanity' : ' counted when you set Blood Potency']));
      } else {
        controls.push(button('Add to the Notes', () => apply(i, 0), 'ghost tiny'));
      }
      list.appendChild(el('li', { class: 'grant' + (rec ? ' done' : '') }, [el('div', { class: 'grant-text' }, [g.text]), el('div', { class: 'chiprow tight' }, controls)]));
    });
    box.appendChild(list);
    if (rule) box.appendChild(el('p', { class: 'muted small' }, [rule]));
    return box;
  }
  const label = (o) => o.name + (o.dots ? ' ' + DOT.repeat(o.dots) : '') + (o.flaw ? ' (Flaw)' : '');
  function describe(g, rec) {
    if (g.kind === 'specialty') { const o = g.options[rec.choice]; return rec.fields.length ? 'a dot in ' + o.skill + ' (no ' + o.skill + ' to take the specialty)' : o.skill + ' (' + o.spec + ')'; }
    if (g.kind === 'discipline') return g.sets.map((s, k) => (s.length === 1 ? s[0].name : s[(rec.choice || [])[k]].name) + ' +1').join(', ');
    if (g.kind === 'advantage') return g.options[rec.choice].map(label).join(' + ') + ' on the Advantages';
    if (g.kind === 'split') return g.names.join(' and ') + ' on the Advantages';
    if (g.kind === 'humanity') return (rec.humanity > 0 ? '+' : '') + rec.humanity + ' Humanity';
    if (g.kind === 'potency') return '+' + rec.potency + ' Blood Potency';
    return 'in the Notes';
  }

  return { allocator, skills, predator, grantsOf, parseGrant, fromPredator };
})();
