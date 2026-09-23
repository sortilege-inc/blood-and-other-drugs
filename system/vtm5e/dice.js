// system/vtm5e/dice.js — the Vampire dice: pools with Hunger, criticals, messy criticals,
// bestial failures, Willpower re-rolls, Rouse Checks. Shared by the site's Dice tab, the
// Storyteller characters' pools, the GM's Dice panel and the log.
//
// Every number here is one the rules state only in prose: a named constant, its sentence
// quoted beside it, the rule it comes from named by id (RULES) so the page can open it.
// check_shape.py asserts each id is in the corpus under that name.
window.VtmDice = (function () {
  const R = window.VttRender;

  // The rules the roller reads, by id and printed name (core rulebook).
  const RULES = {
    results: { id: '#vC2ZKAi4zuZAOidwOHWnVIT', name: 'Dice Pool Results' },
    criticals: { id: '#v9miVdx2IK6S0CZlW1mejsa', name: 'Criticals' },
    hungerDice: { id: '#v6LUS8pIRLAJV0CS6H66aho', name: 'Hunger Dice' },
    hunger: { id: '#vV3JNCjYSa8OEnCyOxW1TQL', name: 'Hunger' },
    messy: { id: '#v7Og1ahDGqCeuFCda29x9t4', name: 'Messy Critical' },
    bestial: { id: '#v4gQZNcyeqnzROeeaX1DRaZ', name: 'Bestial Failure' },
    willpower: { id: '#vZ7Ni3tOrPuUI4pFT0cc0VN', name: 'Willpower' },
    totalFailure: { id: '#vjTieJA2OTlDN98zy4II5Ke', name: 'Total Failure' },
    winAtCost: { id: '#vQ2LuUH1eX2vJIoC3WTXtdm', name: 'Win at a Cost' },
    margin: { id: '#v97HP5FymeoRpSUz0kTLUoK', name: 'Margin' },
    checks: { id: '#v10w0gdVHbJ63tG0munfJOC', name: 'Checks' },
    rouse: { id: '#vvuLXMTKNtUlmyl4Aebtg2H', name: 'Rousing the Blood' },
  };

  // "every individual die result of 6 or higher is a *success*, including a result of 10"
  //   — Dice Pool Results
  const SUCCESS_AT = 6;
  // "A result of 10 on two regular dice (00) is a *critical success*. A critical success
  //  counts as two additional successes above the two 10s (four total successes)"
  //   — Criticals; "Each pair of 10s count as their own critical success" (Examples of Rolls
  //   Using Regular Dice), and a Hunger 10 pairs with a regular one (the Hunger Dice sidebar:
  //   "4 for the critical success ([Regular Die: Critical]+ [Hunger Die: Messy Critical])")
  const CRIT_FACE = 10;
  const PAIR_BONUS = 2;
  // "all vampires have a unique trait, Hunger, measured in levels ranging from 0 to 5" — Hunger
  const HUNGER_MAX = 5;
  // "they exchange regular dice from that pool for Hunger dice on a one-for-one basis. If the
  //  dice pool for the roll is lower than the character’s Hunger, simply roll a number of
  //  Hunger dice equal to the dice pool. The exception: Characters never include Hunger dice
  //  in Checks, Willpower, or Humanity dice pools." — Hunger Dice
  // "rolling a 0 (10) or 1 on a Hunger die carries additional consequences" — Hunger Dice
  const BESTIAL_FACE = 1;
  // "Characters may spend 1 point of Willpower to re-roll up to three regular dice"
  //   — Willpower
  const WILLPOWER_REROLL = 3;
  // "To make a Rouse Check, the player rolls a single die. As always, a result of 6 or higher
  //  succeeds. … On a failure, the vampire gains 1 more point of Hunger" — Rousing the Blood;
  // "allow the player to roll two dice on some Rouse Checks and pick the highest"
  const ROUSE_HUNGER = 1;

  function d10() {
    const a = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return (a[0] % 10) + 1;
  }

  // ── a pool ─────────────────────────────────────────────────────────
  // { pool, hunger, noHunger } → dice [{kind:'regular'|'hunger', face}]
  function rollPool(pool, hunger, noHunger) {
    const n = Math.max(0, Math.floor(+pool || 0));
    const h = noHunger ? 0 : Math.min(n, Math.max(0, Math.min(HUNGER_MAX, Math.floor(+hunger || 0))));
    const dice = [];
    for (let i = 0; i < n - h; i++) dice.push({ kind: 'regular', face: d10() });
    for (let i = 0; i < h; i++) dice.push({ kind: 'hunger', face: d10() });
    return dice;
  }

  // What a set of dice comes to against a Difficulty (null = no Difficulty set: a contest,
  // or the Storyteller keeps it secret — then only what the dice alone decide is reported).
  function evaluate(dice, difficulty) {
    const diff = difficulty == null || difficulty === '' ? null : Math.max(0, +difficulty);
    const hits = dice.filter((d) => d.face >= SUCCESS_AT).length;
    const tens = dice.filter((d) => d.face === CRIT_FACE).length;
    const pairs = Math.floor(tens / 2);
    const successes = hits + pairs * PAIR_BONUS;
    const hungerTen = dice.some((d) => d.kind === 'hunger' && d.face === CRIT_FACE);
    const hungerOne = dice.some((d) => d.kind === 'hunger' && d.face === BESTIAL_FACE);
    const win = diff == null ? null : successes >= diff;
    const out = { successes, pairs, difficulty: diff, win, margin: win ? successes - diff : null };
    out.critical = pairs > 0 && win !== false;
    // "A critical win in which one or more 10s appears on a Hunger die is a messy critical."
    out.messy = out.critical && hungerTen;
    // "A failed roll … in which one or more Hunger dice come up a 1 is a bestial failure."
    out.bestial = win === false && hungerOne;
    // with no Difficulty the dice can only say what WOULD follow
    out.bestialIfFailed = win == null && hungerOne;
    out.totalFailure = successes === 0;                   // "no successes at all" — Total Failure
    out.winAtCost = win === false && successes > 0;        // "any successes, but fails" — Win at a Cost
    return out;
  }

  // Willpower: re-roll up to three REGULAR dice (by index); Hunger dice never.
  function reroll(dice, indices) {
    const pick = (indices || []).filter((i) => dice[i] && dice[i].kind === 'regular').slice(0, WILLPOWER_REROLL);
    return dice.map((d, i) => (pick.indexOf(i) !== -1 ? { kind: d.kind, face: d10(), was: d.face } : d));
  }

  // A Rouse Check: one die (two, keep the highest, when the Blood allows a re-roll).
  function rouse(twoDice) {
    const faces = [d10()].concat(twoDice ? [d10()] : []);
    const best = Math.max.apply(null, faces);
    return { faces, face: best, success: best >= SUCCESS_AT, hungerGain: best >= SUCCESS_AT ? 0 : ROUSE_HUNGER };
  }

  // ── faces ──────────────────────────────────────────────────────────
  // The face a die shows, in the book's own words for the symbols (the Using the Vampire
  // Dice sidebars): regular 1-5 Failure, 6-9 Success, 10 Critical; Hunger 1 Bestial
  // Failure, 2-5 Failure, 6-9 Success, 10 Messy Critical.
  function faceOf(d) {
    if (d.kind === 'hunger') {
      if (d.face === CRIT_FACE) return 'messy-critical';
      if (d.face === BESTIAL_FACE) return 'bestial-failure';
      return d.face >= SUCCESS_AT ? 'success' : 'failure';
    }
    if (d.face === CRIT_FACE) return 'critical';
    return d.face >= SUCCESS_AT ? 'success' : 'failure';
  }
  const ART = { critical: 'critical', success: 'success', 'messy-critical': 'messy-critical', 'bestial-failure': 'bestial-failure' };
  function artSrc(face) {
    const map = (window.VtmArt && window.VtmArt.dice) || {};
    const key = ART[face];
    return key && map[key] ? window.VtmData.artUrl(map[key].src) : null;
  }

  // One die, drawn with the pack's face; the number is its title.
  function dieEl(d, opts) {
    const o = opts || {};
    const face = faceOf(d);
    const src = artSrc(face);
    const el = R.el('span', {
      class: 'die die-' + d.kind + ' face-' + face + (o.selected ? ' selected' : '') + (d.was ? ' rerolled' : '') + (o.onclick ? ' clickable' : ''),
      title: (d.kind === 'hunger' ? 'Hunger die' : 'Regular die') + ': ' + d.face + (d.was ? ' (re-rolled from ' + d.was + ')' : ''),
      role: o.onclick ? 'button' : null,
      tabindex: o.onclick ? '0' : null,
      onclick: o.onclick || null,
    }, [src ? R.el('span', { class: 'die-mark', style: '--mark:url("' + src + '")' }) : R.el('span', { class: 'die-n' }, [String(d.face)])]);
    return el;
  }

  // The book writes its die glyphs as "[Regular Die: Critical]" etc.; the reader draws them.
  const TOKEN = /\[(Regular|Hunger) Die: (Critical|Success|Failure|Messy Critical|Bestial Failure)\]/g;
  function tokenHtml(kind, word) {
    const face = word.toLowerCase().replace(/ /g, '-');
    const src = artSrc(face);
    const label = '[' + kind + ' Die: ' + word + ']';
    return '<span class="die die-inline die-' + kind.toLowerCase() + ' face-' + face + '" title="' + label + '" aria-label="' + label + '">' +
      (src ? '<span class="die-mark" style="--mark:url(&quot;' + src + '&quot;)"></span>' : '') + '</span>';
  }

  // Pools a Storyteller character prints ("Physical 4, Social 3, Mental 3",
  // "Brawl 5, Firearms 5") → [{label, n}]. Read from the text as printed; nothing added.
  function poolsIn(text) {
    const out = [];
    String(text || '').split(/[,;]/).forEach((part) => {
      const m = /^\s*([A-Z][A-Za-z’' ()/-]*?)\s+(\d{1,2})\s*$/.exec(part);
      if (m) out.push({ label: m[1].trim(), n: +m[2] });
    });
    return out;
  }

  // ── what a roll says, in the rules' own names ──────────────────────
  function verdict(res) {
    const bits = [];
    bits.push({ text: res.successes + (res.successes === 1 ? ' success' : ' successes'), rule: 'results' });
    if (res.win === true) bits.push({ text: 'win' + (res.margin ? ' · margin ' + res.margin : ''), rule: res.margin ? 'margin' : 'results', cls: 'good' });
    if (res.win === false) bits.push({ text: 'fail', rule: 'results', cls: 'bad' });
    if (res.critical) bits.push({ text: res.win === null ? 'critical' : 'critical win', rule: 'criticals', cls: 'good' });
    if (res.messy) bits.push({ text: 'messy critical', rule: 'messy', cls: 'blood' });
    if (res.bestial) bits.push({ text: 'bestial failure', rule: 'bestial', cls: 'blood' });
    if (res.bestialIfFailed) bits.push({ text: 'bestial failure if the test fails', rule: 'bestial', cls: 'blood' });
    if (res.totalFailure) bits.push({ text: 'total failure', rule: 'totalFailure', cls: 'bad' });
    if (res.winAtCost) bits.push({ text: 'the Storyteller may offer a win at a cost', rule: 'winAtCost' });
    return bits;
  }

  function verdictEl(res, onRule) {
    return R.el('div', { class: 'verdict' }, verdict(res).map((b) => R.el('a', {
      class: 'verdict-bit ' + (b.cls || ''), href: '#', title: RULES[b.rule].name,
      onclick: (ev) => { ev.preventDefault(); if (onRule) onRule(RULES[b.rule].id); },
    }, [b.text])));
  }

  // A log entry for a roll, and its line in the log.
  function entry(o) {
    return {
      at: Date.now(), kind: 'roll', who: o.who || null, label: o.label || null,
      mode: o.mode || 'pool', pool: o.pool, hunger: o.hunger, difficulty: o.difficulty == null ? null : o.difficulty,
      dice: o.dice.map((d) => [d.kind === 'hunger' ? 'h' : 'r', d.face, d.was || 0]),
      willpower: !!o.willpower, hungerGain: o.hungerGain || 0,
    };
  }
  const fromEntry = (x) => (x.dice || []).map((a) => ({ kind: a[0] === 'h' ? 'hunger' : 'regular', face: a[1], was: a[2] || undefined }));

  function rollLine(x, onRule) {
    const dice = fromEntry(x);
    const head = [x.who, x.label].filter(Boolean).join(' · ') || (x.mode === 'rouse' ? 'Rouse Check' : 'Roll');
    const bits = [R.el('span', { class: 'roll-who' }, [head])];
    bits.push(R.el('span', { class: 'dice-row small' }, dice.map((d) => dieEl(d))));
    if (x.mode === 'rouse') {
      bits.push(R.el('span', { class: 'verdict-bit ' + (x.hungerGain ? 'blood' : 'good') }, [x.hungerGain ? 'Hunger +' + x.hungerGain : 'Hunger unchanged']));
    } else {
      const res = evaluate(dice, x.difficulty);
      bits.push(R.el('span', { class: 'muted small' }, [(x.willpower ? 'Willpower re-roll · ' : '') + (x.difficulty != null ? 'Difficulty ' + x.difficulty : 'no Difficulty')]));
      bits.push(verdictEl(res, onRule));
    }
    return R.el('div', { class: 'roll-line' }, bits);
  }

  // ── the roller: pool, Hunger, Difficulty, re-roll, Rouse ───────────
  // opts: { pool, hunger, difficulty, label, who, onRoll(entry), onRule(id), onHunger(n) }
  function roller(opts) {
    const o = Object.assign({ pool: 5, hunger: 1, difficulty: '' }, opts || {});
    let state = { pool: o.pool, hunger: o.hunger, difficulty: o.difficulty, noHunger: false, twoRouse: false, dice: null, selected: [], rerolled: false, rouse: null };
    const box = R.el('div', { class: 'roller' });

    function stepper(label, key, min, max) {
      const v = R.el('span', { class: 'step-v' }, [String(state[key] === '' ? '—' : state[key])]);
      const set = (n) => { state[key] = n; draw(); };
      return R.el('div', { class: 'step' }, [
        R.el('div', { class: 'step-k' }, [label]),
        R.el('div', { class: 'step-row' }, [
          R.el('button', { type: 'button', class: 'step-b', onclick: () => set(state[key] === '' ? min : Math.max(min, state[key] - 1)) }, ['−']),
          v,
          R.el('button', { type: 'button', class: 'step-b', onclick: () => set(state[key] === '' ? min : Math.min(max, state[key] + 1)) }, ['+']),
          key === 'difficulty' && state[key] !== '' ? R.el('button', { type: 'button', class: 'step-b ghost', title: 'No Difficulty', onclick: () => set('') }, ['×']) : null,
        ]),
      ]);
    }
    function hungerTrack() {
      const teeth = window.VtmArt && window.VtmArt.dice && window.VtmArt.dice.teeth;
      return R.el('div', { class: 'step' }, [
        R.el('div', { class: 'step-k' }, ['Hunger']),
        R.el('div', { class: 'hunger-track', role: 'radiogroup', 'aria-label': 'Hunger' }, Array.from({ length: HUNGER_MAX + 1 }, (_, i) => R.el('button', {
          type: 'button', class: 'hunger-pip' + (i === 0 ? ' zero' : '') + (i <= state.hunger && i > 0 ? ' on' : ''), title: 'Hunger ' + i, 'aria-checked': String(i === state.hunger), role: 'radio',
          onclick: () => { state.hunger = i; if (o.onHunger) o.onHunger(i); draw(); },
        }, [i === 0 ? '0' : teeth ? R.el('span', { class: 'die-mark', style: '--mark:url("' + window.VtmData.artUrl(teeth.src) + '")' }) : String(i)]))),
      ]);
    }
    function doRoll() {
      state.dice = rollPool(state.pool, state.hunger, state.noHunger);
      state.selected = [];
      state.rerolled = false;
      state.rouse = null;
      if (o.onRoll) o.onRoll(entry({ who: o.who, label: o.label, pool: state.pool, hunger: state.noHunger ? 0 : state.hunger, difficulty: state.difficulty === '' ? null : state.difficulty, dice: state.dice }));
      draw();
    }
    function doReroll() {
      state.dice = reroll(state.dice, state.selected);
      state.selected = [];
      state.rerolled = true;
      if (o.onRoll) o.onRoll(entry({ who: o.who, label: o.label, pool: state.pool, hunger: state.noHunger ? 0 : state.hunger, difficulty: state.difficulty === '' ? null : state.difficulty, dice: state.dice, willpower: true }));
      draw();
    }
    function doRouse() {
      const r = rouse(state.twoRouse);
      state.rouse = r;
      state.dice = null;
      if (r.hungerGain && state.hunger < HUNGER_MAX) {
        state.hunger = Math.min(HUNGER_MAX, state.hunger + r.hungerGain);
        if (o.onHunger) o.onHunger(state.hunger);
      }
      if (o.onRoll) o.onRoll(entry({ who: o.who, label: 'Rouse Check', mode: 'rouse', pool: r.faces.length, hunger: 0, dice: r.faces.map((f) => ({ kind: 'regular', face: f })), hungerGain: r.hungerGain }));
      draw();
    }
    const rule = (k) => R.el('a', { class: 'rule-link', href: '#', onclick: (ev) => { ev.preventDefault(); if (o.onRule) o.onRule(RULES[k].id); } }, [RULES[k].name]);

    function draw() {
      box.innerHTML = '';
      box.appendChild(R.el('div', { class: 'roller-controls' }, [
        stepper('Dice pool', 'pool', 0, 30),
        hungerTrack(),
        stepper('Difficulty', 'difficulty', 0, 15),
      ]));
      box.appendChild(R.el('div', { class: 'chiprow' }, [
        R.el('button', { type: 'button', class: 'btn roll-btn', onclick: doRoll }, ['Roll ' + state.pool + (state.noHunger ? '' : ' · ' + Math.min(state.pool, state.hunger) + ' Hunger')]),
        R.el('button', { type: 'button', class: 'btn ghost', onclick: doRouse, title: 'One die; 6 or higher and Hunger holds' }, ['Rouse Check']),
        R.el('label', { class: 'small' }, [R.el('input', { type: 'checkbox', checked: state.twoRouse || null, onchange: (ev) => { state.twoRouse = ev.target.checked; } }), ' two dice, keep the highest']),
        R.el('label', { class: 'small' }, [R.el('input', { type: 'checkbox', checked: state.noHunger || null, onchange: (ev) => { state.noHunger = ev.target.checked; draw(); } }), ' no Hunger dice (a check, a Willpower or a Humanity roll)']),
      ]));
      if (state.dice) {
        const res = evaluate(state.dice, state.difficulty === '' ? null : state.difficulty);
        const canPick = !state.rerolled;
        box.appendChild(R.el('div', { class: 'dice-row' }, state.dice.map((d, i) => dieEl(d, {
          selected: state.selected.indexOf(i) !== -1,
          onclick: canPick && d.kind === 'regular' ? () => {
            const k = state.selected.indexOf(i);
            if (k !== -1) state.selected.splice(k, 1);
            else if (state.selected.length < WILLPOWER_REROLL) state.selected.push(i);
            draw();
          } : null,
        }))));
        box.appendChild(verdictEl(res, o.onRule));
        if (canPick && state.dice.some((d) => d.kind === 'regular')) {
          box.appendChild(R.el('div', { class: 'chiprow small' }, [
            R.el('span', { class: 'muted' }, ['Pick up to ' + WILLPOWER_REROLL + ' regular dice, then ']),
            R.el('button', { type: 'button', class: 'btn ghost tiny', disabled: state.selected.length ? null : 'disabled', onclick: doReroll }, ['re-roll with Willpower (' + state.selected.length + ')']),
            R.el('span', { class: 'muted' }, ['· ']), rule('willpower'),
          ]));
        }
      }
      if (state.rouse) {
        const r = state.rouse;
        box.appendChild(R.el('div', { class: 'dice-row' }, r.faces.map((f) => dieEl({ kind: 'regular', face: f }))));
        box.appendChild(R.el('div', { class: 'verdict' }, [
          R.el('span', { class: 'verdict-bit ' + (r.success ? 'good' : 'blood') }, [r.success ? 'Hunger unchanged' : 'Hunger +' + r.hungerGain + ' → ' + state.hunger]),
          rule('rouse'),
        ]));
      }
      box.appendChild(R.el('div', { class: 'rules-row muted small' }, ['The rules: ', rule('results'), ' · ', rule('criticals'), ' · ', rule('hungerDice'), ' · ', rule('messy'), ' · ', rule('bestial'), ' · ', rule('checks')]));
    }
    box.setPool = (n, label) => { state.pool = n; o.label = label || o.label; state.dice = null; state.rouse = null; draw(); };
    box.setHunger = (n) => { state.hunger = n; draw(); };
    draw();
    return box;
  }

  return {
    RULES, SUCCESS_AT, CRIT_FACE, HUNGER_MAX, WILLPOWER_REROLL,
    rollPool, evaluate, reroll, rouse, faceOf, dieEl, tokenHtml, TOKEN, poolsIn, verdict, verdictEl,
    entry, fromEntry, rollLine, roller,
  };
})();
