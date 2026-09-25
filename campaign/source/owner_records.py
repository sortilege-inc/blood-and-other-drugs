#!/usr/bin/env python3
"""
owner_records.py — a character the owner has made on the VTT's creator, standing in for the
Foundry world's record of them.

Foundry is the source of truth for records (PLAN.md O2), except where the owner says a record
there is wrong and hands over their own: a `sortilege-vtt-character` file saved from the
creator, kept verbatim under `campaign/source/characters/`. OWNER_RECORDS names each one by its
Foundry actor id, so the character keeps its id, its name and its place in the world's folders.

`owner_actor()` reshapes the file into a Foundry actor — the same fields convert_cast.py reads —
so the character goes through the same resolution against the books and the same checks. It
maps; it decides nothing. Where the file names an Advantage by the book's id, that id is kept
(`_ref`); where it gives only a name, the converter resolves it as it does the world's. A
Path of Enlightenment makes the record a Sabbat Kindred (The Black Hand's ACTOR), as the sheet
reads it.

Adding an entry is a content decision: the owner's, and reported in PLAN.md.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

OWNER_RECORDS = {
    # Foundry actor id      the owner's file                              ruled
    "RAAKM69fm4iF2eXh": ("characters/trieste.vtm5e-character.json",    "owner, 2026-09-25: the world's Trieste was wrong and "
                                                                         "did not account for the homebrew; not 100% complete"),
}

ATTR_KEYS = ["Strength", "Dexterity", "Stamina", "Charisma", "Manipulation", "Composure",
             "Intelligence", "Wits", "Resolve"]
SKILL_KEYS = ["Athletics", "Brawl", "Craft", "Drive", "Firearms", "Larceny", "Melee", "Stealth", "Survival",
              "Animal Ken", "Etiquette", "Insight", "Intimidation", "Leadership", "Performance", "Persuasion",
              "Streetwise", "Subterfuge", "Academics", "Awareness", "Finance", "Investigation", "Medicine",
              "Occult", "Politics", "Science", "Technology"]
DISC_KEYS = {"Animalism": "animalism", "Auspex": "auspex", "Blood Sorcery": "sorcery", "Celerity": "celerity",
             "Dominate": "dominate", "Fortitude": "fortitude", "Obfuscate": "obfuscate", "Oblivion": "oblivion",
             "Potence": "potence", "Presence": "presence", "Protean": "protean", "Thin-Blood Alchemy": "alchemy"}
# the creator files a Background (Contacts, Allies…) with the Merits; the world calls them backgrounds
BACKGROUND_PARENTS = ("Background", "Backgrounds")

_ENTS = None


def entities():
    """Every entity in the books' data/: id → (book, name, type, parent id)."""
    global _ENTS
    if _ENTS is None:
        _ENTS = {}
        blob = re.compile(r"var d=(\{.*?\});var T=window\.VTM5E", re.S)
        data = os.path.join(ROOT, "data")
        for fn in sorted(os.listdir(data)):
            if not fn.endswith(".js"):
                continue
            m = blob.search(open(os.path.join(data, fn), encoding="utf-8").read())
            if not m:
                continue
            for k, v in (json.loads(m.group(1)).get("entities") or {}).items():
                _ENTS[k if k.startswith("#") else "#" + k] = (fn[:-3], v.get("name") or "", v.get("type") or "", v.get("parent") or "")
    return _ENTS


def ordinal(n):
    return "%d%s" % (n, "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th"))


def load(aid):
    path, _why = OWNER_RECORDS[aid]
    return json.load(open(os.path.join(HERE, path), encoding="utf-8"))


