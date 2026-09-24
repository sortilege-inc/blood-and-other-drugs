# sortilege-vtt-vtm5e — plan and decision log

A virtual tabletop for **Vampire: The Masquerade 5th Edition**, built on the Titterpig corpus
`titterpig-dsl-vtm5e/0.5`. Its shape follows `PLAYBOOK.md` (in `~/Sortilege/VTT/`, beside the VTT repos) and the
Troika! build that applied it most recently; both are read-only reference — nothing in either
repo is modified here. Seventh in the line — Wyldwolf Axis, NOVA Open, City of Winter, TEETH,
Invisible Sun, Troika!.

Status words: **PROPOSED** (awaiting the owner), **(owner)** decided, **landed** built and
verified in the browser by the main session.

## Ground rules (inherited, 2026-09-23)

- The TEETH, Invisible Sun and Troika! repos are read-only reference. What is reused is the
  system-agnostic code only: `engine/*.js` (no game words), the generic DSL parser, the shape of
  the gate and of the build, the Worker. No other system's data, `system/` module, css, book map
  or namespace comes across. Every word of rules text this site shows is from
  `titterpig-dsl-vtm5e/0.5`.
- `data/` is generated; regenerating is the only way to change it. Corpus gaps found while
  building are reported to `titterpig-dsl-vtm5e/TODO.md`, never patched in the tool.
- Rules text is verbatim. The tool's own words are labels and connective prose only. A number
  the rules state only in prose is a named constant citing its sentence.
- The art (`assets/art/`) is generated from the owner's art pack by `build/build_art.py`;
  regenerate, never hand-edit.

## What is on disk (read 2026-09-23)

| Input | State |
|---|---|
| `~/Sortilege/VTT/sortilege-vtt-vtm5e` | cloned empty 2026-09-22; remote `sortilege-inc/sortilege-vtt-vtm5e` (**PRIVATE**); identity Jordan Peacock <jordan@sortilege.online> set per repo |
| `~/Sortilege/Titterpig/DSL/titterpig-dsl-vtm5e/0.5` | 140 files (138 `.ttrpg`, 2 `.lore`), 11 MB, **18 books**; its `gates.sh` (2026-09-22, before the 2026-09-23 fixes): validator 138 files 0/0, 615 §5d sites 0 hashless, 525 GUIDANCE 0 errors, 18/18 coverage gates PASS |
| `~/Sortilege/Titterpig/DSL/titterpig-dsl-vtm5e-3rdparty` | *The Black Hand* (12 `.ttrpg` + **2 `.arc`**: *Lost in the Garden*, *Our Graves Are Empty*), Sortilege's Sunburners (the owner's house Path), *Summoned Stories* — see **D2** |
| The conversion | `~/Sortilege/Titterpig/Temp/vtm5e-conversion` — generates every chapter file; **the BASE is hand-authored** (the generator only references its `^"Table"` anchor) |
| The art pack | `~/Downloads/Vampire Symbols`, `~/Downloads/Vampire Logos` (owner, 2026-09-23): 21 clan and bloodline marks, 4 sect marks, 6 dice faces, 12 Discipline lozenges, logos |

**The inherited parser reads this corpus unchanged:** `parse_dsl.parse_path` on all 138 `.ttrpg`
→ 138 of 138 parse in 1.2 s (pilot, 2026-09-23). The two `.lore` files are Markdown, not DSL.

### The corpus, by what the tool needs

The BASE declares **one type**, `^"Table"`. Everything else is the book's own heading tree —
a DEF per heading, fields named by the book's printed labels (`^"Cost"`, `^"System"`,
`^"Dice Pools"`, `^"Standard Dice Pools"` …). So the tool finds records **by shape**, as the
Invisible Sun build found its bestiary: a Discipline power is a DEF carrying `Cost` and `System`
or `Duration`; a Storyteller character is a DEF carrying `Standard Dice Pools` or `Attributes`
and `Skills`. Counts are in M1's proof line.

| Need | In the corpus | Shape |
|---|---|---|
| The books | 18 books, one file per chapter, named `vtm5e-0.5-<book>-<chapter>` | the file-name prefix is the book |
| Rules text | the heading tree, DESCRIPTION verbatim, 525 GUIDANCE sidebars, printed TABLEs cell for cell | nesting as the conversion found it — **uneven** (below) |
| Discipline powers | `Level N` headings, each power with `Cost` / `Dice Pools` / `System` / `Duration` / `Amalgam` / `Prerequisite` | the level is the nearest `Level N` heading before it in the file, whatever the nesting |
| Storyteller characters | mortals and animals: `Standard Dice Pools` / `Secondary Attributes` / `Exceptional Dice Pools`; Kindred: `Attributes` / `Skills` / `Disciplines` / `Humanity` / `Blood Potency`; Chicago by Night's biographies add `Clan` / `Sire` / `Embraced` / `Ambition` / `Convictions` / `Touchstones` | by shape |
| The dice | the rules text (core *Dice Pool Results*, *Criticals*, *Hunger Dice*, *Messy Critical*, *Bestial Failure*, *Rousing the Blood*); the book's die glyphs are written as `[Regular Die: Critical]` … 7 distinct tokens | prose; the roller's numbers are named constants citing those sentences |
| **The player character** | since 2026-09-23 (D1): `ACTOR "Kindred"` in the BASE from the printed sheet, with `^"Discipline"` (ENUM of the 12), `^"Discipline Rating"`, `^"Specialty"`, `^"Advantage Line"` | the sheet is derived from it at runtime |

