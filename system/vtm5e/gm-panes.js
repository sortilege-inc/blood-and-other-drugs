// system/vtm5e/gm-panes.js — the Storyteller's three panes (the family's I9, from the L5R5e VTT):
// Notes, Scenes (the arc), Threads · NPCs. Everything here is the Storyteller's own pack state
// (system/vtm5e/ops.js: gmNotes, arc, threads) — saved with the pack, never sent to a player. V5
// has no encounter arithmetic, so the L5R5e builder has no counterpart: the NPCs pane is the
// current scene's cast with what their records print.
(function () {
  const { el, button, debounce } = window.VttRender;
  const D = window.VtmData;
  const E = window.VtmEntity;
  const State = window.VttState;
  const Panels = window.VttPanels;
  const Sys = () => window.VttSystem;
  const S = () => State.state;
  const CFG = window.VttConfig || {};
  const editing = (c) => document.activeElement && /TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName) && c.contains(document.activeElement);
  const newId = (p) => State.genId(p);
  const refocus = (c, placeholder) => { const f = c.querySelector('input[placeholder="' + placeholder + '"]'); if (f) f.focus(); };

  // ── Notes: an authored document (the instance names it: VttConfig.notes = { src, title, class, gate })
  // rendered, and the Storyteller's free notes below it. A gate (the document's spoiler warning)
  // stands in front of it until the Storyteller passes it, once per page load. A .html document is
  // the instance's own fragment and goes in as it is, under its class; anything else is Markdown ──
  let docCache = null;
  let gatePassed = false;
  function renderNotes(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const n = CFG.notes || null;
      if (n && n.src && n.gate && !gatePassed) {
        container.appendChild(el('h4', {}, [n.title || 'Notes']));
        container.appendChild(el('div', { class: 'paper notes-gate' }, [
          n.gate.title ? el('div', { class: 'notes-gate-title' }, [n.gate.title]) : null,
          n.gate.text ? el('p', {}, [n.gate.text]) : null,
          button(n.gate.enter || 'Show', () => { gatePassed = true; draw(); }, 'tiny'),
        ]));
      } else if (n && n.src) {
        const box = el('div', { class: 'paper notes-doc' + (n.class ? ' ' + n.class : '') }, [el('div', { class: 'muted loading' }, ['Reading ' + (n.title || n.src) + '…'])]);
        container.appendChild(el('h4', {}, [n.title || 'Notes']));
        container.appendChild(box);
        const show = (text) => { box.innerHTML = ''; if (/\.html?$/.test(n.src)) box.innerHTML = text; else box.appendChild(E.prose(text)); };
        if (docCache != null) show(docCache);
        else fetch(n.src).then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status)))).then((t) => { docCache = t; show(t); })
          .catch((e) => { box.innerHTML = ''; box.appendChild(el('div', { class: 'empty' }, ['Could not read ' + n.src + ' (' + e.message + ').'])); });
      }
      container.appendChild(el('h4', {}, ['Free notes', el('span', { class: 'muted small' }, [' · saved with the pack, never sent to players'])]));
      container.appendChild(el('textarea', { class: 'text notes-free', rows: 10, placeholder: 'Jot as you play…', oninput: debounce((ev) => State.commit('setGmNotes', [ev.target.value]), 400) }, [S().gmNotes || '']));
    };
    ctx.on('state:remote', () => { if (!editing(container)) draw(); });
    draw();
  }

  // ── Scenes: the chronicle's arc — the Storyteller's plan, loose and editable ─────────────
  // arc = [{ id, title, text, played, sceneId }]. The Chronicle's scenes are shared (a player sees
  // the one in play), so what is only planned lives here, and "Play it" makes an entry a
  // Chronicle scene — its text becomes that scene's Storyteller's notes when those are empty.
  const arc = () => (S().arc || []).map((x) => Object.assign({}, x));
  const setArc = (list) => State.commit('setArc', [list]);
  const MODULE = 'chronicle';
  function playIt(i) {
    const l = arc();
    const x = l[i];
    let sc = x.sceneId && Sys().scene(x.sceneId);
    if (!sc) {
      const id = newId('sc');
      State.commit('putScene', [{ id, name: x.title || 'A scene', cast: [] }]);
      l[i] = Object.assign({}, x, { sceneId: id });
      setArc(l);
      sc = Sys().scene(id);
    }
    const prog = ((S().progress || {})[MODULE] || {})[sc.id] || {};
    if (x.text && !prog.notes) State.commit('setSceneNotes', [MODULE, sc.id, x.text]);
    window.VtmPanels.goTo(sc.id);
  }
  function renderScenes(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const list = arc();
      const played = list.filter((x) => x.played).length;
      container.appendChild(el('h4', {}, ['The arc', el('span', { class: 'muted small' }, [' · ' + list.length + ' scenes, ' + played + ' played · never sent to players'])]));
      if (!list.length) container.appendChild(el('div', { class: 'empty' }, ['Nothing planned yet. What is only planned stays here; “Play it” puts a scene in the Chronicle.']));
      list.forEach((x, i) => {
        const upd = (patch) => { const l = arc(); l[i] = Object.assign({}, l[i], patch); setArc(l); };
        const move = (d) => { const l = arc(); const j = i + d; if (j < 0 || j >= l.length) return; const t = l[i]; l[i] = l[j]; l[j] = t; setArc(l); };
        const inChronicle = x.sceneId && Sys().scene(x.sceneId);
        container.appendChild(el('div', { class: 'arc-scene' + (x.played ? ' played' : '') }, [
          el('div', { class: 'chiprow tight' }, [
            el('input', { type: 'checkbox', checked: x.played || null, title: 'Played', onchange: (ev) => upd({ played: ev.target.checked }) }),
            el('input', { class: 'text arc-title', type: 'text', value: x.title || '', placeholder: 'A scene', oninput: debounce((ev) => upd({ title: ev.target.value }), 400) }),
            button(inChronicle ? 'Go to it' : 'Play it', () => playIt(i), 'tiny'),
            button('↑', () => move(-1), 'ghost tiny'), button('↓', () => move(1), 'ghost tiny'),
            button('×', () => { if (confirm('Remove “' + (x.title || 'this scene') + '” from the arc?')) setArc(arc().filter((_, j) => j !== i)); }, 'ghost tiny'),
          ]),
          el('textarea', { class: 'text arc-text', rows: 3, placeholder: 'What it is for, who is in it, what the Beast might do…', oninput: debounce((ev) => upd({ text: ev.target.value }), 400) }, [x.text || '']),
        ]));
      });
      const title = el('input', { class: 'text', type: 'text', placeholder: 'Plan a scene…' });
      // added by Enter the field keeps focus, and a pane never redraws under the Storyteller's typing:
      // draw here, and put the cursor back for the next one
      const add = () => { if (!title.value.trim()) return; setArc(arc().concat([{ id: newId('arc'), title: title.value.trim(), text: '', played: false }])); draw(); refocus(container, 'Plan a scene…'); };
      title.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); add(); } });
      container.appendChild(el('div', { class: 'chiprow tight' }, [title, button('Add', add, 'tiny')]));
    };
    ctx.on('state:changed', () => { if (!editing(container)) draw(); });
    ctx.on('state:remote', () => { if (!editing(container)) draw(); });
    draw();
  }

  // ── Threads · NPCs ─────────────────────────────────────────────────────
  const threads = () => (S().threads || []).map((x) => Object.assign({}, x));
  const setThreads = (l) => State.commit('setThreads', [l]);
  // what a Storyteller character's record prints, in the book's own field names
  const NPC_FIELDS = ['Clan', 'Generation', 'Blood Potency', 'Humanity', 'Standard Dice Pools'];
  const npcLine = (r) => NPC_FIELDS.filter((k) => r.fields && r.fields[k] != null && r.fields[k] !== '').map((k) => k + ' ' + r.fields[k]).join(' · ');
  function renderThreads(container, ctx) {
    const draw = () => {
      container.innerHTML = '';
      const ts = threads();
      container.appendChild(el('h4', {}, ['Threads', el('span', { class: 'muted small' }, [' · ' + ts.filter((x) => x.open !== false).length + ' open · never sent to players'])]));
      ts.forEach((x, i) => {
        const upd = (patch) => { const l = threads(); l[i] = Object.assign({}, l[i], patch); setThreads(l); };
        container.appendChild(el('div', { class: 'thread' + (x.open === false ? ' closed' : '') }, [
          el('div', { class: 'chiprow tight' }, [
            el('input', { class: 'text', type: 'text', value: x.title || '', oninput: debounce((ev) => upd({ title: ev.target.value }), 400) }),
            button(x.open === false ? 'reopen' : 'close', () => upd({ open: x.open === false }), 'ghost tiny'),
            button('×', () => { if (confirm('Remove this thread?')) setThreads(threads().filter((_, j) => j !== i)); }, 'ghost tiny'),
          ]),
          x.open === false ? null : el('textarea', { class: 'text', rows: 2, placeholder: 'Where it stands…', oninput: debounce((ev) => upd({ text: ev.target.value }), 400) }, [x.text || '']),
        ]));
      });
      const tt = el('input', { class: 'text', type: 'text', placeholder: 'Open a thread…' });
      const add = () => { if (!tt.value.trim()) return; setThreads(threads().concat([{ id: newId('th'), title: tt.value.trim(), text: '', open: true }])); draw(); refocus(container, 'Open a thread…'); };
      tt.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); add(); } });
      container.appendChild(el('div', { class: 'chiprow tight' }, [tt, button('Add', add, 'tiny')]));

      // NPCs: the scene's cast, each with what its record prints
      const sc = Sys().scene(Sys().currentSceneId());
      container.appendChild(el('h4', {}, ['In this scene', el('span', { class: 'muted small' }, [sc ? ' · ' + sc.name : ' · no scene'])]));
      const here = sc ? Sys().cast(sc.id) : [];
      container.appendChild(here.length ? el('ul', { class: 'items npc-list' }, here.map((r) => el('li', {}, [
        el('button', { class: 'ref', type: 'button', onclick: () => Panels.select({ kind: 'entity', id: r.id }) }, [D.recordLabel(r)]),
        el('span', { class: 'muted small' }, [' ' + npcLine(r)]),
      ]))) : el('div', { class: 'muted small' }, [sc ? 'No one yet — the Cast puts Storyteller characters in a scene.' : 'No scene in play — the Chronicle, or an arc entry’s “Play it”.']));
    };
    ctx.on('state:changed', () => { if (!editing(container)) draw(); });
    ctx.on('state:remote', () => { if (!editing(container)) draw(); });
    ctx.on('scene:changed', draw);
    draw();
  }

  Panels.register('notes', { label: 'Notes', render: renderNotes });
  Panels.register('scenes', { label: 'Scenes', render: renderScenes });
  Panels.register('threads', { label: 'Threads · NPCs', render: renderThreads });
})();
