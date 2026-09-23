// system/vtm5e/table.js — what Vampire tells the table (engine/vtt.js) and the player's page
// (engine/play.js): which scenes are in play, what can stand on the table, what a token's
// state reads as, and how a character file becomes a party member. The engine never asks the
// corpus directly.
//
// The module is the Storyteller's own chronicle (system/vtm5e/ops.js `scenes`): no official
// book ships an .arc. It ships no maps: a map is whatever image the Storyteller sets on a
// scene, and who is in a scene is who the Storyteller has put there from the books.
window.VttSystem = (function () {
  const D = window.VtmData;
  const Sheet = window.VtmSheet;
  const State = window.VttState;
  const S = () => State.state;

  const MODULE = 'chronicle';

  const scenes = () => (S().scenes || []).map((sc) => ({ id: sc.id, name: sc.name, phase: null, moduleId: MODULE }));
  const scene = (id) => (S().scenes || []).find((sc) => sc.id === id) || null;

  function currentSceneId() {
    const cur = (S().current || {})[MODULE];
    const all = S().scenes || [];
    return (all.find((s) => s.id === cur) || all[0] || {}).id || null;
  }

  // who is in a scene: records (always in memory) — their book loads when opened
  const cast = (sceneId) => ((scene(sceneId) || {}).cast || []).map((id) => D.record(id)).filter(Boolean);

  const maps = () => [];
  const mapDef = () => null;
  const defaultMapId = (sceneId) => sceneId;
  const legend = () => null;
  const mapAssets = () => [];

  function tokenSources() {
    const groups = [];
    const party = (S().party || []).map((m) => ({ id: 'tk-' + m.id, label: m.name, kind: 'party', owner: m.id, ref: m.id }));
    if (party.length) groups.push({ label: 'The coterie', items: party });
    const sc = scene(currentSceneId());
    const here = sc ? cast(sc.id).map((r) => ({ label: D.recordLabel(r), kind: 'cast', ref: r.id })) : [];
    if (here.length) groups.push({ label: sc.name, items: here });
    return groups;
  }

  const COLORS = { party: '#c8102e', cast: '#ece4d6', marker: '#7a6f6d' };
  const tokenColor = (t) => COLORS[t.kind] || COLORS.marker;
  // a token's word: a coterie member's Hunger; a Storyteller character's printed line
  function tokenStatus(t) {
    if (t.kind === 'party') {
      const m = (S().party || []).find((x) => x.id === t.owner);
      return m ? { text: 'Hunger ' + Sheet.hunger(m), pips: [] } : null;
    }
    const r = t.kind === 'cast' && t.ref ? D.record(t.ref) : null;
    if (!r) return null;
    const f = r.fields || {};
    return { text: f['Standard Dice Pools'] || [f.Clan, f['Blood Potency'] != null ? 'BP ' + f['Blood Potency'] : null].filter(Boolean).join(' · ') || '', pips: [] };
  }

  function selectToken(t) {
    if (t.kind === 'party') window.VttBus.emit('select', { kind: 'party', id: t.owner });
    else if (t.kind === 'cast' && t.ref) window.VttBus.emit('select', { kind: 'entity', id: t.ref });
  }
  const tokenMenu = () => null;

  const readCharacter = (obj, fileName) => Sheet.readMember(obj, fileName);
  const downloadCharacter = (m) => Sheet.downloadMember(m);
  const liveSheet = (m, opts) => Sheet.live(m, opts);
  const memberSubtitle = (m) => Sheet.sentence(m);

  return {
    MODULE, scenes, scene, currentSceneId, cast, maps, mapDef, defaultMapId, legend, mapAssets,
    tokenSources, tokenColor, tokenStatus, selectToken, tokenMenu,
    liveSheet, readCharacter, downloadCharacter, memberSubtitle,
  };
})();
