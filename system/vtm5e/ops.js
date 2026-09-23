// system/vtm5e/ops.js — the ops Vampire adds to the engine's, registered with the same call
// and shared the same way (engine/ops.js). Loaded by the browser after engine/ops.js, and
// imported by the Worker beside it, so the room applies the very same functions. Ids travel
// in the args; applying an op is deterministic everywhere, and the room never rolls.
//
//   scenes  [ { id, name, cast:[entityIds] } ]   the Storyteller's own scenes, in play order —
//                                                no official book ships an .arc (PLAN.md D2
//                                                would bring The Black Hand's two), so a
//                                                scene is whatever the Storyteller writes;
//                                                done, notes and the current one use the
//                                                engine's scene ops under moduleId 'chronicle'
//   A party member's live state is the engine's setPartyLive: { hunger } until the corpus
//   declares the character (PLAN.md D1).
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('../../engine/ops.js'));
  else factory(root.VttOps);
})(typeof self !== 'undefined' ? self : this, function (Ops) {
  Ops.shared(['scenes']);

  Ops.register('setScenes', (s, list) => {
    s.scenes = (list || []).slice();
  });
  Ops.register('putScene', (s, scene) => {
    if (!s.scenes) s.scenes = [];
    const i = s.scenes.findIndex((x) => x.id === scene.id);
    if (i === -1) s.scenes.push(scene);
    else s.scenes[i] = Object.assign({}, s.scenes[i], scene);
  });
  Ops.register('removeScene', (s, id) => {
    s.scenes = (s.scenes || []).filter((x) => x.id !== id);
  });
  // who is in a scene: Storyteller characters from the books (records.js ids)
  Ops.register('setSceneCast', (s, sceneId, ids) => {
    const sc = (s.scenes || []).find((x) => x.id === sceneId);
    if (sc) sc.cast = (ids || []).slice();
  });

  return Ops;
});
