# Blood & Other Drugs × sortilege-vtt-vtm5e — plan and decision log

A **Vampire: The Masquerade 5th Edition** chronicle in Toronto — the Kindred drug trade, the
*athanor corporis*, the baronies and the GTA Camarilla — built as an **instance** of
`sortilege-vtt-vtm5e`, so the campaign material lives inside the VTT's framing and the homebrew
extends the VTT the way a book does.

The process is `campaign/INSTANCE-PLAYBOOK.md` in
[`portents-and-fortunes`](../../../2026%20Portents%20%26%20Fortunes/portents-and-fortunes/campaign/INSTANCE-PLAYBOOK.md),
read-only reference here; the campaign site's shape is borrowed from
[`war-of-princes`](../../../2026%20War%20of%20Princes/war-of-princes), also read-only.

Status words: **PROPOSED** (awaiting the owner), **(owner)** decided, **landed** built and proven
through the real controls.

Two repos take part:

- **here** — `sortilege-inc/blood-and-other-drugs` (**private**, see O1). Becomes the instance.
- **upstream** — `sortilege-inc/sortilege-vtt-vtm5e` (private). Everything generic is built
  there and pulled here.

## What is on disk and on the wire (read 2026-09-23)

| Input | State |
|---|---|
| `sortilege-inc/blood-and-other-drugs` | cloned 2026-09-22, **empty** (no commits, no branch); was PUBLIC, **set private 2026-09-23** (O1); identity Jordan Peacock <jordan@sortilege.online> and `merge.ours.driver` set |
| `sortilege-vtt-vtm5e` | M0–M5 landed 2026-09-23; 18 books; **its D3 names this campaign as the hosted instantiation**, its **D2** (third-party corpus) was ON HOLD and is now decided by the owner's instruction |
| `titterpig-dsl-vtm5e-3rdparty` | *The Black Hand* 12 `.ttrpg` + 2 `.arc` (*Lost in the Garden*, *Our Graves Are Empty*); Sortilege's **Sunburners** (`.ttrpg` + `.lore`); *Summoned Stories* 2 `.ttrpg` |
| The Foundry world | `blood-and-other-drugs`, wod5e 5.3.27 on Foundry 14.367, **online**, reached over the `foundryrestapi.com` relay (clientId `fvtt_58c153fc85e1a050`). **49 actors, 5 scenes, 16 world items, 0 journals** |
| The prose | `~/Downloads/Unsorted Sortilege` — a YAML pipeline (36 npc / 13 faction / 31 location / 11 item / 8 session), a vault with planning docs and notion/claude/my-archivist/foundry exports, a PREP folder (the Black Hand PDFs, `yyz-atetsenretha-0.1.9.ttrpg`), 21 transparent portraits |
| The art pack | `~/Downloads/Vampire Symbols` (153 files, 28 dirs), `~/Downloads/Vampire Logos` (17) — already consumed by upstream's `build/build_art.py` |

### The Foundry world, as it stands

| Folder | Who |
|---|---|
| **Coterie** | Claude, Ethan Cole, Olly, Ralph Begg (the PCs, O3), **Rose** (a coterie NPC), and the *Barbara Hall Park* group actor; sub-folders Claude's / Olly's / Ralph's Touchstones, Ethan's Contacts, Olly's Retainers |
| **GTA Camarilla** | Lucien Henri DuSang (Prince), Maeva Rousseau (Seneschal, Ventrue Primogen), Elijah Kane (Sheriff), Sabine Moreau (Keeper of Elysium), Dominik Levesque, Marcus Söderström, Tatiana 'Tash' Mirek, Viorica Dal |
| **Scarborough Barony** | Andre Baptiste (Baron), Amira al-Najjar, Rami Saadeh — and inside it **Sunburners**: Trieste, Malik the Low, Jonah, Lil Sis, Zuzu |
| **Riverdale Barony** | Father Vivek (Baron, **Sabbat**), Valence |
| **Kensington Barony** | Evelyn Skye (Baron), Erin Ko, Jason Cho |
| **Unclaimed Territory** | Arjun Qamar, Colette d'Aurevoir, Darya Vuković, Moth, Raya Wong (Noddist Priest) |
| (unfiled) | Vincent Lao; Cop 1–3, Guard, Raymond, Secretary |