def owner_actor(world, aid):
    """The world's actor with its game fields replaced by the owner's file. Id, name, type and
    folder stay the world's; everything the character *is* comes from the file."""
    c = load(aid)
    if c.get("kind") != "sortilege-vtt-character" or c.get("system") != "vtm5e":
        raise SystemExit("owner_records: %s is not a vtm5e character file" % OWNER_RECORDS[aid][0])
    v = c.get("values") or {}
    ents = entities()
    num = lambda k: int(v.get(k) or 0)  # noqa: E731

    skills = {}
    specs = {}
    for s in v.get("Specialties") or []:
        if (s.get("Skill") or "").strip() and (s.get("Specialty") or "").strip():
            specs.setdefault(s["Skill"].strip(), s["Specialty"].strip())
    for k in SKILL_KEYS:
        node = {"value": num(k)}
        if k in specs:
            node["bonuses"] = [{"source": specs[k]}]
        skills[k.lower().replace(" ", "")] = node

    discs, items = {}, []
    for d in v.get("Disciplines") or []:
        key = DISC_KEYS.get((d.get("Discipline") or "").strip())
        if key:
            discs[key] = {"value": int(d.get("Dots") or 0)}
        for pw in d.get("Powers") or []:
            if (pw or "").strip():
                items.append({"type": "power", "name": pw.strip()})

    if (v.get("Clan") or "").strip():
        items.append({"type": "clan", "name": v["Clan"].strip()})
    if (v.get("Predator") or "").strip():
        items.append({"type": "predatorType", "name": v["Predator"].strip()})

    for a in v.get("Advantages & Flaws") or []:
        name = (a.get("Name") or "").strip()
        if not name:
            continue
        ref = a.get("Advantage")
        kind = "flaw" if a.get("Flaw") else "merit"
        if ref:
            hit = ents.get(ref if ref.startswith("#") else "#" + ref)
            if not hit:
                raise SystemExit("owner_records: %s names %s for %r, which is in no book" % (OWNER_RECORDS[aid][0], ref, name))
            parent = ents.get(hit[3], ("", "", "", ""))
            if not a.get("Flaw") and (hit[2] == "Background" or parent[1] in BACKGROUND_PARENTS):
                kind = "background"
        item = {"type": "feature", "name": name, "system": {"featuretype": kind, "points": int(a.get("Dots") or 0)}}
        if ref:
            hit = ents[ref if ref.startswith("#") else "#" + ref]
            item["_ref"] = (ref if ref.startswith("#") else "#" + ref, hit[1], name)
        items.append(item)

    touch = [t.strip() for t in (v.get("Touchstones & Convictions") or []) if (t or "").strip()]
    path = (v.get("Path of Enlightenment") or "").strip()
    path_ref = None
    if path:
        found = [(k, e) for k, e in ents.items() if e[1] == path]
        if len(found) != 1:
            raise SystemExit("owner_records: Path %r is printed %d times, not once" % (path, len(found)))
        path_ref = (found[0][0], found[0][1][1])     # (id, the book's name)

    out = {k: world[k] for k in ("_id", "name", "type", "folder") if k in world}
    out["type"] = "vampire"
    out["items"] = items
    out["system"] = {
        "headers": {"concept": v.get("Concept") or "", "chronicle": v.get("Chronicle") or "",
                    "sire": v.get("Sire") or "", "ambition": v.get("Ambition") or "", "desire": v.get("Desire") or "",
                    "tenets": v.get("Chronicle Tenets") or "", "touchstones": "\n\n".join(touch),
                    "generation": ordinal(num("Generation")) if num("Generation") else ""},
        "attributes": {k.lower(): {"value": num(k)} for k in ATTR_KEYS},
        "skills": skills,
        "disciplines": discs,
        "humanity": {"value": num("Humanity")},
        "blood": {"potency": num("Blood Potency")},
        "health": {"max": num("Health")},
        "willpower": {"max": num("Willpower")},
        "description": v.get("Notes") or "",
        "appearance": v.get("Appearance") or "",
        "bio": {"history": v.get("History") or "", "dateof": {"death": v.get("Date of death") or ""}},
        "path": path,
        "path_ref": path_ref,
    }
    return out
