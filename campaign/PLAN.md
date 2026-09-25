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

**O5 — PROPOSED: the third-party corpus is a second shelf, labelled.** (Its Black Hand half is
being re-extracted by the VtM5e VTT session as this is written — loresheet dot ratings and the
merged `Cost (2)` power names — so U2 waits for that push; the Sunburners are hand-authored and
unaffected.) *The Black Hand* and the
**Sunburners** load beside the official books as a visibly separate shelf (upstream D2's own
recommendation), and the two `.arc` scenarios — *Lost in the Garden*, *Our Graves Are Empty* —
are offered as modules in the Chronicle panel. *Summoned Stories* is **excluded**: it is another
Storyteller's chronicle documentation (a Road system replacing Humanity) and contradicts this
chronicle's rules. Flag if it should come in.

**O7 — In any disagreement, the corpus is canon and Foundry is wrong (owner, 2026-09-24).**
A name or rules text the books print is written as the DSL prints it; the Foundry world is a
working copy, not a source of record. It still supplies the campaign's *own* facts — who exists,
their ratings, their prose — but never the spelling of a published thing. Applied in M2b to
clans, Predator Types and Discipline powers. Where the world adds a parenthetical of its own
("Osiris (Family Dynasty)"), that is the GM's annotation: it is kept in the campaign's own
`Clan Note` / `Predator Type Note`, never inside the printed name.

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
| **M0** | here | This plan | the owner's sign-off — **landed 2026-09-23**, `4b8f4f6` |
| **U1** | upstream | **The instance hook.** `engine/instance.js`, `build/build_layer.{sh,py}`, the fixture and the `instance:` config key in `sortilege-vtt-vtm5e`; the stage tags in every page | **landed 2026-09-23**, `sortilege-vtt-vtm5e` `9e5cf2f`, pushed; the full proof is that repo's `PLAN.md` § *Instances*, I1. `engine/instance.js` is byte-identical to the L5R5e line's; `build_layer.py` is **written for that build, not copied** (the L5R5e one stands on `Build`/`Ctx`/`gen`, which it does not have), so a layer's characters and powers are found by the corpus's own shapes. Its four gates each **proven by planting a fault** (a dropped `STEPS` block; taking `#vtm5Table000000000001`; `EXTENDS` a hash that exists nowhere; `MODIFY` a rule no book has) — every one exit 1. In the browser: with no instance, 19 books / 9,758 entities / 7 tabs / 0 errors; with a temporary one, 20 books led by *This campaign*, its css, its 2 records (the power reading `Animalism` / `Level 1` from its own headings), its correction, its site tab and its panel — 0 errors. `build.sh` green and `data/` byte-identical. One upstream bug fixed on the way: the shelf's hero line subtracted a hardcoded 1 for the BASE |
| **U2** | upstream | **D2 — the third-party shelf.** `build_data.py` takes a second corpus root; Black Hand and Sunburners shelved apart and labelled; the two `.arc`s offered as modules | The gate both ways over both roots; the book map refuses an unclaimed file; the shelf shows the two groups; the arcs load in the Chronicle panel |
| **M1** | here | **The fork.** `upstream` remote; merge at the root; the instance-owned root files; `.gitattributes` `merge=ours`; `engine/config.js` (title, storage prefix, Worker port); launch entries | **landed on disk 2026-09-23** (`61ceb71` the merge, `05ed179` the boundary) — **browser proof outstanding**. Two root commits in `git log`. **The boundary proven by making it fail** in a throwaway clone: a fake upstream commit editing `engine/config.js` and `index.html` — **without** the driver, `CONFLICT (content): Merge conflict in engine/config.js`; **with** it, merged clean, the title stayed *Blood & Other Drugs* and `index.html` took upstream's edit. A real `git fetch upstream && git merge upstream/main` → *Already up to date*; then, on a **real upstream change** (`f6a442b`, pushed by the VtM5e VTT session while this was being written — `data/` only, 3 files), the pull merged clean, every instance-owned value was kept (title *Blood & Other Drugs*, `storagePrefix` `blood-vtt`, worker name `blood-and-other-drugs`, this README, the two launch entries) and `data/` came out identical to upstream's (`c65649e`). Static links: **97 checked, 0 missing, 0 root-absolute**. **Browser pass landed 2026-09-24** once the owner freed a server slot: on 8743, in a fresh tab, through the real controls — the site is branded *Blood & Other Drugs* (`storagePrefix` `blood-vtt`), the shelf leads with **This campaign → Blood & Other Drugs · 1 chapters · 62 entries · 49 characters** and *The books* below; `/gm/` brands the chronicle and opens all **15** panels (the V2–V9 additions included: loresheets, notes, scenes, threads, conflict, relmaps); the Cast leads with **Blood & Other Drugs (49)** ahead of Core Rulebook (23); `gm/vtt.html`, `gm/play.html` and `gm/maps.html` all load. **0 console errors on every page.** The port-reuse trap the playbook names bit first: 8743 had just been the L5R5e VTT's, so the browser served **L5R5e's cached `index.html`** at that origin and its `system/l5r5e/*` scripts 404'd against this server — the network log shows every request from the two clean loads is 200 |
| **M2a** | here | **The Foundry export.** `campaign/source/export_foundry.py` — a dated, verbatim export over the relay, the key read from the environment and never written to disk | **landed 2026-09-23** — `campaign/source/foundry-export/2026-09-23/`: Actor **49 listed / 49 saved**, Scene 5/5, Item 16/16, JournalEntry 0/0, RollTable 0/0, plus the 13 folders (so an actor's barony is readable). 84 files, 1.3 MB; `grep` for the key across the export → **0 files**. The four PCs carry 11–13 embedded items each, Rose 2 — consistent with O3 |
| **M2b** | here | **The cast as a DSL layer.** `campaign/source/convert_cast.py` writes the 49 actors into `campaign/dsl/vtm5e-0.5-blood-cast.ttrpg`, nested under their baronies as the world files them | **landed 2026-09-24.** 49 actors, 62 entities (13 folder DEFs), 49 records. **Piloted on Lucien Henri DuSang alone** and checked field by field by an independent checker (`check_cast.py`, which shares no code with the converter: it parses the generated DSL with the VTT's own parser and re-derives every value from the export's JSON) — 56 checks, all match — and the checker **proven by planting six differences**: a changed Attribute, a changed Skill rating, a changed specialty, a dropped power, an unrated skill printed, a changed Discipline — six failures, each naming the right field. Then all 49: **2,489 field checks, all match**. The layer's four gates: *strings 347 (1008 occurrences) — 0 uncovered · 0 short · 0 unsourced · ids 62, none of them the corpus's (10120) · every id the layer points at resolves · 0 references by name*. Three faults the pilot caught before anything scaled, all fixed: a REFERENCES line written without a hash parses as a **property**, not a reference; the books set apostrophes typographically (*Spirit’s Touch*) where Foundry types them straight; and a specialty may carry nested parentheses and commas (*Persuasion (Seduction (from Siren Predator Type) - inspiring devotion)*) |
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
| 2026-09-24 | autonomous, method | A character is written with **the corpus's own printed labels** (Chicago by Night's Storyteller characters: Sire / Embraced / Ambition / Humanity / Generation / Blood Potency / Attributes / Secondary Attributes / Skills / Disciplines) in the corpus's own formatting | The VTT finds characters **by shape**, not by a chassis — this corpus declares no NPC type. Writing Foundry's field names would leave every one of them invisible to the tool |
| 2026-09-24 | autonomous, method | **A mortal keeps Attributes + Skills**, rather than being summarised into the corpus's *Standard Dice Pools: Physical 4, Social 3, Mental 5* | Deriving that summary from Foundry's nine attributes throws away eight values. The full shape is also a `character` to the build, so nothing is lost and nothing is invented |
| 2026-09-24 | autonomous, rules | **A power a character has taken is a reference by hash to the corpus's own power**; the Foundry one-line shorthand ("Command attention and admiration") is never written as rules text | The book carries paragraphs where the world carries a GM's note. Rules text is verbatim or it is a reference — never a paraphrase |
| 2026-09-24 | **content, surfaced** | Two aliases assert the world's name **is** a published power: *Forgetful Mind* → **The Forgetful Mind** (Dominate 3, the article dropped) and *Bond Familiars* → **Bond Famulus** (Animalism 1, pluralised and anglicised). Declared in `campaign/source/cast_aliases.py` with reasons, reported on every run | Each target is printed in the corpus and its Discipline level holds exactly one power, so the mapping is unambiguous — but it is an assertion, not typography, so it is declared once and shown, not buried. *Plug-In* / *Plug-in* and *A Taste For Blood* / *A Taste for Blood* needed no entry: matching normalises case and typography |
| 2026-09-24 | finding | **No corpus defect found.** All four initially-unresolved power names were world-side naming variance | Checked each against `data/records.js` before concluding; nothing to report to the corpus TODO |
| 2026-09-24 | owner | **O7 — the corpus is canon; Foundry is wrong** | Re-ran the cast under the ruling: clans and Predator Types are now resolved against the corpus by the VTT's own rules and written as the books spell them |
| 2026-09-24 | finding, under O7 | Foundry's **Malkavian** is the core's **Malkavians**; its *Thin-Blooded* / *Thin-Blood* / *Thin-Blood (15th Generation)* are all the core's **The Thin-Blooded**, the generation already carried in its own field | The clans chapter heads the clan in the plural; the parenthetical was duplicate data, not a name |
| 2026-09-24 | finding, under O7 | **Extortionist and Montero are published** (Players Guide), not homebrew — Foundry merely files them under *Custom* | Checked the corpus's own Predator Types headings before assuming; the world's folder is not evidence |
| 2026-09-24 | autonomous, upstream fix | **A layer's records never joined `index.counts.records`.** I1's shelf change takes the campaign's books out of the hero line, which was right for entities (the layer's index increments them) and wrong for records (it did not): the line read *464 Storyteller characters* — 513 − 49 — against a corpus count that never held the 49. Fixed upstream (`0c65dd7`), pulled; the line now reads the corpus's own **513** and `counts.records.character` is 562 | Found only by looking at the rendered page against the corpus's own figures. The layer's index now folds its records in by kind, as it already folded books, entities and files |
| 2026-09-24 | autonomous, upstream fix | **The V9 maps page hardcoded the system's name**, so an instance's maps page read *Maps — Vampire: The Masquerade* while its site, table, player page and Storyteller's table all read `VttConfig.title`. Fixed upstream (`2552f12`), pulled; the page now reads **Maps — Blood & Other Drugs** | Every other page already took the title from the config; this one was the outlier |
| 2026-09-24 | finding, **blocks U2** | **Absolver, Ripper, Domina and Hedonist are published too** — in *The Black Hand*, as "… (Sabbat Only)" Predator Types. Absent from all 19 official books, present in the third-party corpus | Father Vivek is the Sabbat Baron and four Sunburners carry them. They are **not** homebrew and are not written as though they were: the converter keeps the world's spelling and names the book on every run (`AWAITING_THIRD_PARTY`), until U2 loads the shelf and they resolve like any other |
| 2026-09-23 | coordination | **U2 held** until the VtM5e VTT session finishes regenerating the corpus and rebuilding `data/` | It edits `build_data.py` and `BOOKS`, which its rebuild also touches; a peer session asked for the hold and it costs nothing. It confirmed it **is** re-extracting `titterpig-dsl-vtm5e-3rdparty` right after the official pass, at the owner's direction — *The Black Hand* and its two `.arc`s, whose **loresheets gain dot ratings** (110 + 10 + 10 levels, currently none) and whose merged `Cost (2)` powers get their names back. The Sunburners are hand-authored and *Summoned Stories* has its own extractor, so both are untouched. **U2 therefore starts only after both of its pushes**: building the shelf first would be building against text about to change |
| 2026-09-23 | correction | The peer attributed corpus commit `a31138f` (the buyer watermark) to this session; it is **not** this session's work | Every commit in `titterpig-dsl-vtm5e` is authored *Jordan Peacock*, the shared per-repo identity, so author does not distinguish sessions. This session has touched neither that repo nor `sortilege-vtt-vtm5e/data/`: I1 left `data/`'s 21 files byte-identical |