Scenes: *YYZ*, *Barbara Hall Park*, *Precinct 4*, *University of Toronto — Private Club*,
*Warehouse*. World items include the predator types *Extortionist* and *Montero*, the power
*Plug-In*, and *False Love (Trieste)* — homebrew that must reach the DSL layer (O4).

**The world carries no journals**, so no chronicle prose exists in Foundry.

## Owner decisions (2026-09-23)

**O1 — Private, publication decided at deploy (owner).** The repo was PUBLIC and empty; a fork's
first push carries upstream's `data/` — the 18 books verbatim, the Paradox clan and sect marks,
and The Black Hand's text, a paid Storytellers Vault product. That push is the point of
publication and cannot be taken back. The repo was **set private before any push** (proven:
`gh repo view … --json visibility` → `PRIVATE`). Publication is revisited at M7, not assumed.

**O2 — Foundry for records; the vault for setting; the Chronicle written by hand (owner).**
The live Foundry world is the source of truth for statblocks, portraits and the barony
structure, taken as a **dated export** into `campaign/source/foundry-export/<date>/` and
converted deterministically into `campaign/dsl/`. The vault's planning documents (the Scene
Breakdown, the Character Relationships, the Toronto map data) feed the setting and the gazetteer.
The eight YAML session files are **raw material only** — they are AI-generated recaps
(bulleted sense-impressions, hashtag lists, `[[wikilinks]]`) and are never published as the
Chronicle's voice.

**O3 — The player characters are Claude, Ethan Cole, Olly and Ralph Begg (owner).** **Rose** is
therefore an NPC inside the Coterie folder and is written as one. Their touchstones, contacts and
retainers are the campaign's own records, not the corpus's.

**O4 — PROPOSED: the homebrew is a campaign DSL layer.** The four PCs, the 45 NPCs, the world's
custom predator types (*Extortionist*, *Montero*), the power *Plug-In* and *False Love (Trieste)*
are written in the Titterpig DSL under `campaign/dsl/` and built by upstream's own build through
the same two-way gate as the books — Portents O6, unchanged.

**O5 — PROPOSED: the third-party corpus is a second shelf, labelled.** *The Black Hand* and the
**Sunburners** load beside the official books as a visibly separate shelf (upstream D2's own
recommendation), and the two `.arc` scenarios — *Lost in the Garden*, *Our Graves Are Empty* —
are offered as modules in the Chronicle panel. *Summoned Stories* is **excluded**: it is another
Storyteller's chronicle documentation (a Road system replacing Humanity) and contradicts this
chronicle's rules. Flag if it should come in.

**O6 — PROPOSED: the campaign site's five sections**, borrowing *War of Princes*' shape
(Setting · Coterie · Dramatis Personae · Chronicle · Household) and adapting the fifth to this
chronicle's spine:

| Section | What it holds |
|---|---|
| **The City** | Toronto by night — the GTA Camarilla, the three baronies, the unclaimed ground; from the vault's map data |
| **The Coterie** | The four PCs, Rose, and the Barbara Hall Park group — sheets drawn by the VTT |
| **Dramatis Personae** | The 45 NPCs by court and barony, with discovery state (a player sees whom they have met) |
| **The Chronicle** | The session record, written by hand from the eight YAML recaps (O2) |
| **The Trade** | The Kindred drug economy — the *athanor corporis*, Athenor Corporis, the resonances — in place of *War of Princes*' Household |

## Upstream first — two gaps, proven 2026-09-23

`sortilege-vtt-vtm5e` **cannot host an instance as it stands.** Compared against the L5R5e line
(read through the Portents fork):