**The corpus defects this build found** (uneven nesting, headings split mid-word, the core's
*Summary Sheet* read across its columns, and eight more) were reported to the corpus's TODO and
**fixed there on 2026-09-23** at the owner's direction — in the conversion's extractor and
generator, all 18 books regenerated, `gates.sh` green (`titterpig-dsl-vtm5e` `6442396`,
`b4d11ee`, `a0a2cc6`). The table above describes the corpus before that pass.

## Decisions

**D1 — declare the player character in the corpus BASE (owner, 2026-09-23: yes; landed).**
The playbook derives the sheet, the live sheet and the creator from the ACTOR type's property
declarations, read at runtime (PLAYBOOK §1b); Invisible Sun (D1, owner 2026-09-20) and Troika!
(D1, owner 2026-09-22) both added the missing declaration to the corpus as its own commit. The
owner also directed that the other ten corpus defects be fixed at the same time (above). M4.

**D2 — load the third-party corpus too (owner, 2026-09-23: ON HOLD).** Detail below; not done.

**D3 — the deployment origin and the repo's visibility (owner, 2026-09-23: DROPPED).** This
general build will not be hosted. Instead a **campaign-specific instantiation** of the VTT will
be made and that is what gets hosted — the campaign is not named yet. The repo stays private.

**D4 — the books are the shelf; a book's chapters are its files** (autonomous, tool/method).
`build/build_data.py` maps each corpus file to its book by the file-name prefix; the map is the
only hand list in the build and it refuses to run if a corpus file is claimed by no book. Each
book is its own data file, loaded on demand (`engine/data.js`), because 11 MB is too much for
one page.

**D5 — the clan and sect marks and the dice faces are alpha masks, tinted by CSS**
(autonomous, presentation). One file per mark, coloured where it is used (a Hunger die red, a
regular die bone). The Discipline lozenges are two-tone designs and stay in colour. The pack's
blank Obfuscate lozenge is the official design, not a fault.

## Owner decisions — detail

### D1 — declare the player character in the corpus BASE (decided and landed; the proposal as written)

*The gap:* the corpus has no ACTOR, so there is nothing to derive a sheet from. The printed
character sheet exists — **core PDF pages 429–430**, with a text layer — but the conversion
lists those pages as furniture (`books/core.py` `FURNITURE_PAGES`), so none of its labels are in
the corpus. The BASE is hand-authored, so an addition is one file, not a generator change.

*Recommendation:* add `ACTOR "Kindred"` to `vtm5e-0.5-base.ttrpg` in its own commit in
`titterpig-dsl-vtm5e`, every field a label printed on the sheet (read from the PDF's text layer
2026-09-23), gates green in the message, VERSION patch bump. Draft:

```
#vtm5Kindred00000000001 ACTOR "Kindred" DEF {
    # The printed character sheet, core rulebook pages 429-430 (PDF).
    PROPERTIES {
        ^"Name" STRING REQUIRED
        ^"Concept" STRING
        ^"Predator" STRING              ^"Chronicle" STRING
        ^"Ambition" STRING              ^"Clan" STRING
        ^"Sire" STRING                  ^"Desire" STRING
        ^"Generation" INTEGER
        # ATTRIBUTES — Physical / Social / Mental, five dots each
        ^"Strength" INTEGER MIN 1 MAX 5   ^"Charisma" INTEGER MIN 1 MAX 5   ^"Intelligence" INTEGER MIN 1 MAX 5
        ^"Dexterity" …  ^"Manipulation" …  ^"Wits" …
        ^"Stamina" …    ^"Composure" …     ^"Resolve" …
        ^"Health" INTEGER     ^"Willpower" INTEGER      # the sheet's two trackers
        # SKILLS — the 27 printed, MIN 0 MAX 5, each with its Specialties
        ^"Athletics" INTEGER MIN 0 MAX 5 … ^"Technology" INTEGER MIN 0 MAX 5
        ^"Specialties" LIST OF STRING
        ^"Disciplines" LIST OF …        # a Discipline and its rating, the powers taken
        ^"Resonance" STRING   ^"Hunger" INTEGER MIN 0 MAX 5   ^"Humanity" INTEGER MIN 0 MAX 10
        ^"Chronicle Tenets" STRING   ^"Touchstones & Convictions" LIST OF STRING   ^"Clan Bane" STRING
        ^"Advantages & Flaws" LIST OF STRING
        ^"Blood Potency" INTEGER MIN 0 MAX 10
        # Blood Surge, Mend Amount, Power Bonus, Rouse Re-Roll, Feeding Penalty and Bane
        # Severity are READ from the Blood Potency table, not declared
        ^"Total Experience" INTEGER   ^"Spent Experience" INTEGER
        ^"True age" STRING  ^"Apparent age" STRING  ^"Date of birth" STRING  ^"Date of death" STRING
        ^"Appearance" STRING  ^"Distinguishing features" STRING  ^"History" STRING  ^"Notes" STRING
    }
}
```

Damage taken (Superficial / Aggravated on Health and Willpower), current Hunger, and stains are
live sheet state, as Troika's current Stamina is — not declarations.

*Trade-off:* about 60 lines in a corpus gated 18/18 yesterday, and a VERSION bump on the BASE;
in return the sheet, the live sheet and the creator read every field from the corpus. The
alternative, a hand-listed sheet in `system/vtm5e/sheet.js`, is the drifting second copy the
playbook forbids. **M4 waits on this.** Until then the Party panel and the player's page hold a
character file generically.

