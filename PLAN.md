# sortilege-vtt-vtm5e — plan and decision log

A virtual tabletop for **Vampire: The Masquerade 5th Edition**, built on the Titterpig corpus
`titterpig-dsl-vtm5e/0.5`. Its shape follows `sortilege-vtt-teeth`'s `PLAYBOOK.md` and the
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
| `~/Sortilege/Titterpig/DSL/titterpig-dsl-vtm5e/0.5` | 140 files (138 `.ttrpg`, 2 `.lore`), 11 MB, **18 books**; its `gates.sh` (2026-09-22): validator 138 files 0/0, 615 §5d sites 0 hashless, 525 GUIDANCE 0 errors, 18/18 coverage gates PASS |
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
| **The player character** | **nothing** — no ACTOR, no TEMPLATE | see **D1** |

**Two corpus defects visible already** (to be reported, not patched): the nesting is uneven
(*Brujah*'s *Disciplines* and *Bane* nest under the clan, *Gangrel*'s sit at the top level; the
Animalism levels are top-level, Celerity's nest), and several headings are split mid-word
(*Superficial Willpower Dam-* / *Age*); the core's *Summary Sheet* page was read across its
columns ("2. gamer: Technology 3. maker: Craft 4. activist: Politics or Lead-").

## Decisions

**D1 — PROPOSED: declare the player character in the corpus BASE.** The playbook derives the
sheet, the live sheet and the creator from the ACTOR type's property declarations, read at
runtime (PLAYBOOK §1b); Invisible Sun (D1, owner 2026-09-20) and Troika! (D1, owner 2026-09-22)
both added the missing declaration to the corpus as its own commit rather than hand-list a sheet
in the tool. Detail, draft and trade-off below under *Owner decisions*.

**D2 — PROPOSED: load the third-party corpus too.** Detail below.

**D3 — PROPOSED: the deployment origin, and the repo's visibility.** Detail below.

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

### D1 — declare the player character in the corpus BASE (recommended)

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

### D2 — load the third-party corpus too (recommended)

`titterpig-dsl-vtm5e-3rdparty` holds *The Black Hand* (with **the only two `.arc` scenarios** in
either corpus, *Lost in the Garden* and *Our Graves Are Empty*), the owner's own Sunburners Path,
and *Summoned Stories*. Its README says a consumer chooses whether to load it. *Recommendation:*
load it as a second shelf, labelled third-party / house, and offer its two arcs as modules in the
Chronicle panel; the build already takes a list of corpus roots. *Trade-off:* third-party text
beside the official books (kept visibly apart); without it the GM's scene list is entirely
hand-authored. *Now:* the official corpus only.

### D3 — where it is deployed, and whether the repo goes public (owner's call)

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
| M4 | The character sheet derived from the ACTOR (blocked on **D1**) | — |
| M5 | Sessions proven with `wrangler dev` on 8789; deploy is the owner's step (D3) | browser, two origins |

One commit per milestone, pushed; each proven in the browser by the main session through the
real controls (PLAYBOOK §5) before the next begins.

## Decision log

| # | Decision | Why |
|---|---|---|
| 1 | The engine, parser and Worker are copied whole from the Troika! repo (the latest derivation); the Worker renamed, `ALLOWED_ORIGIN` reduced to the github.io origin until D3, local port **8789** | The engine has no game words; 8735–8737 and 8787–8788 belong to the siblings. |
| 2 | D4, D5 above | — |
| 3 | **Records by shape.** `build_data.SHAPES` names the printed fields that make a record — a power carries `Cost` and `System` or `Duration`; a ritual, ceremony or formula `Ingredients` and `Process` or `System`; a Storyteller character `Standard Dice Pools`, `Secondary Attributes`, or `Attributes` and `Skills` — and `data/records.js` (188 KB) lists every such entity with a few of its fields, so the Disciplines and Cast views work before any book is loaded | The BASE declares no types for them; the fields are the book's own labels, read by key, never by value. |
| 4 | **A power's Discipline and level are read from document order**: the nearest `Level N` heading before it in its file, and the nearest heading that is (or begins with) a Discipline name. The Discipline names come from the corpus by two of the book's own patterns — in the core's Disciplines chapter, a heading followed directly by `Characteristics`; and a heading printed under a clan's `Disciplines` heading in two or more books (which brings in Oblivion) | The nesting is too uneven for either pattern alone (a `Nicknames` heading sometimes sits between; *Cults*' Oblivion heading is lost). All 88 core powers place; 40 records elsewhere do not, because the corpus lost their names (reported, not patched). D1 recommends the BASE declare the names. |
| 5 | **The errata are carried as corrections** (`index.corrections`): each MODIFY names its target in the core and carries its replacement fields and its sidebars (with their TOPICS), so the reader shows the fix beside the rule it corrects | 7 MODIFY blocks; the parser read them, the first build dropped their fields — the gate caught it. |
| 7 | **A stat block printed under a generic sub-heading is known by the heading above it**: a record name three or more records share (Chicago by Night's 115 *Mask and Mien:*) is shown as its parent's name, and opening it shows the parent entry — the whole write-up with the stats inside | Both names are the corpus's; the rule is one line (`VtmData.generic`). |
| 8 | A power's printed fields (Cost, Dice Pools, System, Duration, Amalgam…) render as one box **after** its text, in the order the entity carries them | The book prints the text first; lifting fields above it would reorder the page. |
| 9 | **Clans** pairs the art pack's 21 marks with the headings that name the clan in the core and the Players Guide (every book on request), and shows the first clan-chapter heading of that name | The corpus has no clan type; a heading finder is honest about what it is. The search words are this tool's (`CLAN_WORDS`: *Malkavian*, *Ministry*/*Setite*, *Thin-blood* spellings). |
| 10 | A mask's art path is made absolute before it goes into a CSS variable (`VtmData.artUrl`) | A `url()` arriving through `var()` resolves against the stylesheet that uses it, so the relative path 404'd. |
| 11 | **One roller per coterie member, kept across redraws** (`VtmSheet.rollerFor`): the panels and the engine's player page redraw on every state change, and a roll's own log entry is one — a fresh roller wiped the result the moment it appeared. A redraw now only brings the kept roller's Hunger up to date | Found by driving the real button; the engine's `play.js` is left as it is. |
| 12 | **Until D1, a coterie member is a name, a player and current Hunger** (`templateId` `vtm5e-character`); the Storyteller adds one by name or loads a character file; the live panel is the Hunger track and the roller bound to it | Hunger and its 0–5 range are rules (the roller's constants), not a sheet; nothing is hand-listed. D1 replaces the template id with the ACTOR's and a file with the old id still reads. |
| 13 | The Chronicle is the Storyteller's own scenes (`scenes` op, moduleId `chronicle`), and the Cast is every Storyteller character in the books, put in a scene by record id | No official book ships an `.arc`; D2 would add *The Black Hand*'s two. |
| 6 | The gate counts `.lore` line by line, and skips ids **by key only** — Troika's regex that dropped any hash-shaped string also dropped corpus words (*Bankersofdunsirn*, *Lafamigliagiovanni*: loresheet slugs) | A value filter hides content; a key filter cannot. |