| File | L5R5e | vtm5e |
|---|---|---|
| `engine/instance.js` | yes | **missing** |
| `build/build_layer.sh` / `build_layer.py` / `build/fixtures` | yes | **missing** |
| `instance:` key in `engine/config.js` | yes | **missing** |

Both gaps are upstream-owned by the playbook's boundary ("a change every campaign of this system
would want is built upstream and pulled"), so they are done in `sortilege-vtt-vtm5e` **before**
the fork.

## Milestones

| # | Where | What | Proof |
|---|---|---|---|
| **M0** | here | This plan | the owner's sign-off |
| **U1** | upstream | **The instance hook.** Port `engine/instance.js`, `build/build_layer.{sh,py}`, the fixtures and the `instance:` config key from the L5R5e line into `sortilege-vtt-vtm5e`; the stage tags in every page | A fixture layer builds and passes all three gates, **each made to fail first**; a temporary instance's tab, panel and shelf entry appear; with no instance declared every page is as before; upstream's own gate unchanged and `data/` byte-identical after a rebuild |
| **U2** | upstream | **D2 — the third-party shelf.** `build_data.py` takes a second corpus root; Black Hand and Sunburners shelved apart and labelled; the two `.arc`s offered as modules | The gate both ways over both roots; the book map refuses an unclaimed file; the shelf shows the two groups; the arcs load in the Chronicle panel |
| **M1** | here | **The fork.** `upstream` remote; merge at the root; the instance-owned root files; `.gitattributes` `merge=ours`; `engine/config.js` (title, storage prefix, Worker port); launch entries | Both histories in `git log`; **the boundary proven by making it fail** in a throwaway clone (without the driver a fake upstream edit to `config.js` conflicts; with it, ours wins and an upstream-owned file takes the change); a second `git pull upstream main` merges clean; every `href`/`src` resolved on disk; the browser through every tab and panel, 0 console errors |
| **M2** | here | **The Foundry export and the DSL layer.** A dated export of all 49 actors, 5 scenes and 16 items into `campaign/source/foundry-export/<date>/`; a converter in `campaign/source/` writing `campaign/dsl/` — the NPCs on the corpus's own chassis, the four PCs as actors, the custom items as records | **Piloted on one entity** and checked field by field against the export, with a **planted difference that must fail**, before the rest; then all 49; the layer's three gates green; the Cast lists the campaign's NPCs beside the corpus's |
| **M3** | here | **The campaign site** — the five sections of O6 registered as VTT site tabs from `campaign/site/` | Through every tab; discovery state honoured; 0 console errors |
| **M4** | here | **The PCs on the VTT sheet.** Claude, Ethan Cole, Olly, Ralph Begg, each checked field by field against the Foundry export kept verbatim in `campaign/source/` | Each sheet matches its Foundry record; the roller builds pools from it |
| **M5** | here | **The Storyteller's table.** The Notes / Scenes / Threads panes; the arc seeded; the pack | Through the real controls; the pack round-trips |
| **M6** | here | **Sessions** through the Worker; a player joins from a second origin | The player claims a PC, rolls, the ST sees it |
| **M7** | here | **Deploy** — the publication decision reopened (O1), then Pages and the Worker | Confirmed with the owner at that step |

## Decision log

| When | Kind | Decision | Why |
|---|---|---|---|
| 2026-09-23 | autonomous, safety | Set the repo **private** before any push | It was PUBLIC and empty; the fork's first push publishes `data/` irreversibly. Owner then confirmed (O1) |
| 2026-09-23 | autonomous, tool | Per-repo identity and `merge.ours.driver true` set at clone time | The playbook requires the driver once per clone; every sibling sets identity per repo |
| 2026-09-23 | autonomous, method | Foundry read over the `foundryrestapi.com` relay, **read-only**, key never written to disk | The key is session-scoped; the Sjórseiðr note records the same handling |
| 2026-09-23 | owner | O1, O2, O3 | asked with the alternatives and the legwork; answered |
