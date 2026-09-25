#!/usr/bin/env python3
"""
convert_cast.py — the Foundry world's actors into the campaign's DSL layer.

    python3 campaign/source/convert_cast.py [--date YYYY-MM-DD] [--only NAME] [--out FILE]

Reads campaign/source/foundry-export/<date>/ (export_foundry.py's verbatim copy) and writes
campaign/dsl/vtm5e-0.5-blood-cast.ttrpg: one DEF per actor, carrying the corpus's OWN printed
labels so the VTT finds them by the same shape as the published Storyteller characters
(build_data.py SHAPES: "Attributes" + "Skills").

Deliberate choices, recorded in campaign/PLAN.md:

* **The corpus's labels, not Foundry's field names.** A Kindred is written as Chicago by Night
  writes one — Sire / Embraced / Ambition / Convictions / Touchstones / Humanity / Generation /
  Blood Potency / Attributes / Secondary Attributes / Skills / Disciplines — in the corpus's own
  formatting ("Strength 4, Dexterity 4, Stamina 3; Charisma …", "Athletics (Chasing) 3, …").
* **A mortal keeps Attributes + Skills too.** The corpus summarises its mortals as "Standard
  Dice Pools: Physical 4, Social 3, Mental 5"; deriving that from Foundry's nine attributes
  would throw away eight values. The full shape is also a `character` to the build, so nothing
  is lost and nothing is invented.
* **A power the character has taken is a reference by name to the corpus's own power.** The
  Foundry items carry one-line GM shorthand ("Command attention and admiration") where the book
  carries paragraphs. Rules text is verbatim or it is a reference; it is never a paraphrase.
  The shorthand is presentation and goes nowhere near the gate.
* **Live state is not a record.** Current Hunger, damage taken, stains and the Werewolf/Hunter
  scaffolding the shared wod5e system carries for every actor are all dropped.
"""
import argparse
import datetime
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cast_aliases import ALIASES, AWAITING_THIRD_PARTY  # noqa: E402
ROOT = os.path.dirname(os.path.dirname(HERE))

ATTRS = [("Strength", "strength"), ("Dexterity", "dexterity"), ("Stamina", "stamina"),
         ("Charisma", "charisma"), ("Manipulation", "manipulation"), ("Composure", "composure"),
         ("Intelligence", "intelligence"), ("Wits", "wits"), ("Resolve", "resolve")]
SKILLS = [
    [("Athletics", "athletics"), ("Brawl", "brawl"), ("Craft", "craft"), ("Drive", "drive"),
     ("Firearms", "firearms"), ("Larceny", "larceny"), ("Melee", "melee"), ("Stealth", "stealth"),
     ("Survival", "survival")],
    [("Animal Ken", "animalken"), ("Etiquette", "etiquette"), ("Insight", "insight"),
     ("Intimidation", "intimidation"), ("Leadership", "leadership"), ("Performance", "performance"),
     ("Persuasion", "persuasion"), ("Streetwise", "streetwise"), ("Subterfuge", "subterfuge")],
    [("Academics", "academics"), ("Awareness", "awareness"), ("Finance", "finance"),
     ("Investigation", "investigation"), ("Medicine", "medicine"), ("Occult", "occult"),
     ("Politics", "politics"), ("Science", "science"), ("Technology", "technology")],
]
# the BASE's ^"Discipline" ENUM spelling, keyed by the wod5e field
DISCIPLINES = {"animalism": "Animalism", "auspex": "Auspex", "sorcery": "Blood Sorcery",
               "celerity": "Celerity", "dominate": "Dominate", "fortitude": "Fortitude",
               "obfuscate": "Obfuscate", "oblivion": "Oblivion", "potence": "Potence",
               "presence": "Presence", "protean": "Protean", "alchemy": "Thin-Blood Alchemy"}
# rating-less sub-lists of a Discipline, not Disciplines of their own
NOT_DISCIPLINES = ("ceremonies", "rituals")


