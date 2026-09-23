// system/vtm5e/sheet.js — a party member at the table.
//
// The playbook derives a character sheet from the corpus's ACTOR declaration (PLAYBOOK §1b).
// This corpus declares none yet — PLAN.md D1 proposes one from the printed sheet — so until
// it lands a member holds only what the table needs from any Kindred and what the rules
// themselves define: a name, who plays them, and their current Hunger ("measured in levels
// ranging from 0 to 5", VtmDice.HUNGER_MAX). Nothing here hand-lists a sheet; when D1 lands
// the sheet is derived from the ACTOR and this file grows the rest.
//
//   member  { id, templateId, name, source:{kind,name}, character:{name, player}, live:{hunger}, notes, playerNotes }
//   file    { kind:'sortilege-vtt-character', v:1, system:'vtm5e', templateId, name, character, live }
window.VtmSheet = (function () {
  const { el, button, debounce } = window.VttRender;
  const Dice = window.VtmDice;
  const State = () => window.VttState;

  // Until D1 declares the character, members carry this template id; D1 replaces it with the
  // ACTOR's hash and a file with the old id still reads (readMember takes either).
  const TEMPLATE_ID = 'vtm5e-character';
  const FILE_KIND = 'sortilege-vtt-character';

  const genId = () => 'pc-' + Math.random().toString(36).slice(2, 10);

  function newMember(name, player) {
    const n = String(name || '').trim();
    if (!n) throw new Error('A character needs a name.');
    return { id: genId(), templateId: TEMPLATE_ID, name: n, source: { kind: 'table' }, character: { name: n, player: String(player || '').trim() }, live: { hunger: 0 }, notes: '' };
  }

  // A character file (or a member saved from the table) → a party member.
  function readMember(obj, fileName) {
    if (!obj || typeof obj !== 'object') throw new Error((fileName || 'That file') + ' is not a character file.');
    if (obj.system && obj.system !== 'vtm5e') throw new Error((fileName || 'That file') + ' is a ' + obj.system + ' character, not a Vampire one.');
    const character = Object.assign({}, obj.character || {});
    const name = String(obj.name || character.name || '').trim();
    if (!name) throw new Error((fileName || 'That file') + ' has no character name.');
    character.name = character.name || name;
    const live = Object.assign({ hunger: 0 }, obj.live || {});
    return { id: genId(), templateId: obj.templateId || TEMPLATE_ID, name, source: { kind: 'file', name: fileName || null }, character, live, notes: '' };
  }

  function fileOf(m) {
    return { kind: FILE_KIND, v: 1, system: 'vtm5e', templateId: m.templateId || TEMPLATE_ID, name: m.name, character: m.character || { name: m.name }, live: m.live || {} };
  }

  function downloadMember(m) {
    const blob = new Blob([JSON.stringify(fileOf(m), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = m.name.replace(/[^\w.-]+/g, '-').toLowerCase() + '.vtm5e-character.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  const hunger = (m) => Math.max(0, Math.min(Dice.HUNGER_MAX, +((m.live || {}).hunger || 0)));
  const sentence = (m) => [(m.character || {}).player ? 'played by ' + m.character.player : null, 'Hunger ' + hunger(m)].filter(Boolean).join(' · ');

  function setHunger(m, n) {
    State().commit('setPartyLive', [m.id, { hunger: Math.max(0, Math.min(Dice.HUNGER_MAX, n)) }]);
  }

  // One roller per member (and per page role), kept across redraws: the panels redraw on
  // every state change — a roll's own log entry is one — and a fresh roller would wipe the
  // result the player is looking at. A redraw only brings its Hunger up to date.
  const rollers = {};
  function rollerFor(m, o) {
    const key = m.id + (o.player ? ':player' : ':gm');
    let r = rollers[key];
    if (!r) {
      const id = m.id;
      r = rollers[key] = Dice.roller({
        pool: 4, hunger: hunger(m), who: m.name,
        onRule: o.onRule || window.VtmOpenEntity,
        onHunger: (n) => setHunger({ id }, n),
        onRoll: (entry) => State().commit('appendLog', [Object.assign(entry, { memberId: id })]),
      });
    } else if (r.hunger() !== hunger(m)) r.setHunger(hunger(m));
    return r;
  }

  // The live panel: Hunger, the roller bound to it, notes. opts: { player, onRule }
  function live(m, opts) {
    const o = opts || {};
    const box = el('div', { class: 'sheet live' });
    box.appendChild(el('div', { class: 'sheet-head' }, [
      el('h2', { class: 'chapter-h' }, [m.name]),
      el('div', { class: 'entity-sub' }, [sentence(m)]),
    ]));
    box.appendChild(rollerFor(m, o));
    if (!o.player) {
      box.appendChild(el('p', { class: 'muted small' }, ['Attributes, Skills, Disciplines and the Health and Willpower trackers arrive when the corpus declares the character sheet (PLAN.md D1).']));
      box.appendChild(el('div', { class: 'prop-k' }, ['Storyteller’s notes', el('span', { class: 'muted' }, [' · never sent to players'])]));
      box.appendChild(el('textarea', { class: 'text', rows: 4, oninput: debounce((ev) => State().commit('setPartyNotes', [m.id, ev.target.value]), 400) }, [m.notes || '']));
    }
    box.appendChild(el('div', { class: 'prop-k' }, [o.player ? 'My notes' : 'The player’s notes']));
    box.appendChild(el('textarea', { class: 'text', rows: 3, readonly: o.player ? null : 'readonly', oninput: o.player ? debounce((ev) => State().commit('setPartyPlayerNotes', [m.id, ev.target.value]), 400) : null }, [m.playerNotes || '']));
    box.appendChild(el('div', { class: 'chiprow' }, [button('Download character file', () => downloadMember(m), 'ghost tiny')]));
    return box;
  }

  return { TEMPLATE_ID, FILE_KIND, newMember, readMember, fileOf, downloadMember, hunger, sentence, setHunger, live };
})();
