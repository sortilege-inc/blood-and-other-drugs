# sortilege-vtt-vtm5e

A play aid for **Vampire: The Masquerade 5th Edition** built from the
[Titterpig DSL corpus](../../Titterpig/DSL/titterpig-dsl-vtm5e) — the eighteen converted books,
the clans, the Disciplines, the Storyteller characters, the dice, and the Storyteller's table to
run a chronicle from. Plan, decisions and milestones: [PLAN.md](PLAN.md).

Buildless static site. The site is the books; the Storyteller's table is under `gm/` — the same
engine TEETH's, Invisible Sun's and Troika!'s tables run on, with Vampire's own panels. Players
join a session by room code on `gm/play.html`.

## Running it

```bash
python3 -m http.server 8738
```

then open `http://localhost:8738/`. For sessions, `cd worker && npm install && npx wrangler dev --port 8789`
(the app on localhost talks to it); a player on the same machine tests from a second origin,
`http://127.0.0.1:8738/gm/play.html`.

## Where the content comes from

Everything this tool shows is generated from `titterpig-dsl-vtm5e/0.5`. **Nothing here is
hand-transcribed**; `data/*.js` is generated and regenerating is the only way to change it.

```bash
bash build/build.sh            # build → verify both directions → check shapes → node --check
python3 build/build_art.py     # the owner's art pack (~/Downloads) → assets/art/
```

## Rights

*Vampire: The Masquerade* is © Paradox Interactive / World of Darkness. The clan, sect and dice
marks in `assets/art/` come from the owner's art pack. This is an unofficial play aid for the
owner's table, not a redistribution of the books.
