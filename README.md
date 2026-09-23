# Blood & Other Drugs

A **Vampire: The Masquerade 5th Edition** chronicle in Toronto — the Kindred drug trade, the
*athanor corporis*, the baronies and the GTA Camarilla — served as an **instance** of
[sortilege-vtt-vtm5e](https://github.com/sortilege-inc/sortilege-vtt-vtm5e).

The VTT owns the root: the site at `/`, the Storyteller's table at `/gm/`, the engine, the
VtM5e system module, and the books generated from the Titterpig corpus. The campaign owns
`campaign/`.

- `campaign/PLAN.md` — the decisions, the milestones, and their proof.
- The process: `campaign/INSTANCE-PLAYBOOK.md` in
  [portents-and-fortunes](https://github.com/sortilege-inc/portents-and-fortunes).

## The fork

`upstream` is the VTT. Engine and system updates arrive by

```bash
git fetch upstream && git merge upstream/main
```

Upstream-owned files are never edited here — anything every VtM campaign would want is built
upstream and pulled. The instance's own root files (`engine/config.js`, `worker/wrangler.jsonc`,
`README.md`, `CNAME`, `.gitignore`, `.claude/launch.json`, `.gitattributes`) are marked
`merge=ours`, so a pull keeps this repo's copy. That needs a driver git does not store; run once
per clone:

```bash
git config merge.ours.driver true
```

Because `merge=ours` keeps the instance's *whole* `engine/config.js`, a key upstream adds there
never arrives on its own: after each pull, read
`git diff <last pulled>..upstream/main -- engine/config.js` and carry what applies.

## Local

Launch entries `blood` (site, 8743) and `blood-worker` (sessions, 8795).

## Rights

*Vampire: The Masquerade* is © Paradox Interactive / World of Darkness; *The Black Hand:
Playing the Sabbat* is a Storytellers Vault title by its own authors. This is an unofficial
play aid for the owner's table, not a redistribution of the books. The repo is **private**
(`campaign/PLAN.md` O1).