*A second, smaller question inside D1:* the Discipline row. The sheet prints DISCIPLINES as
blank lines; a typed `LIST OF #hash ^"Discipline Rating"` (name + dots + powers taken) makes the
roller able to build pools from it. Recommended; the alternative is free text.

### D2 — load the third-party corpus too (ON HOLD, owner 2026-09-23)

`titterpig-dsl-vtm5e-3rdparty` holds *The Black Hand* (with **the only two `.arc` scenarios** in
either corpus, *Lost in the Garden* and *Our Graves Are Empty*), the owner's own Sunburners Path,
and *Summoned Stories*. Its README says a consumer chooses whether to load it. *Recommendation:*
load it as a second shelf, labelled third-party / house, and offer its two arcs as modules in the
Chronicle panel; the build already takes a list of corpus roots. *Trade-off:* third-party text
beside the official books (kept visibly apart); without it the GM's scene list is entirely
hand-authored. *Now:* the official corpus only.

### D3 — where it is deployed, and whether the repo goes public (DROPPED, owner 2026-09-23 — a campaign instantiation will be hosted instead)

The siblings are served by GitHub Pages from `main`, which on this plan needs a **public** repo.
Public publishes `data/` (the books' text, as the siblings do) **and `assets/art/`, Paradox's
clan and sect marks and logos from the owner's pack**. Options: public + a custom domain
(e.g. `vtm5e.sortilege.online` — the owner picks the name; Invisible Sun took `actuality.`), or
keep it private and serve it only locally. Nothing in the repo hard-codes an origin; the Worker
admits localhost and, until D3, only `sortilege-inc.github.io`.

## Layout (the inherited three-layer shape; everything game-specific written here)

```
index.html               the site: the books, the clans, the Disciplines, the Storyteller
                         characters, the dice, search
build/                   the generators and their gates (data and art)
data/                    GENERATED — window.VTM5E.books / .entities / .index, one file per book
assets/art/              GENERATED from the owner's art pack
engine/                  system-agnostic, copied whole from Troika!
system/vtm5e/            the Vampire module: accessors, the entity renderer, the site's tabs,
                         the dice; for the table: ops, the table adapter, panels
gm/                      the GM's page, the table (vtt.html), the player's page (play.html)
worker/                  the session rooms (Cloudflare Worker + Durable Object); not deployed
assets/css/              the look
```

## Milestones

| # | Milestone | Proof required |
|---|---|---|
| M0 | Repo skeleton: `engine/*.js`, `build/parse_dsl.py`, `worker/` copied from Troika! and renamed; `engine/config.js`; launch entries (`vtt-vtm5e` 8738, `vtt-vtm5e-worker` 8789); the art built; this plan | `grep -rni troika engine worker/src build` matches nothing; the pilot parse read 138 of 138; `build_art.py` wrote 46 files |
| M1 | `build/` generates `data/` from the corpus, one file per book; `verify_data.py` both directions (DSL strings and `.lore` lines); `check_shape.py` against counts grepped from the corpus; `build.sh` | **landed 2026-09-23** — `bash build/build.sh`: 140 corpus files → 19 books (18 + the BASE), 9,774 entities, 7 corrections; records 202 powers · 95 rituals · 513 Storyteller characters; 12 Discipline names read from the corpus; `verify_data: 24187 strings — 0 uncovered · 0 unsourced`; `check_shape: OK (31 assertions)`, the record counts against a line scanner that shares no code with the parser; `node --check` on every data file. The build runs in 1.5 s. |
| M2 | The site: the books (outline, reader, sidebars, tables), the clans (the marks over the book's clan chapters), the Disciplines (powers by level, with the lozenges), the Storyteller characters, the dice, search | **landed 2026-09-23** — browser on 8738 at 1400 px, through the real controls: the shelf lists the 18 books from `index.js` under the pack's logo; **Core Rulebook** loads on demand and its outline lists 17 chapters in printed order (4 prologue · 33 Concepts … 382 Lore Sheets); *Criticals* reads verbatim under *Rules › Dice Pool Results* with its *Using the Vampire Dice* sidebar and the book's four die glyphs drawn with the pack's faces; *Lingering Kiss* shows the Errata's replacement Cost / System / Duration / Restrictions beside it; the prologue `.lore` renders 30 headings, 240 paragraphs. **Disciplines** shows the 12 lozenges; *Animalism* lists Levels 1–5 (2/2/6/2/4) + 1 unprinted, and *Bond Famulus* opens as *Animalism · Level 1 · Core Rulebook*. **Storyteller characters**: Chicago by Night filters to 70 of 513; *Damien, the Sheriff* opens as his whole entry (the stat block is under *Mask and Mien:*, decision 7) and pressing *Brawl (Armed Opponents) 4* rolled 4 dice in the tray. **Clans**: 21 marks; *Gangrel* finds 9 headings in the core and the Players Guide and leads with the core's entry. **Dice**: Difficulty 2, Hunger 2, rolled 1 2 4 · h7 h9 → *2 successes, win*; Willpower on the first two regular dice → 9 10 4 · h7 h9 → *4 successes, win, margin 2* (a lone 10 is no critical); Rouse Check → *Hunger unchanged*. **Search** "Rouse" → 80 hits. A fresh tab through all six tabs: 0 console errors. `check_shape` now also asserts the 12 rules the roller cites are in the core under those names (32 assertions). |
| M3 | The GM's page: Chronicle (the GM's scenes), Party (character files held generically until D1), Inspector, Cast (Storyteller characters put in a scene), Dice (V5 pools with Hunger, Rouse Checks, re-rolls), Rules & Book, Log, Campaign; the table and the player's page wired | **landed 2026-09-23** — browser at 1400 px, through the real controls: **Chronicle** added *Elysium at the Lyric Opera* by typing and Enter, and it became current; **Coterie** added *Marcus Vale* (player Sam) and the Inspector opened his panel; Hunger set to 2 on its track (`party[0].live.hunger` = 2); **Roll** 4 → r10 r8 · h2 h4, *2 successes*, logged with his `memberId`; **Rouse Check** rolled 3 → *Hunger +1 → 3*, stored and shown in the subtitle — and the result stayed on screen through the redraws its own log entry caused (decision 11). **Cast** "Damien" → *+* put him in the scene (`scenes[0].cast` = his record), his chip opened him in the Inspector (Chicago by Night loaded on demand), and *Brawl (Armed Opponents) 4* rolled and logged as *Storyteller · Damien, the Sheriff · Brawl (Armed Opponents)*. **Disciplines** lists 12; Oblivion's Levels 1–5 + unprinted; *Ashes to Ashes* opened in the Inspector. **Rules & Book** "Blush of Life" → the core's *Blush of Life* first. **Log** shows every roll with its dice and verdict. `gm/vtt.html` opened titled *Elysium at the Lyric Opera*, offered Marcus and Damien as tokens, and adding Marcus drew his token reading *Marcus Vale · Hunger 3*; `gm/play.html` shows *Join the table*. 0 console errors on each page. Under node the system ops apply and the role rule holds (a player may not `putScene`; the GM may). |
| M4 | The character sheet derived from the ACTOR, the creator (the core's *Character Creation* walked), the live trackers | **landed 2026-09-23** — `bash build/build.sh` → *24037 strings, 0 uncovered · 0 unsourced*; *check_shape: OK (33 assertions)*. **Creator** (`#create`), through the real controls: nine steps read off the core's Summary Sheet (*Core Concept* … *Sea of Time*); *Clan* offers **14 clans** (the core's 7, the Players Guide's 7 — before the corpus fix only Brujah had its Bane under it); picking *Gangrel* filled *Clan Bane* from the book and listed *Animalism, Fortitude, Protean*; Attributes' check read *The book: 1 at 4, 3 at 3, 4 at 2, 1 at 1. This sheet: 1 at 4, 8 at 1* after one click, Health/Willpower derived (*Health 4 (Stamina + 3), Willpower 2*); the Discipline row's pick is the BASE's 12-name ENUM, and at 2 dots Protean offered 8 powers of Level ≤ 2 from five books (*Squirm*, *Serpent's Kiss*, *The False Sip* recovered by the corpus fix); 16 Predator types. **Live sheet** (GM → Coterie → *Ilse Varga*, played by Rin): Health 4 / Willpower 2 trackers; four clicks → `live.health = {agg 0, sup 4}` and *Impaired*; the pool builder took Strength + Brawl and applied *Impaired: −2*; the member carries `templateId #vtm5Kindred000000001`. The errata chart row for Blood Potency 2 renders with its 7 printed heads. A character file round-trips (`fileOf` → JSON → `readMember`: Discipline rows, Hunger 2 kept) and a pre-D1 file still reads. 0 script errors (the console's only errors are the stale M5 session's socket to an idle Worker). |
| M5 | Sessions proven with `wrangler dev` on 8789; deploy is the owner's step (D3) | **landed 2026-09-23** — `wrangler dev` on **8789** (launch entry `vtt-vtm5e-worker`; `npx wrangler deploy --dry-run` bundles `system/vtm5e/ops.js` beside the engine's): the GM's real **Start session** went live as room **GFVA2** (status online, join link shown); a player at a second origin (`http://127.0.0.1:8738/gm/play.html?s=GFVA2`) joined by the link as role *player*, took the room's snapshot — the scene and its cast — with **no GM notes** (`progress` empty, no party notes), pressed **Claim** and got Marcus Vale's panel without the Storyteller's notes box; set **Hunger 4** and rolled → h4 h6 h3 h4, *1 success* — the GM's page had Hunger 4 and the same dice in its Log; the GM's scene note *GM ONLY: …* never reached the player; the player's `putScene` (a GM-only op) left the GM's scenes untouched. 0 console errors on both pages. |

