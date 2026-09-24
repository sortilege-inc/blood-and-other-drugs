// system/vtm5e/sheet.js — the character sheet, derived from the corpus's ACTOR "Kindred" at
// runtime (PLAYBOOK §1b): the declared fields, in declared order (the printed sheet's order),
// each drawn by its declared type — an INTEGER with a range is a row of dots, one without a
// ceiling a tracker's size, a STRING a line, a LIST OF STRING numbered lines, a LIST OF a
// declared row type (Discipline Rating, Specialty, Advantage Line) rows of that type's own
// fields, a reference to a vocabulary type (Discipline) a pick from its ENUM.
//
// Grouping is read from the book too: a run of dotted fields is labelled by the heading the
// core's Characters chapter prints them under ("Physical Attributes" › Strength, Dexterity,
// Stamina). The Blood Potency figures the sheet prints (Blood Surge … Bane Severity) are the
// Errata's replacement chart's row for the character's Blood Potency, shown with its heads.
//
// Also here: the live sheet for play — the Health and Willpower trackers, Hunger, Stains, the
// Remorse test, and pools built from the sheet into the roller. Every number the rules state
// only in prose is a named constant citing its sentence.
window.VtmSheet = (function () {
  const { el, button, debounce } = window.VttRender;
  const D = window.VtmData;
  const Dice = window.VtmDice;
  const State = () => window.VttState;

  const ACTOR = 'Kindred';
  const FILE_KIND = 'sortilege-vtt-character';
  const BOOKS = ['base', 'core', 'errata'];           // what the sheet reads
  // Before the corpus declared the character (PLAN.md D1) a member carried this id; a file
  // with it still reads.
  const OLD_TEMPLATE_ID = 'vtm5e-character';

  // ── numbers the rules state only in prose, each citing its sentence ──
  // "Health = Stamina + 3; Willpower = Composure + Resolve." — core, Character Creation summary
  const HEALTH_FROM = ['Stamina', 3];
  const WILLPOWER_FROM = ['Composure', 'Resolve'];
  // "Mark each level of Superficial damage on the character sheet by making a “/” on one box
  //  on the track. Mark Aggravated damage on the character sheet by making an “X” on the
  //  tracker." — Tracking Damage
  const MARK = { sup: '/', agg: 'X' };
  // "Impaired characters lose two dice from all relevant dice pools: Physical pools from
  //  Impaired Health, Social, and Mental pools from Impaired Willpower" — Impairment
  const IMPAIRED_PENALTY = 2;
  // "Roll a number of dice equal to the unmarked, unfilled dots on the Humanity tracker … The
  //  minimum number of dice in a Remorse roll is one" — Remorse
  const REMORSE_MIN = 1;
  const RULES = {
    tracking: '#v8jE9nMR6clPx2zFJRQeRBR', impairment: '#vR5WBtRjY1pxZfQzeTZRC7E', end: '#v4ZWtiGxAi9yO4oUiLHzX0o',
    stains: '#vPN2qKBKdNPwqeNyBOhmBWQ', remorse: '#vCx8XSdcpAugFiLrkHyerHH', degeneration: '#vCsEENnhpvC3uJZZcjag2jb',
  };

  // ── the declaration, read at runtime ──
  const decl = (name) => D.declaration(name);
  const actor = () => decl(ACTOR);
  const templateId = () => (actor() || {}).id || '#vtm5Kindred000000001';

  // Where the core's Characters chapter prints a field: the heading its entity sits under.
  let parentOf = null;
  function groupOf(name) {
    if (!parentOf) {
      parentOf = {};
      D.all(['core']).filter((e) => /core-characters/.test(e.file)).forEach((e) => {
        if (e.parent && !(e.name in parentOf)) parentOf[e.name] = D.entity(e.parent) ? D.entity(e.parent).name : null;
      });
    }
    return parentOf[name] || null;
  }

  // One entry per declared field: { name, kind, min, max, of, fields, required }.
  function fieldSpec(p) {
    const s = { name: p.name, required: !!p.required, min: p.min, max: p.max };
    if (p.vk === 'ref') {
      const t = p.ref && decl(p.ref.name);
      s.kind = t && t.enum ? 'enum' : 'text';
      s.options = t && t.enum ? t.enum.slice() : null;
    } else if (p.vk === 'list' && p.of && p.of !== 'STRING') {
      s.kind = 'rows';
      s.of = p.of;
      s.fields = ((decl(p.of) || {}).props || []).map(fieldSpec);
    } else if (p.vk === 'list') s.kind = 'lines';
    else if (p.type === 'INTEGER') s.kind = p.max != null && p.max <= 10 ? 'dots' : 'number';
    else if (p.type === 'BOOLEAN') { s.kind = 'flag'; s.default = !!p.default; }
    else s.kind = 'text';
    return s;
  }
  const spec = () => ((actor() || {}).props || []).map(fieldSpec);
  const field = (name) => spec().find((s) => s.name === name) || null;

  function blank() {
    const v = {};
    spec().forEach((s) => {
      v[s.name] = s.kind === 'rows' || s.kind === 'lines' ? [] : s.kind === 'dots' ? (s.min || 0) : s.kind === 'number' ? null : s.kind === 'flag' ? s.default : '';
    });
    return v;
  }
  function complete(v) {
    const out = blank();
    Object.keys(v || {}).forEach((k) => { if (v[k] != null) out[k] = Array.isArray(v[k]) ? v[k].slice() : v[k]; });
    return out;
  }

  // the dotted fields the sheet sets from 1 (Attributes) and from 0 (Skills), by declaration
  const attributes = () => spec().filter((s) => s.kind === 'dots' && s.min === 1 && s.max === 5).map((s) => s.name);
  const skills = () => spec().filter((s) => s.kind === 'dots' && s.min === 0 && s.max === 5).map((s) => s.name);

  // Health and Willpower from the summary's formulas
  function derived(v) {
    const n = (k) => +v[k] || 0;
    return { Health: n(HEALTH_FROM[0]) + HEALTH_FROM[1], Willpower: n(WILLPOWER_FROM[0]) + n(WILLPOWER_FROM[1]) };
  }

  // ── the Errata's Blood Potency chart: the row for this Blood Potency ──
  function potencyRow(bp) {
    const c = (D.index().corrections || []).find((x) => x.target && x.target.name === 'Blood Potency' && x.nested && x.nested.length);
    if (!c) return null;
    let table = null;
    c.nested.forEach((id) => {
      const walk = (e) => { if (!e) return; if (e.table) table = table || e.table; D.children(e.id).forEach(walk); };
      walk(D.entity(id));
    });
    if (!table) return null;
    const row = table.rows.find((r) => String(r[0]).trim() === String(bp));
    return row ? { columns: table.columns, row } : null;
  }

  // ── a sentence for who this is ──
  const traits = (v) => [v.Clan, v.Predator ? v.Predator : null, v.Generation ? v.Generation + 'th Generation' : null].filter(Boolean);
  function sentence(v) {
    const bits = traits(v);
    return [(v.Name || 'An unnamed Kindred')].concat(bits.length ? [bits.join(' · ')] : []).join(', ');
  }

  // ── controls ──
  function dots(value, min, max, onchange, cls) {
    return el('span', { class: 'dots' + (cls ? ' ' + cls : ''), role: 'radiogroup' }, Array.from({ length: max }, (_, i) => el('button', {
      type: 'button', class: 'dot' + (i < (value || 0) ? ' on' : ''), title: String(i + 1), 'aria-label': String(i + 1),
      onclick: onchange ? () => onchange(value === i + 1 && i + 1 > (min || 0) ? i : Math.max(min || 0, i + 1)) : null,
      disabled: onchange ? null : 'disabled',
    })));
  }

  function input(s, value, onchange) {
    if (s.kind === 'dots') return dots(value, s.min, s.max, onchange);
    if (s.kind === 'number') return el('input', { type: 'number', class: 'text num', value: value == null ? '' : value, min: s.min != null ? s.min : null, max: s.max != null ? s.max : null, onchange: (ev) => onchange(ev.target.value === '' ? null : +ev.target.value) });
    if (s.kind === 'enum') return el('select', { class: 'scope', onchange: (ev) => onchange(ev.target.value || null) }, [el('option', { value: '' }, ['—'])].concat(s.options.map((o) => el('option', { value: o, selected: o === value || null }, [o]))));
    if (s.kind === 'flag') return el('input', { type: 'checkbox', checked: value ? 'checked' : null, onchange: (ev) => onchange(ev.target.checked) });
    return el('input', { type: 'text', class: 'text', value: value || '', oninput: debounce((ev) => onchange(ev.target.value), 250) });
  }

  // A Discipline row's powers: the power records of that Discipline at or below its dots.
  function powersFor(discipline, dotsN) {
    return D.powers().filter((r) => r.discipline === discipline && (D.levelNumber(r) == null || D.levelNumber(r) <= (dotsN || 0)));
  }

  function rowsEditor(s, rows, onchange) {
    const box = el('div', { class: 'rows' });
    const draw = () => {
      box.innerHTML = '';
      rows.forEach((row, i) => {
        const line = el('div', { class: 'row-line' });
        s.fields.forEach((f) => {
          const set = (val) => { rows[i] = Object.assign({}, rows[i], { [f.name]: val }); onchange(rows.slice()); if (f.kind === 'enum' || f.kind === 'dots') draw(); };
          if (f.kind === 'lines' && s.of === 'Discipline Rating') {
            const have = row[f.name] || [];
            const opts = powersFor(row.Discipline, row.Dots);
            line.appendChild(el('div', { class: 'row-powers' }, [
              el('span', { class: 'prop-k' }, [f.name]),
              ...have.map((p, k) => el('span', { class: 'chip' }, [p, el('button', { type: 'button', class: 'ref tiny', onclick: () => { const h = have.slice(); h.splice(k, 1); set(h); draw(); } }, ['×'])])),
              opts.length ? el('select', { class: 'scope', onchange: (ev) => { if (ev.target.value) { set(have.concat([ev.target.value])); draw(); } } }, [el('option', { value: '' }, ['+ a power…'])].concat(
                opts.filter((r) => have.indexOf(r.name) === -1).map((r) => el('option', { value: r.name }, [(r.level ? r.level + ' · ' : '') + r.name + ' (' + (D.indexBook(r.book) || {}).label + ')'])))) : null,
            ]));
            return;
          }
          if (f.kind === 'lines') {
            line.appendChild(el('input', { type: 'text', class: 'text', placeholder: f.name, value: (row[f.name] || []).join(', '), onchange: (ev) => set(ev.target.value.split(',').map((x) => x.trim()).filter(Boolean)) }));
            return;
          }
          line.appendChild(el('label', { class: 'row-field' }, [el('span', { class: 'prop-k' }, [f.name]), input(f, row[f.name], set)]));
        });
        line.appendChild(button('remove', () => { rows.splice(i, 1); onchange(rows.slice()); draw(); }, 'ghost tiny'));
        box.appendChild(line);
      });
      box.appendChild(button('+ ' + s.of, () => { const r = {}; s.fields.forEach((f) => { r[f.name] = f.kind === 'lines' ? [] : f.kind === 'dots' ? (f.min || 0) : f.kind === 'flag' ? f.default : null; }); rows.push(r); onchange(rows.slice()); draw(); }, 'ghost tiny'));
    };
    draw();
    return box;
  }

  function linesEditor(s, lines, onchange) {
    const box = el('div', { class: 'lines' });
    const draw = () => {
      box.innerHTML = '';
      lines.forEach((t, i) => box.appendChild(el('div', { class: 'row-line' }, [
        el('input', { type: 'text', class: 'text', value: t, oninput: debounce((ev) => { lines[i] = ev.target.value; onchange(lines.slice()); }, 250) }),
        button('remove', () => { lines.splice(i, 1); onchange(lines.slice()); draw(); }, 'ghost tiny'),
      ])));
      box.appendChild(button('+ a line', () => { lines.push(''); onchange(lines.slice()); draw(); }, 'ghost tiny'));
    };
    draw();
    return box;
  }

  // ── the sheet: every declared field, in order; a run of dots labelled by its heading ──
  // opts: { edit(values) → called with the new values; readOnly; only: [field names] }
  function render(values, opts) {
    const o = opts || {};
    const v = complete(values);
    const set = (k, val) => { v[k] = val; if (o.edit) o.edit(Object.assign({}, v)); };
    const box = el('div', { class: 'vsheet' });
    const specs = o.only ? spec().filter((x) => o.only.indexOf(x.name) !== -1) : spec();
    let i = 0;
    while (i < specs.length) {
      const s = specs[i];
      if (s.kind === 'dots' && (s.max || 0) <= 5 && groupOf(s.name)) {
        // a run of dotted fields: grouped by the heading each sits under in the core
        const run = [];
        while (i < specs.length && specs[i].kind === 'dots' && specs[i].max <= 5 && groupOf(specs[i].name)) run.push(specs[i++]);
        const groups = [];
        run.forEach((f) => {
          const g = groupOf(f.name);
          if (!groups.length || groups[groups.length - 1].label !== g) groups.push({ label: g, fields: [] });
          groups[groups.length - 1].fields.push(f);
        });
        box.appendChild(el('div', { class: 'dot-groups' }, groups.map((g) => el('div', { class: 'dot-group' }, [
          el('div', { class: 'group-h' }, [g.label]),
          ...g.fields.map((f) => el('div', { class: 'dot-row' }, [el('span', { class: 'dot-k' }, [f.name]), o.readOnly ? dots(v[f.name], f.min, f.max) : input(f, v[f.name], (val) => set(f.name, val))])),
        ]))));
        continue;
      }
      i++;
      let control;
      if (s.kind === 'rows') control = o.readOnly ? readRows(s, v[s.name]) : rowsEditor(s, (v[s.name] || []).slice(), (rows) => set(s.name, rows));
      else if (s.kind === 'lines') control = o.readOnly ? el('ul', { class: 'items' }, (v[s.name] || []).filter(Boolean).map((t) => el('li', {}, [t]))) : linesEditor(s, (v[s.name] || []).slice(), (lines) => set(s.name, lines));
      else if (o.readOnly) control = s.kind === 'dots' ? dots(v[s.name], s.min, s.max) : el('span', {}, [v[s.name] == null || v[s.name] === '' ? '—' : String(v[s.name])]);
      else control = input(s, v[s.name], (val) => set(s.name, val));
      const hint = s.name in derived(v) ? el('span', { class: 'muted small' }, [' ' + (s.name === 'Health' ? HEALTH_FROM[0] + ' + ' + HEALTH_FROM[1] : WILLPOWER_FROM.join(' + ')) + ' = ' + derived(v)[s.name]]) : null;
      box.appendChild(el('div', { class: 'prop sheet-field f-' + s.kind }, [el('div', { class: 'prop-k' }, [s.name, s.required ? ' *' : '']), el('div', { class: 'prop-v' }, [control, hint])]));
      if (s.name === 'Blood Potency') {
        const pr = potencyRow(v['Blood Potency'] || 0);
        if (pr) box.appendChild(el('div', { class: 'potency' }, [
          el('div', { class: 'group-h' }, ['Blood Potency ' + (v['Blood Potency'] || 0) + ' · the Errata and Rules Update chart']),
          el('dl', { class: 'power-head' }, pr.columns.slice(1).map((c, k) => [el('dt', {}, [c]), el('dd', {}, [pr.row[k + 1] || '—'])])),
        ]));
      }
    }
    return box;
  }

  function readRows(s, rows) {
    return el('ul', { class: 'items' }, (rows || []).map((r) => el('li', {}, [s.fields.map((f) => {
      const x = r[f.name];
      if (x == null || x === '' || (Array.isArray(x) && !x.length)) return null;
      if (f.kind === 'dots') return ' ' + '●'.repeat(x) + '○'.repeat(Math.max(0, (f.max || 5) - x));
      if (f.kind === 'flag') return x ? ' (' + f.name + ')' : null;
      return (Array.isArray(x) ? ' — ' + x.join(', ') : ' ' + x);
    }).filter(Boolean).join('').trim()])));
  }

  // ── a character file ──
  function fileOf(values, live) {
    return { kind: FILE_KIND, v: 2, system: 'vtm5e', templateId: templateId(), name: values.Name || 'Unnamed', values: complete(values), live: live || {} };
  }
  function download(obj, name) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = String(name || 'kindred').replace(/[^\w.-]+/g, '-').toLowerCase() + '.vtm5e-character.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  const genId = () => 'pc-' + Math.random().toString(36).slice(2, 10);

  // A character file → its values (a v1 file from before D1 held only name and player).
  function valuesOf(obj) {
    if (obj.values) return complete(obj.values);
    const c = obj.character || {};
    return complete(Object.assign({}, c.values || c, { Name: obj.name || c.Name || c.name }));
  }

  function readMember(obj, fileName) {
    if (!obj || typeof obj !== 'object') throw new Error((fileName || 'That file') + ' is not a character file.');
    if (obj.system && obj.system !== 'vtm5e') throw new Error((fileName || 'That file') + ' is a ' + obj.system + ' character, not a Vampire one.');
    const values = valuesOf(obj);
    const name = String(values.Name || obj.name || '').trim();
    if (!name) throw new Error((fileName || 'That file') + ' has no character name.');
    values.Name = name;
    return { id: genId(), templateId: templateId(), name, source: { kind: 'file', name: fileName || null }, character: values, live: Object.assign({ hunger: +values.Hunger || 0 }, obj.live || {}), notes: '' };
  }
  function newMember(name, player) {
    const n = String(name || '').trim();
    if (!n) throw new Error('A character needs a name.');
    const values = blank();
    values.Name = n;
    if (player) values.player = String(player).trim();
    return { id: genId(), templateId: templateId(), name: n, source: { kind: 'table' }, character: values, live: { hunger: 0 }, notes: '' };
  }
  const downloadMember = (m) => download(fileOf(m.character || {}, m.live), m.name);

  // a member's sheet now: its file's values, overlaid by any edit made in play (live.sheet)
  // (a member held before the ACTOR — v1, decision 12 — carries only {name, player})
  const values = (m) => {
    const v = Object.assign({}, m.character || {}, (m.live || {}).sheet || {});
    if (!v.Name) v.Name = m.name || v.name || '';
    return complete(v);
  };
  const hunger = (m) => Math.max(0, Math.min(Dice.HUNGER_MAX, +((m.live || {}).hunger || 0)));
  // under the member's name (the heading), so it says what they are, not who
  const memberSentence = (m) => (traits(values(m)).join(' · ') || 'Kindred') + ' · Hunger ' + hunger(m) + ((values(m).player) ? ' · played by ' + values(m).player : '');

  // Every change to a character's trackers is one event in the log, with its cause: the live
  // patch and a { kind: 'track' } entry naming each track's before and after. A player may send
  // both for their own character (setPartyLive, appendLog with their memberId).
  const TRACK_LABEL = { hunger: 'Hunger', health: 'Health', willpower: 'Willpower', stains: 'Stains', Humanity: 'Humanity' };
  const trackText = (k, v) => (k === 'health' || k === 'willpower' ? (v && (v.sup || v.agg) ? [v.sup ? v.sup + ' Superficial' : null, v.agg ? v.agg + ' Aggravated' : null].filter(Boolean).join(', ') : 'unmarked') : String(v == null ? 0 : v));
  function change(m, patch, cause) {
    const cur = (live0(m));
    const changes = Object.keys(patch).filter((k) => k !== 'sheet' && trackText(k, cur[k]) !== trackText(k, patch[k]))
      .map((k) => [TRACK_LABEL[k] || k, trackText(k, cur[k]), trackText(k, patch[k])]);
    State().commit('setPartyLive', [m.id, patch]);
    if (changes.length) State().commit('appendLog', [{ at: Date.now(), kind: 'track', memberId: m.id, who: m.name || null, changes, cause: cause || null }]);
  }
  const live0 = (m) => ((State().state.party || []).find((x) => x.id === m.id) || m).live || {};
  // a tracker event in the log: "Hunger 1 → 2 · Rouse Check failed (3)"
  const trackLine = (x) => el('div', { class: 'roll-line track-line' }, [
    el('span', { class: 'roll-who' }, [x.who || 'A character']),
    el('span', { class: 'small' }, [(x.changes || []).map((c) => c[0] + ' ' + c[1] + ' → ' + c[2]).join(' · ')]),
    x.cause ? el('span', { class: 'muted small' }, [x.cause]) : null,
  ]);
  function setHunger(m, n, cause) { change(m, { hunger: Math.max(0, Math.min(Dice.HUNGER_MAX, n)) }, cause); }
  function setLive(m, patch, cause) { change(m, patch, cause || 'marked on the sheet'); }

  // Damage to a tracker of `size` boxes, level by level (Tracking Damage, Impairment):
  // "Mark each level of Superficial damage on the character sheet by making a “/” … Mark
  //  Aggravated damage … by making an “X”"; once full, "For every level of damage of either kind
  //  … that a character takes while Impaired, convert one previously sustained Superficial damage
  //  to Aggravated damage on a one-for-one basis." Halving is the caller's (a spent point of
  //  Willpower is already "a level of Superficial damage").
  function damage(size, t, kind, levels) {
    let sup = (t && t.sup) || 0, agg = (t && t.agg) || 0;
    for (let i = 0; i < levels; i++) {
      if (sup + agg < size) { if (kind === 'agg') agg++; else sup++; }
      else if (sup > 0) { sup--; agg++; }
    }
    return { sup, agg };
  }

  // ── trackers ──
  // A tracker's boxes: `size` boxes, Aggravated marked first from the left, then Superficial.
  function tracker(size, t, onchange) {
    const agg = Math.min(size, t.agg || 0);
    const sup = Math.min(size - agg, t.sup || 0);
    const boxes = Array.from({ length: size }, (_, i) => (i < agg ? 'agg' : i < agg + sup ? 'sup' : ''));
    return el('span', { class: 'tracker' }, boxes.map((k, i) => el('button', {
      type: 'button', class: 'tbox ' + k, title: k === 'agg' ? 'Aggravated' : k === 'sup' ? 'Superficial' : 'empty',
      // click cycles the box: empty → Superficial → Aggravated → empty
      onclick: onchange ? () => {
        const next = { sup, agg };
        if (k === '') next.sup = sup + 1;
        else if (k === 'sup') { next.sup = sup - 1; next.agg = agg + 1; }
        else next.agg = agg - 1;
        onchange(next);
      } : null,
    }, [k ? MARK[k] : ''])));
  }
  const impaired = (size, t) => size > 0 && ((t.sup || 0) + (t.agg || 0)) >= size;

  // Humanity with its Stains: dots from the left, Stains checked from the right.
  function humanityTrack(h, stains, onStains) {
    return el('span', { class: 'tracker humanity' }, Array.from({ length: 10 }, (_, i) => {
      const stained = i >= 10 - stains;
      const k = i < h ? 'dot-on' : stained ? 'stain' : '';
      return el('button', { type: 'button', class: 'tbox ' + k, title: k === 'stain' ? 'Stain' : i < h ? 'Humanity' : 'empty',
        onclick: onStains ? () => onStains(stained ? Math.max(0, stains - 1) : Math.min(10 - h, 10 - i)) : null,
      }, [k === 'stain' ? '/' : k === 'dot-on' ? '●' : '']);
    }));
  }

  // One roller per member (and per page role), kept across redraws — the panels redraw on
  // every state change, a roll's own log entry is one.
  const rollers = {};
  function rollerFor(m, o) {
    const key = m.id + (o.player ? ':player' : ':gm');
    let r = rollers[key];
    if (!r) {
      const id = m.id;
      r = rollers[key] = Dice.roller({
        pool: 4, hunger: hunger(m), who: m.name,
        onRule: o.onRule || window.VtmOpenEntity,
        onHunger: (n, cause) => setHunger({ id, name: m.name }, n, cause),
        onRoll: (entry) => State().commit('appendLog', [Object.assign(entry, { memberId: id })]),
        onWillpower: (dice) => spendWillpower({ id, name: m.name }, 'Willpower re-roll of ' + dice + (dice === 1 ? ' die' : ' dice')),
      });
    } else if (r.hunger() !== hunger(m)) r.setHunger(hunger(m));
    return r;
  }

  // "A spent point of Willpower counts as having sustained a level of Superficial damage to
  //  Willpower" — Willpower
  function spendWillpower(m, cause) {
    const cur = (State().state.party || []).find((x) => x.id === m.id) || m;
    const v = values(cur);
    const size = +v.Willpower || derived(v).Willpower;
    change(cur, { willpower: damage(size, live0(cur).willpower || {}, 'sup', 1) }, cause);
  }

  // Build a pool from the sheet: an Attribute plus a Skill or a Discipline.
  function poolBuilder(m, roller) {
    const v = values(m);
    const live = m.live || {};
    const sheetH = +v.Health || derived(v).Health;
    const sheetW = +v.Willpower || derived(v).Willpower;
    const attrSel = el('select', { class: 'scope' }, [el('option', { value: '' }, ['Attribute…'])].concat(attributes().map((a) => el('option', { value: a }, [a + ' ' + (v[a] || 0)]))));
    const second = el('select', { class: 'scope' }, [el('option', { value: '' }, ['+ Skill or Discipline…'])].concat(
      skills().map((s) => el('option', { value: 'S:' + s }, [s + ' ' + (v[s] || 0)])),
      (v.Disciplines || []).filter((d) => d.Discipline).map((d) => el('option', { value: 'D:' + d.Discipline }, [d.Discipline + ' ' + (d.Dots || 0)])),
    ));
    const note = el('span', { class: 'muted small' });
    const apply = () => {
      const a = attrSel.value;
      if (!a) return;
      let n = +v[a] || 0;
      let label = a;
      const s2 = second.value;
      if (s2.startsWith('S:')) { n += +v[s2.slice(2)] || 0; label += ' + ' + s2.slice(2); }
      if (s2.startsWith('D:')) { const d = (v.Disciplines || []).find((x) => x.Discipline === s2.slice(2)); n += +(d && d.Dots) || 0; label += ' + ' + s2.slice(2); }
      // Impairment: Physical pools from a full Health tracker, Social and Mental from Willpower
      const g = groupOf(a) || '';
      let pen = 0;
      if (/Physical/.test(g) && impaired(sheetH, live.health || {})) pen = IMPAIRED_PENALTY;
      if (/Social|Mental/.test(g) && impaired(sheetW, live.willpower || {})) pen = IMPAIRED_PENALTY;
      note.textContent = pen ? ' Impaired: −' + pen : '';
      roller.setPool(Math.max(0, n - pen), label + (pen ? ' (Impaired −' + pen + ')' : ''));
    };
    attrSel.addEventListener('change', apply);
    second.addEventListener('change', apply);
    return el('div', { class: 'chiprow tight' }, [el('span', { class: 'prop-k' }, ['Pool']), attrSel, second, note]);
  }

  // The live panel: trackers, Hunger, Humanity and Stains, the roller, the sheet, notes.
  // opts: { player, onRule }
  function live(m, opts) {
    const o = opts || {};
    const v = values(m);
    const lv = m.live || {};
    const box = el('div', { class: 'sheet live' });
    box.appendChild(el('div', { class: 'sheet-head' }, [el('h2', { class: 'chapter-h' }, [m.name]), el('div', { class: 'entity-sub' }, [memberSentence(m)])]));
    const hSize = +v.Health || derived(v).Health;
    const wSize = +v.Willpower || derived(v).Willpower;
    const ruleLink = (id, label) => el('a', { class: 'rule-link small', href: '#', onclick: (ev) => { ev.preventDefault(); (o.onRule || window.VtmOpenEntity)(id); } }, [label]);
    const h = +v.Humanity || 0;
    const stains = +lv.stains || 0;
    box.appendChild(el('div', { class: 'trackers' }, [
      el('div', { class: 'track' }, [el('span', { class: 'prop-k' }, ['Health']), tracker(hSize, lv.health || {}, (t) => setLive(m, { health: t })), impaired(hSize, lv.health || {}) ? el('span', { class: 'verdict-bit blood' }, ['Impaired']) : null]),
      el('div', { class: 'track' }, [el('span', { class: 'prop-k' }, ['Willpower']), tracker(wSize, lv.willpower || {}, (t) => setLive(m, { willpower: t })), impaired(wSize, lv.willpower || {}) ? el('span', { class: 'verdict-bit blood' }, ['Impaired']) : null]),
      el('div', { class: 'track' }, [el('span', { class: 'prop-k' }, ['Humanity']), humanityTrack(h, stains, (n) => setLive(m, { stains: n })),
        stains > 10 - h ? el('span', { class: 'verdict-bit blood' }, ['Degeneration']) : null,
        stains ? button('Remorse test', () => {
          const n = Math.max(REMORSE_MIN, 10 - h - stains);
          const dice = Dice.rollPool(n, 0, true);
          const res = Dice.evaluate(dice, null);
          State().commit('appendLog', [Object.assign(Dice.entry({ who: m.name, label: 'Remorse', pool: n, hunger: 0, difficulty: 1, dice }), { memberId: m.id })]);
          const values2 = Object.assign({}, v);
          if (res.successes < 1) values2.Humanity = Math.max(0, h - 1);
          const lost = values2.Humanity !== v.Humanity;
          change(m, lost ? { stains: 0, sheet: values2 } : { stains: 0 }, 'Remorse test: ' + res.successes + (res.successes === 1 ? ' success' : ' successes') + (lost ? ' — Humanity ' + h + ' → ' + values2.Humanity : ''));
        }, 'ghost tiny') : null]),
      el('div', { class: 'muted small' }, ['Click a box: empty → ', MARK.sup, ' Superficial → ', MARK.agg, ' Aggravated. ', ruleLink(RULES.tracking, 'Tracking Damage'), ' · ', ruleLink(RULES.impairment, 'Impairment'), ' · ', ruleLink(RULES.stains, 'Stains'), ' · ', ruleLink(RULES.remorse, 'Remorse')]),
    ]));
    const roller = rollerFor(m, o);
    box.appendChild(poolBuilder(m, roller));
    box.appendChild(roller);
    box.appendChild(el('details', { class: 'sheet-details', open: o.player ? 'open' : null }, [
      el('summary', {}, ['The sheet']),
      render(v, { edit: o.player || o.gmEdit !== false ? (nv) => updateValues(m, nv) : null }),
    ]));
    if (!o.player) {
      box.appendChild(el('div', { class: 'prop-k' }, ['Storyteller’s notes', el('span', { class: 'muted' }, [' · never sent to players'])]));
      box.appendChild(el('textarea', { class: 'text', rows: 4, oninput: debounce((ev) => State().commit('setPartyNotes', [m.id, ev.target.value]), 400) }, [m.notes || '']));
    }
    box.appendChild(el('div', { class: 'prop-k' }, [o.player ? 'My notes' : 'The player’s notes']));
    box.appendChild(el('textarea', { class: 'text', rows: 3, readonly: o.player ? null : 'readonly', oninput: o.player ? debounce((ev) => State().commit('setPartyPlayerNotes', [m.id, ev.target.value]), 400) : null }, [m.playerNotes || '']));
    box.appendChild(el('div', { class: 'chiprow' }, [button('Download character file', () => downloadMember(m), 'ghost tiny')]));
    return box;
  }

  // An edit made in play rides in the member's live state (the engine's setPartyLive, which a
  // player may send for their own character); the file's values stay as they were loaded.
  function updateValues(m, nv) {
    State().commit('setPartyLive', [m.id, { sheet: nv }]);
  }

  return {
    ACTOR, BOOKS, FILE_KIND, OLD_TEMPLATE_ID, HEALTH_FROM, WILLPOWER_FROM, RULES,
    spec, field, blank, complete, attributes, skills, derived, potencyRow, groupOf, sentence, render,
    fileOf, download, readMember, newMember, downloadMember, values, hunger, setHunger, change, damage, spendWillpower, trackLine,
    memberSentence, live, powersFor, templateId,
  };
})();