def text_of(raw):
    """A Foundry HTML field as plain text, deterministically: paragraphs become blank lines."""
    if not raw:
        return ""
    s = re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", raw)
    s = re.sub(r"(?i)</\s*(p|div|h[1-6]|li)\s*>", "\n\n", s)
    s = re.sub(r"(?i)<\s*li[^>]*>", "• ", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def esc(s):
    """A DSL string body. An unescaped quote silently shreds the DEF that holds it."""
    return (s.replace("\\", "\\\\").replace('"', '\\"')
             .replace("\n", "\\n").replace("\r", "").replace("\t", " "))


def rating(node):
    return int((node or {}).get("value") or 0)


def specialty(sk):
    """wod5e keeps a specialty as a bonus whose `source` is its name."""
    for b in sk.get("bonuses") or []:
        src = (b.get("source") or "").strip()
        if src:
            return src
    return None


def attributes_line(sysd):
    a = sysd.get("attributes") or {}
    parts = []
    for i in (0, 3, 6):
        parts.append(", ".join("%s %d" % (label, rating(a.get(key))) for label, key in ATTRS[i:i + 3]))
    return "; ".join(parts)


def skills_line(sysd):
    sk = sysd.get("skills") or {}
    groups = []
    for group in SKILLS:
        got = []
        for label, key in group:
            node = sk.get(key) or {}
            n = rating(node)
            if n <= 0:
                continue                      # the corpus prints only the rated skills
            spec = specialty(node)
            got.append("%s (%s) %d" % (label, spec, n) if spec else "%s %d" % (label, n))
        if got:
            groups.append(", ".join(got))
    return "; ".join(groups)


def disciplines_line(sysd, name, warn):
    d = sysd.get("disciplines") or {}
    for key in NOT_DISCIPLINES:
        if rating(d.get(key)):
            warn.append("%s: %s has a rating (%d) but is a sub-list, not a Discipline"
                        % (name, key, rating(d.get(key))))
    got = [(DISCIPLINES[k], rating(v)) for k, v in sorted(d.items())
           if k in DISCIPLINES and rating(v) > 0]
    unknown = [k for k in d if k not in DISCIPLINES and k not in NOT_DISCIPLINES]
    if unknown:
        warn.append("%s: unmapped Discipline field(s) %s" % (name, ", ".join(sorted(unknown))))
    got.sort(key=lambda x: x[0])
    return ", ".join("%s %d" % (n, r) for n, r in got)


BLOB = re.compile(r"var d=(\{.*?\});var T=window\.VTM5E", re.S)
RECORDS = re.compile(r"T\.records=(\[.*\]);\}\)\(\);", re.S)


def norm(s):
    """For MATCHING only. The books set apostrophes and dashes typographically ("Spirit\u2019s
    Touch"); Foundry types them straight. The corpus's own spelling is what gets written."""
    return (s.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"')
             .replace("\u201d", '"').replace("\u2013", "-").replace("\u2014", "-")
             .strip().lower())


def corpus_powers():
    """The published Discipline powers, rituals and ceremonies by name -> [(hash, book)].
    A §5c REFERENCES line needs `#hash ^"Name"`: written with the name alone the parser reads
    it as a PROPERTY, not a reference (proven on the pilot). The corpus hashes every power, so
    a power a character has taken is referenced by hash."""
    data = os.path.join(ROOT, "data")
    idx = {}
    recs = os.path.join(data, "records.js")
    if not os.path.exists(recs):
        raise SystemExit("convert_cast: no data/records.js — run build/build.sh first")
    m = RECORDS.search(open(recs, encoding="utf-8").read())
    for r in json.loads(m.group(1)):
        if r.get("kind") in ("power", "ritual"):
            idx.setdefault(norm(r["name"]), []).append((r["id"], r.get("book"), r["name"].strip()))
    return idx


def corpus_names():
    """The published clans and Predator Types, by the VTT's own rules (system/vtm5e/data.js):
    a clan is a heading in a clans / caitiff / thin-blooded file that prints a Bane; a Predator
    Type is a heading under "Predator Types". The corpus is canon — where Foundry spells a
    published name differently, the corpus's spelling is what gets written (owner, 2026-09-24)."""
    data = os.path.join(ROOT, "data")
    ents = {}
    for fn in sorted(os.listdir(data)):
        if not fn.endswith(".js"):
            continue
        m = BLOB.search(open(os.path.join(data, fn), encoding="utf-8").read())
        if m:
            ents.update(json.loads(m.group(1))["entities"])
    clans, preds = {}, {}
    for h, e in ents.items():
        kids = [ents[c] for c in e.get("children") or [] if c in ents]
        if re.search(r"clans|caitiff|thin-blooded", e.get("file") or ""):
            if any(k["name"] == "Bane" for k in kids):
                clans.setdefault(norm(e["name"]), (h, e["book"], e["name"]))
        if e["name"] in ("Predator Types", "Predator Type"):
            for k in kids:
                nm = k["name"].strip()
                if nm.endswith(":") or nm in ("Predator Discipline Notes",):
                    continue
                preds.setdefault(norm(nm), (k["id"], k["book"], nm))
    # the thin-blooded are not a clan (no Bane), but Foundry files them as one
    for h, e in ents.items():
        if e["name"] == "The Thin-Blooded" and "thin-blooded" in (e.get("file") or ""):
            for key in ("thin-blooded", "thin-blood", "the thin-blooded"):
                clans.setdefault(key, (h, e["book"], e["name"]))
    return clans, preds


def resolve(raw, idx, kind, who, warn):
    """A published name as the corpus spells it. A parenthetical the world adds is the GM's
    own annotation, kept separately; it is never part of the printed name."""
    if not raw:
        return "", ""
    bare, note = raw.strip(), ""
    m = re.match(r"^([^(]+?)\s*\((.*)\)\s*$", bare)
    if m:
        bare, note = m.group(1).strip(), m.group(2).strip()
    hit = idx.get(norm(bare))
    if not hit and bare in ALIASES:
        target, why = ALIASES[bare]
        hit = idx.get(norm(target))
        if hit:
            warn.append("%s: %s %r read as %r (%s)" % (who, kind, bare, target, why))
    if not hit and bare in AWAITING_THIRD_PARTY:
        warn.append("%s: %s %r awaits the third-party shelf — %s (U2)"
                    % (who, kind, bare, AWAITING_THIRD_PARTY[bare]))
        return bare, note
    if not hit:
        warn.append("%s: %s %r is in no book — kept as the world spells it" % (who, kind, raw.strip()))
        return bare, note
    if hit[2] != bare:
        warn.append("%s: %s %r written as the corpus spells it, %r" % (who, kind, bare, hit[2]))
    return hit[2], note


def powers_of(actor, idx, warn):
    """The powers the character has taken, as references by hash. A name the corpus does not
    print is reported and left out — it is never written as a paraphrase."""
    out, name = [], actor.get("name", "?")
    for it in actor.get("items") or []:
        if it.get("type") != "power" or not it.get("name"):
            continue
        nm = it["name"].strip()
        hits = idx.get(norm(nm))
        if not hits and nm in ALIASES:
            target, why = ALIASES[nm]
            hits = idx.get(norm(target))
            if hits:
                warn.append("%s: power %r read as %r (%s)" % (name, nm, target, why))
        if not hits:
            warn.append("%s: power %r is in no book — left out of the DSL" % (name, nm))
            continue
        pick = next((h for h in hits if h[1] == "core"), hits[0])
        nm = pick[2]                      # the corpus's own spelling, not Foundry's
        if len({h[0] for h in hits}) > 1:
            warn.append("%s: power %r is printed in %d books; referencing %s in %s"
                        % (name, nm, len(hits), pick[0], pick[1]))
        out.append((nm, pick[0]))
    return sorted(set(out))


def fields_of(actor, warn, clans=None, preds=None):
    """The record, in the corpus's own order and labels. Only non-empty fields are written."""
    sysd = actor.get("system") or {}
    h = sysd.get("headers") or {}
    bio = sysd.get("bio") or {}
    kindred = actor.get("type") == "vampire"
    who = actor.get("name", "?")
    clan = next((i["name"] for i in actor.get("items") or [] if i.get("type") == "clan"), "")
    predator = next((i["name"] for i in actor.get("items") or [] if i.get("type") == "predatorType"), "")
    clan, clan_note = resolve(clan, clans or {}, "clan", who, warn)
    predator, pred_note = resolve(predator, preds or {}, "Predator Type", who, warn)
    out = []

    def add(label, value):
        v = (value or "").strip() if isinstance(value, str) else value
        if v not in ("", None):
            out.append((label, str(v)))

    add("Concept", text_of(h.get("concept")))
    add("Chronicle", text_of(h.get("chronicle")))
    if kindred:
        add("Clan", clan)
        add("Clan Note", clan_note)               # the GM's own annotation, not a printed name
        add("Sire", text_of(h.get("sire")))
        add("Embraced", text_of(bio.get("dateof", {}).get("death")))
        add("Predator Type", predator)
        add("Predator Type Note", pred_note)      # the GM's own annotation, not a printed name
    add("Ambition", text_of(h.get("ambition")))
    add("Desire", text_of(h.get("desire")))
    add("Convictions", text_of(h.get("tenets")))
    add("Touchstones", text_of(h.get("touchstones")))
    if kindred:
        add("Humanity", rating(sysd.get("humanity")) or None)
        add("Generation", text_of(h.get("generation")))
        add("Blood Potency", (sysd.get("blood") or {}).get("potency"))
    add("Attributes", attributes_line(sysd))
    sec = "Health %d, Willpower %d" % (int((sysd.get("health") or {}).get("max") or 0),
                                       int((sysd.get("willpower") or {}).get("max") or 0))
    add("Secondary Attributes", sec)
    add("Skills", skills_line(sysd))
    if kindred:
        add("Disciplines", disciplines_line(sysd, actor.get("name", "?"), warn))
    add("Appearance", text_of(sysd.get("appearance")))
    add("History", text_of(bio.get("history")))
    return out


def def_id(fid):
    return "#bod" + fid                        # deterministic, and traceable to the Foundry id


def render_actor(actor, indent, warn, idx, clans, preds):
    pad = " " * indent
    lines = ["%s%s ^\"%s\" DEF {" % (pad, def_id(actor["_id"]), esc(actor["name"]))]
    notes = text_of((actor.get("system") or {}).get("description")) or \
        text_of((actor.get("system") or {}).get("biography"))
    if notes:
        lines.append("%s    DESCRIPTION \"%s\"" % (pad, esc(notes)))
    for label, value in fields_of(actor, warn, clans, preds):
        lines.append("%s    ^\"%s\" STRING \"%s\"" % (pad, esc(label), esc(value)))
    powers = powers_of(actor, idx, warn)
    if powers:
        lines.append("%s    REFERENCES {" % pad)
        for nm, h in powers:
            lines.append("%s        \"Discipline power\" -> %s ^\"%s\"" % (pad, h, esc(nm)))
        lines.append("%s    }" % pad)
    lines.append("%s}" % pad)
    return lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    ap.add_argument("--only", help="convert just this actor (the pilot)")
    ap.add_argument("--out", default=os.path.join(ROOT, "campaign/dsl/vtm5e-0.5-blood-cast.ttrpg"))
    a = ap.parse_args()

    src = os.path.join(HERE, "foundry-export", a.date)
    m = json.load(open(os.path.join(src, "manifest.json"), encoding="utf-8"))
    folders = m["folders"]
    rows = m["listed"]["Actor"]
    if a.only:
        rows = [r for r in rows if r["name"] == a.only] or \
               [r for r in rows if a.only.lower() in r["name"].lower()]
        if not rows:
            raise SystemExit("convert_cast: no actor matching %r" % a.only)

    actors = {}
    for r in rows:
        actors[r["id"]] = json.load(open(os.path.join(src, "Actor", r["id"] + ".json"), encoding="utf-8"))

    # the folder tree, so a character sits under its barony as the world files it
    kids = {}
    for fid, f in folders.items():
        kids.setdefault(f.get("parent"), []).append(fid)
    in_folder = {}
    for r in rows:
        in_folder.setdefault(r["folder"], []).append(r["id"])

    warn = []
    body = []
    idx = corpus_powers()
    clans, preds = corpus_names()

    def emit(fid, indent):
        f = folders[fid]
        body.append("%s%s ^\"%s\" DEF {" % (" " * indent, "#bodf" + fid, esc(f["name"])))
        for aid in sorted(in_folder.get(fid, []), key=lambda i: actors[i]["name"]):
            body.extend(render_actor(actors[aid], indent + 4, warn, idx, clans, preds))
        for k in sorted(kids.get(fid, []), key=lambda i: folders[i]["name"]):
            emit(k, indent + 4)
        body.append("%s}" % (" " * indent))

    if a.only:
        for aid in sorted(actors, key=lambda i: actors[i]["name"]):
            body.extend(render_actor(actors[aid], 4, warn, idx, clans, preds))
    else:
        for fid in sorted([f for f in kids.get(None, []) if f in folders],
                          key=lambda i: folders[i]["name"]):
            if any(in_folder.get(x) for x in [fid] + kids.get(fid, [])):
                emit(fid, 4)
        loose = sorted(in_folder.get(None, []), key=lambda i: actors[i]["name"])
        if loose:
            body.append("    #bodfUnfiled000000001 ^\"Unfiled\" DEF {")
            for aid in loose:
                body.extend(render_actor(actors[aid], 8, warn, idx, clans, preds))
            body.append("    }")

    head = [
        'EXTENSION "vtm5e-blood-and-other-drugs-cast" EXTENDS "vtm5e" {',
        '    NAME "Blood & Other Drugs - the cast"',
        '    VERSION "0.1.0"',
        '    SPEC_VERSION "0.5"',
        '    RELEASE_DATE "%s"' % a.date,
        '',
        '    # Generated by campaign/source/convert_cast.py from the Foundry export of %s.' % a.date,
        '    # Every value is the world\'s own; the shape is the corpus\'s (Chicago by Night\'s',
        '    # Storyteller characters). Regenerate rather than edit by hand.',
        '',
    ]
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(head + body + ["}", ""]))
    print("convert_cast: %d actors → %s" % (len(actors), os.path.relpath(a.out, ROOT)))
    for w in warn:
        print("  note — %s" % w)
    return 0


if __name__ == "__main__":
    sys.exit(main())