One commit per milestone, pushed; each proven in the browser by the main session through the
real controls (PLAYBOOK §5) before the next begins.

## Decision log

| # | Decision | Why |
|---|---|---|
| 1 | The engine, parser and Worker are copied whole from the Troika! repo (the latest derivation); the Worker renamed, `ALLOWED_ORIGIN` reduced to the github.io origin until D3, local port **8789** | The engine has no game words; 8735–8737 and 8787–8788 belong to the siblings. |
| 2 | D4, D5 above | — |
| 3 | **Records by shape.** `build_data.SHAPES` names the printed fields that make a record — a power carries `Cost` and `System` or `Duration`; a ritual, ceremony or formula `Ingredients` and `Process` or `System`; a Storyteller character `Standard Dice Pools`, `Secondary Attributes`, or `Attributes` and `Skills` — and `data/records.js` (188 KB) lists every such entity with a few of its fields, so the Disciplines and Cast views work before any book is loaded | The BASE declares no types for them; the fields are the book's own labels, read by key, never by value. |
| 4 | **A power's Discipline and level are read from document order**: the nearest `Level N` heading before it in its file, and the nearest heading that is (or begins with) a Discipline name. The Discipline names come from the corpus by two of the book's own patterns — in the core's Disciplines chapter, a heading followed directly by `Characteristics`; and a heading printed under a clan's `Disciplines` heading in two or more books (which brings in Oblivion) | The nesting is too uneven for either pattern alone (a `Nicknames` heading sometimes sits between; *Cults*' Oblivion heading is lost). All 88 core powers place; 40 records elsewhere do not, because the corpus lost their names (reported, not patched). D1 recommends the BASE declare the names. **Superseded 2026-09-23 by 15** for the names; the level reading stands (widened by 16). |
| 5 | **The errata are carried as corrections** (`index.corrections`): each MODIFY names its target in the core and carries its replacement fields and its sidebars (with their TOPICS), so the reader shows the fix beside the rule it corrects | 7 MODIFY blocks; the parser read them, the first build dropped their fields — the gate caught it. |
| 7 | **A stat block printed under a generic sub-heading is known by the heading above it**: a record name three or more records share (Chicago by Night's 115 *Mask and Mien:*) is shown as its parent's name, and opening it shows the parent entry — the whole write-up with the stats inside | Both names are the corpus's; the rule is one line (`VtmData.generic`). |
| 8 | A power's printed fields (Cost, Dice Pools, System, Duration, Amalgam…) render as one box **after** its text, in the order the entity carries them | The book prints the text first; lifting fields above it would reorder the page. |
| 9 | **Clans** pairs the art pack's 21 marks with the headings that name the clan in the core and the Players Guide (every book on request), and shows the first clan-chapter heading of that name | The corpus has no clan type; a heading finder is honest about what it is. The search words are this tool's (`CLAN_WORDS`: *Malkavian*, *Ministry*/*Setite*, *Thin-blood* spellings). |
| 10 | A mask's art path is made absolute before it goes into a CSS variable (`VtmData.artUrl`) | A `url()` arriving through `var()` resolves against the stylesheet that uses it, so the relative path 404'd. |
| 11 | **One roller per coterie member, kept across redraws** (`VtmSheet.rollerFor`): the panels and the engine's player page redraw on every state change, and a roll's own log entry is one — a fresh roller wiped the result the moment it appeared. A redraw now only brings the kept roller's Hunger up to date | Found by driving the real button; the engine's `play.js` is left as it is. |
| 12 | **Until D1, a coterie member is a name, a player and current Hunger** (`templateId` `vtm5e-character`); the Storyteller adds one by name or loads a character file; the live panel is the Hunger track and the roller bound to it | Hunger and its 0–5 range are rules (the roller's constants), not a sheet; nothing is hand-listed. D1 replaces the template id with the ACTOR's and a file with the old id still reads. **Superseded 2026-09-23 by D1 / M4**: a member is now a sheet; a file with the old id still reads (19). |
| 13 | The Chronicle is the Storyteller's own scenes (`scenes` op, moduleId `chronicle`), and the Cast is every Storyteller character in the books, put in a scene by record id | No official book ships an `.arc`; D2 would add *The Black Hand*'s two. |
| 14 | The eleven corpus defects the build found are reported in `titterpig-dsl-vtm5e/TODO.md` (`6f845e1` there), not patched here | Ground rules. **2026-09-23: the owner had them fixed in the corpus** (not here) — see 21. |
| 6 | The gate counts `.lore` line by line, and skips ids **by key only** — Troika's regex that dropped any hash-shaped string also dropped corpus words (*Bankersofdunsirn*, *Lafamigliagiovanni*: loresheet slugs) | A value filter hides content; a key filter cannot. |
| 15 | **The Discipline names are the BASE's `^"Discipline"` ENUM** (`build_data.disciplines_of`); `check_shape` compares them with the ENUM line read off the BASE file, and asserts every core heading followed by *Characteristics* is one of them | With the nesting fixed, decision 4's heading patterns also caught labels ("Obfuscate:"); the declaration D1 added is exact. |
| 16 | **A level label may name what it holds** — `Level 4 Powers`, `Level 3 Ceremonies`, `Level 5 Formula`, `Level 2 Rituals` count as `Level N` (`LEVEL_HEADING`, and `VtmData.levelNumber` to match) | Tattered Facade prints 11 such labels; with them 210 of 211 power records place (was 184 of 202 before the corpus fix). The one left, Cults' *Mental Maze*, is read out of column order in the corpus (its TODO). |
| 17 | **A Predator type is a heading under *Predator Types* that prints its grants** (an `Items` list) | The Players Guide's summary sheet heads its own *Predator Types* of one-line reminders ("Alleycat:"), and a notes sidebar sits among the types; neither is a type. 16 types: the core's 10, the Players Guide's 6. |
| 18 | **The sheet is the ACTOR, read at runtime** (`VtmSheet.spec`): an INTEGER with a range ≤ 10 is dots, one without a ceiling a tracker size, a reference to a vocabulary type a pick from its ENUM, a LIST OF a declared row type rows of that type's fields; a run of dots is labelled by the heading the core's Characters chapter prints it under; Health and Willpower from the Summary Sheet's sentence (named constants); the Blood Potency figures are the errata chart's row, with its printed heads | PLAYBOOK §1b. Nothing about the sheet is typed in the tool except those constants, each citing its sentence. |
| 19 | **A coterie member's subtitle says what they are** (clan · predator · generation · Hunger · player), not their name again; a member saved before D1 (`{name, player}`) reads its name from `m.name` | The heading above it is the name; the old member showed *An unnamed Kindred*. |
| 20 | `check_shape` counts an `ACTOR "…" DEF` line as an entity, as the build does | The BASE's `ACTOR "Kindred"` is the first non-`^` declaration line in the corpus. |
| 21 | **The corpus defects were fixed upstream, at the owner's direction** (2026-09-23), in the conversion's extractor and generator — all 18 books regenerated, 85 files bumped, `gates.sh` green, `qa_vtm` never worse. Nothing here patches a corpus string | Ground rules; the TODO there holds the proof and what remains (Anarch *Blood Cult*, the Four Humors grid, Cults' *Mental Maze*, the third-party corpus not re-extracted). |
| 22 | **Rebuilt on the corpus's second pass** (titterpig-dsl-vtm5e `eff2305` + `c4281aa`, 2026-09-23): every loresheet level is its own DEF with its printed `^"Rating"`, under its loresheet (586/586, gated upstream by `qa_loresheets.py`); reading order and tables fixed; the buyer watermark stripped by the pipeline. **All 211 power records now place** (Cults' *Mental Maze* under Obfuscate, Level 3); decision 16's 210 is superseded. Nothing in the site changed: a loresheet renders through the generic entity view, each level showing RATING n (browser-checked on core's *Carna*, which the old corpus had merged into *Cainite Heresy*) | `build.sh` → `build_data: 140 corpus files → 19 books, 10137 entities; records: power 211, ritual 101, character 513`, `check_shape: OK (33 assertions)`; the seven tabs render with 0 console errors. |
| 23 | **data/ stays on the corpus's `c4281aa`, not its `ae948a6`** (2026-09-24). The corpus's table pass (`ae948a6`) lost every core Discipline power field — a list bullet drawn twice merged into its item line, so `^"Cost"` 88 → 0 and `^"System"` 112 → 0 — and a rebuild on it drops power records 211 → 123, rituals 101 → 73. The fix is proven in the conversion (core printed 245: fields back, and 88/112/44/92 on the eight books regenerated), but the owner holds any regeneration of all books until approved; so the VTT keeps the last good build, and V1 ships engine code only | `bash build/build.sh <c4281aa's 0.5>` → `power 211, ritual 101`, `0 uncovered`, `check_shape: OK (33 assertions)`, and `git status data/` empty: the committed data is exactly that build. |
| 24 | **Browser checks run headless** (Playwright's Chromium from `~/App/ray-so/scripts/node_modules`, the repo served through request routing on `http://vtt.test` — no server) while this folder's five preview slots are held by other chats. `file://` is not a substitute: images fail CORS there | 6 pages (`/`, `/#create` at 375px, `/` at 375px, `/gm/`, `/gm/vtt.html`, `/gm/play.html` at 375px): 0 console errors, no sideways scroll. |
| 25 | **V2's Scenes pane is a GM-only *arc* beside the Chronicle, not a second list of Chronicle scenes** | The Chronicle's `scenes` are shared (a player's page shows the scene in play), so a plan kept there would reach players; L5R5e's `arc` key is also what an instance's seed fills (INSTANCES.md), so Blood & Other Drugs can seed its arc the same way. |

## Instances (2026-09-23)

A campaign repo that is a **fork of this VTT**: it owns `campaign/` and a short list of root
files, and never edits an upstream file. The process is
`campaign/INSTANCE-PLAYBOOK.md` in `portents-and-fortunes`, written against the L5R5e line.
The first instance of *this* VTT is **Blood & Other Drugs**
(`sortilege-inc/blood-and-other-drugs`, private), which D3 named.

**I1 — the instance hook (landed 2026-09-23).** This VTT could not host an instance: it had no
`engine/instance.js`, no `build/build_layer.*` and no `instance:` key. All three now exist.

- `engine/instance.js` — **byte-identical to the L5R5e line's** (`diff` is empty; the file
  carries no system word). Four pages carry its stage tags: `index.html` (`data` after
  `data/errata.js`, `site` after `system/vtm5e/site.js`), `gm/index.html` (`data`, `gm` after
  `system/vtm5e/panels.js`), `gm/vtt.html` (`data`, `table`), `gm/play.html` (`data`, `play`).
- `build/build_layer.py` + `.sh` — **written for this build, not copied.** The L5R5e one is
  built on `Build` / `Ctx` / `gen`, which this build does not have; this one uses this build's
  own `collect_entities` / `corrections_of` / `records_of`, so a layer's Storyteller characters
  and Discipline powers are found by the **same shapes** as the corpus's, and a power under the
  layer's own `Level N` heading takes its Discipline and level. The layer's corrections merge
  into `index.corrections`, so a house rule shows beside the rule it changes.
- `engine/config.js` gains `instance: null` and the shape of the key, commented.

**The four gates, each proven by making it fail** (`build/fixtures/layer/fixture-layer.ttrpg`,
built to a scratch folder; the planted variants are not kept):

| Gate | Green | Planted fault | Result |
|---|---|---|---|
| strings, both ways by count | `29 (29 occurrences) — 0 uncovered · 0 short · 0 unsourced` | a `STEPS [ … ]` block the emitter does not carry | `UNCOVERED … 'A step the builder never carries.'`, exit 1 |
| ids | `5, none of them the corpus's (9758)` | the fixture takes `#vtm5Table000000000001` | `IDS — the layer reuses 1 corpus ids`, exit 1 |
| references | every id the layer points at resolves | `EXTENDS #vtm5NoSuchHash00001` | `REFERENCES — 1 ids … in neither`, exit 1 |
| names | `1 references by name, every one names an entity` | `MODIFY ^"No Such Rule At All"` | `NAMES — 1 references name nothing`, exit 1 |

Two faults of the first draft were caught by the gates themselves and fixed: coverage was read
from the book file alone (a layer's corrections ride in `index.js`, so it must be read over
both), and the names walker read a scalar property's `type` — the word `STRING` — as a
reference. It now reads only the places a name can be one: EXTENDS, `LIST OF`, a `REF`, a
`REFERENCES` line, a `MODIFY` / `OVERRIDE` target.

**In the browser (8738), through the real controls.** With `instance: null` the eight stage tags
are no-ops: 19 books, 9,758 entities, the seven site tabs, hero *18 books … 211 Discipline
powers, 101 rituals and formulae, 513 Storyteller characters*, 0 console errors. With a
temporary instance declared: **20 books with the layer first under its own heading *This
campaign*** and *The books* below, 9,763 entities, its stylesheet applied, its 2 records present
(the power reading `discipline: Animalism`, `level: Level 1` from the layer's own headings), its
1 correction in `index.corrections`, its site tab rendering when clicked, and its panel
registering 10th on the Storyteller's table and rendering. 0 console errors on both.
(`gm/` also logs a WebSocket failure for a **pre-existing** stored room `GFVA2` with no Worker
running — present before this change, unrelated to it.)

**One upstream bug the hook exposed, fixed here.** `system/vtm5e/site.js` printed
`idx.counts.books - 1`, a hardcoded subtraction for the BASE; a campaign book made it undercount
and folded the campaign's entries into a line that says *verbatim from the corpus*. The shelf now
takes the campaign's books out of that line and shelves them first under *This campaign*, as the
L5R5e line does. With no instance the line is unchanged: *18 books … 9758 entries*.

**Unchanged by all of this:** `bash build/build.sh` → `build_data: 140 corpus files → 19 books,
9758 entities; records: power 211, ritual 101, character 513`, `verify_data: 24037 strings — 0
uncovered · 0 unsourced`, `check_shape: OK (33 assertions)`, and `data/`'s 21 files
**byte-identical** before and after.

## Upstream work from the family PLAYBOOK and the L5R5e VTT (2026-09-24)

Read against `~/Sortilege/VTT/PLAYBOOK.md`, `INSTANCES.md` and `sortilege-vtt-l5r5e` I1–I18. The rule
that decides where each piece goes: *a feature one campaign needs today, every campaign of the system
needs tomorrow* — so the Blood & Other Drugs instance's needs are built here, upstream, and pulled.
The engine pieces are generic and ported as they are; the rest is L5R5e's shape rebuilt in V5's
terms from the corpus (never hand-listed rules).

| # | Milestone | Mirrors | State |
|---|---|---|---|
| V1 | **The engine port**: an instance's seed fills what its campaign never had (`engine/state.js seed`, `engine/app.js`); every page takes `VttConfig.title`; the site's tabs fold into a menu on a phone, with an instance's tab group first; the player page's buttons fold into one line on a phone; a join link to another room leaves the old one; `render.js` nests children to any depth; **`renameIds`** with `system/vtm5e/renamed-ids.js` — the ids the corpus's second pass moved (loresheet levels, reading-order fixes), old → new, so a stored campaign keeps its references | I1 (rest), I8, I10, I18 | **landed 2026-09-24** — headless check (decision 24): 0 console errors on six pages; at 375px the site menu folds (button shown, tabs hidden, open on tap); a campaign stored with a moved id comes back renamed in a scene cast and as a notes key (`2 renamed id(s) carried over`). `renamed-ids.js`: 54 ids f6a442b → 19e0f71, 70 gone with no single successor. Found on the way: the creator's text fields ran 20px past a 375px screen (in HEAD too), fixed in `vtm5e.css`. Not checked: the player page's folded buttons inside a live room (needs the Worker, whose preview slot is taken) |
| V2 | **The GM's panes**: Notes (the instance's document, gated), Scenes (the arc), Threads · NPCs (the scene's cast with their records) — no encounter arithmetic (V5 has none) | I9 | **landed 2026-09-24** — `system/vtm5e/gm-panes.js`; `setGmNotes`, `setArc`, `setThreads` GM-only ops. The arc is the Storyteller's *plan* (the Chronicle's scenes are shared, so an unplayed plan cannot live there); *Play it* makes an arc entry a Chronicle scene and its text that scene's Storyteller's notes. Headless (decision 24), through the panes' controls: three scenes planned, one moved up, one played, one given text and played into the Chronicle (current scene, notes carried); two threads, one closed (*1 open*); a free note; a gated Markdown document (the gate held until *Enter*); a scene of three Storyteller characters listed with their records' Clan / Generation / Blood Potency / Humanity / Standard Dice Pools, one opened in the Inspector. The pack carries `gmNotes`, `arc`, `threads`; a player's view carries none; all survive a reload. Under node: a player may send none of the three and none is forwarded (`forPlayers` → null; `putScene` still forwarded). 0 console errors. Found on the way: added by Enter, a row never appeared (the field kept focus and a pane never redraws under typing — L5R5e only adds by click); the pane now redraws and refocuses |
| V3 | **The roller and the log**: the pool, Hunger dice in it, Difficulty, Willpower reroll of up to three regular dice, messy critical and bestial failure read from the core's rules, Rouse checks; every roll and every tracker change an event with its cause | I2 | **landed 2026-09-24** — the roller was already the V5 one (pool, Hunger dice, Difficulty, messy critical, bestial failure, Rouse); what I2 adds, in V5's terms: every change to a character's trackers goes through one path (`VtmSheet.change`) that logs `{ kind: 'track' }` with each track's before → after and its cause (the Hunger track, a failed Rouse with its die, a Willpower re-roll, a box marked, a Remorse test and the Humanity it cost); a Willpower re-roll **marks 1 Superficial Willpower** (the core's *Willpower*: "A spent point of Willpower counts as having sustained a level of Superficial damage"), and on a full track converts one Superficial to Aggravated (*Impairment*); **no re-roll on a check or a tracker roll** (*Willpower*, *Checks* — the roller offered one); a re-roll's entry spells out each die's first face (*4 → 5, 2 → 9*); a *What for?* note rides with the roll. Headless, a Kindred through the real controls, dice pinned where the branch mattered: *Hunger 0 → 2 · set on the Hunger track*; Rouse on a 3 → *Hunger 2 → 3 · Rouse Check failed (3)*; pool 7, two regular dice re-rolled → *Willpower unmarked → 1 Superficial · Willpower re-roll of 2 dice*; Willpower 4 of 4 → *4 Superficial → 3 Superficial, 1 Aggravated*; a no-Hunger roll offered no die to pick and named the rule; a Health box, a Stain; Remorse on all 2s → *Stains 1 → 0 · Remorse test: 0 successes — Humanity 7 → 6*. Under node a player may log and change only their own. 0 console errors; the six pages of V1 still clean |
| V4 | **The record**: Hunger, Health and Willpower (Superficial / Aggravated), Humanity with Stains and the Remorse test, Blood Potency's effects from the core's chart (now a table), an XP ledger, archived versions | I3, I7 | **partly landed 2026-09-24** — the trackers, Humanity with Stains and the Remorse test were already on the sheet (M4). Landed: **Experience** — the ACTOR's *Total Experience* / *Spent Experience*, changed in play (± logged) and by a spend that writes cost, what, note and date to a ledger (a printed `^"Experience Ledger"` from an instance's layer is read as the ledger); **versions** — *Archive this version…* (`archivePartyVersion`, the player's own), a picker showing one read-only under a banner, the file withheld while it is on screen; **the character file** carries its versions and its log, and loading it brings them back (the file's log shown before the table's). Headless on a Kindred (Total 10, Spent 3): *Total Experience 10 → 11 · experience awarded*; spend 3 on *Brawl 2 → 3* (*trained with Theo*) → *Spent Experience 3 → 6*, ledger line, 7 → 5 available; archived *Version 1*, Hunger then raised to 4; the archived view: banner, 0 clickable boxes, no Spend, no download, and the Coterie's file button answered with the alert; back on Current the file held 1 version, 4 log entries, the ledger and Hunger 4; read back as a new member → 1 version, 4 history, the same XP. Under node a player may archive only their own. 0 console errors. **Waiting: Blood Potency's effects** — the chart is a TABLE only in the corpus's `ae948a6`, which data/ does not use (decision 23); and I7's build key (`versionOf` for a layer's archived sheets) waits for an instance that prints one |
| V5 | **Powers on the sheet**: each Discipline power a card opening to its printed text; a power with Dice Pools sets up the roll, its Cost makes the Rouse check; loresheet levels (now rated) on the sheet | I4, I13 | proposed |
| V6 | **The player's page on a phone**: Play · Roll · Gear, compact, numbers tapped not typed | I11, I12, I14, I17 | proposed |
| V7 | **Conflict**: the GM starts and ends it for the party; initiative, the attack pools, damage to the right track | I5, I16 | proposed |
| V8 | **Advancement**: XP spent at the core's Trait Costs (a TABLE in the corpus), archived as *Before advancement* | I16 | proposed |

## STOPPED HERE — to resume

**M0–M5 landed 2026-09-23**, each committed and pushed. D1 decided and landed (with the
corpus's eleven defects fixed upstream); **D2 on hold**; **D3 dropped** — this general build is
not deployed: the repo is private, `engine/config.js worker.deployed` is empty.

**Next (owner, not started): a campaign-specific instantiation of this VTT**, which is what will
be hosted. The campaign is not named yet. The TEETH repo's "campaign = pack" is the pattern to
read first (`sortilege-vtt-teeth` PLAYBOOK); hosting then follows the siblings' D3 path (Worker
deploy, `worker.deployed`, `ALLOWED_ORIGIN`, Pages + CNAME) for that instantiation.

To resume here: `bash build/build.sh` (gate green), start the launch entry `vtt-vtm5e` (8738)
and open `/`, `/#create` and `/gm/`; for sessions also `vtt-vtm5e-worker` (8789; `worker/` has
`node_modules`) and test a player from `http://127.0.0.1:8738/gm/play.html?s=CODE`.
**If D2 is taken up:** add the third-party corpus root to `build_data.py` (a second BOOKS list
with its own prefix map) and offer its two arcs in the Chronicle panel. Those books were
re-extracted with the current conversion code on 2026-09-23 (titterpig-dsl-vtm5e-3rdparty
`60688cc`), so they are ready.
