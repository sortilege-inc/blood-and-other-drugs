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
* **Advantages and Flaws are resolved against the books too.** The books head each one with
  its dots (*"• False Love"*, *"Knowledge Hungry (•)"*, *"Furcus • to •••"*), or print it as a
  field of a list (the core's Thin-blood Flaws: `^"Bestial Temper" STRING …`). The world writes
  the Advantage and runs what it concerns onto it — *False Love (Trieste)*, *Dark Secret:
  Masquerade Breacher*. That annotation is split off and kept in brackets after the book's
  name, and the book's entry is referenced by hash. Nothing is written as a definition here:
  every Advantage the world carries is the publisher's, and its text is the book's.
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
from cast_aliases import ACTOR_NAMES, ALIASES, ANNOTATED  # noqa: E402
from owner_records import OWNER_RECORDS, owner_actor  # noqa: E402

# The generated file's content version. Patch-bump it here whenever a run changes what the file
# says (a re-resolved reference, a renamed record) — never by hand in the .ttrpg, which the next
# run overwrites. 0.1.1: Embraced to Rule re-idded by the corpus's Voerman fix; 0.1.2: five Flaws
# resolve to the core's entries now the core types them (corpus 56a978e); 0.2.0: Trieste from the
# owner's own character file (owner_records.py) — a Sabbat Kindred, with a Path of Enlightenment.
CAST_VERSION = "0.2.0"
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
    # The thin-blooded print no Bane, so the rule above does not reach them; Foundry files
    # them as a clan. Registered here under the corpus's OWN name only — the world's two
    # spellings for it are declared in cast_aliases, where a name decision is reported.
    for h, e in ents.items():
        if e["name"] == "The Thin-Blooded" and "thin-blooded" in (e.get("file") or ""):
            clans.setdefault(norm(e["name"]), (h, e["book"], e["name"]))
    # A published heading may carry a qualifier the world leaves off: The Black Hand prints
    # its Predator Types as "Absolver (Sabbat Only)", Foundry records "Absolver". Registered
    # in a SECOND pass, and only where the bare key is still free, so a qualified heading can
    # never shadow a book that prints that name plainly. The corpus's full spelling is still
    # what gets written — resolve() reports the difference.
    for table in (clans, preds):
        for key, hit in list(table.items()):
            m = re.match(r"^(.*?)\s*\([^()]*\)$", hit[2])
            if m and m.group(1).strip():
                table.setdefault(norm(m.group(1)), hit)
    return clans, preds


def resolve(raw, idx, kind, who, warn):
    """A published name as the corpus spells it. A parenthetical the world adds is the GM's
    own annotation, kept separately; it is never part of the printed name."""
    if not raw:
        return "", ""
    bare, note = raw.strip(), ""
    whole = idx.get(norm(bare))
    if whole and whole[2] == bare:             # the book prints the parenthetical itself: "Hedonist (Sabbat Only)"
        return bare, ""
    m = re.match(r"^([^(]+?)\s*\((.*)\)\s*$", bare)
    if m:
        bare, note = m.group(1).strip(), m.group(2).strip()
    hit = idx.get(norm(bare))
    if not hit and bare in ALIASES:
        target, why = ALIASES[bare]
        hit = idx.get(norm(target))
        if hit:
            warn.append("%s: %s %r read as %r (%s)" % (who, kind, bare, target, why))
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


def fields_of(actor, warn, clans=None, preds=None, advs=None, refs=None):
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
        add("Path of Enlightenment", sysd.get("path"))   # a Sabbat Kindred's one added field (The Black Hand)
        if sysd.get("path_ref") and refs is not None:
            refs.append(("Path of Enlightenment", sysd["path_ref"][0], sysd["path_ref"][1]))
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
    for label, line, rs in feature_lines(actor, advs or {}, warn):
        add(label, line)
        if refs is not None:
            refs.extend(rs)
    add("Equipment", items_named(actor, "gear"))
    add("Resonance", items_named(actor, "resonance"))
    add("Appearance", text_of(sysd.get("appearance")))
    add("History", text_of(bio.get("history")))
    return out


def def_id(fid):
    return "#bod" + fid                        # deterministic, and traceable to the Foundry id


FEATURE_FIELDS = [("Advantages", "Advantage", ("merit", "background")), ("Flaws", "Flaw", ("flaw",))]
# a heading's dot notation, in every form the books print it: "• False Love", "Unbondable
# •••••", "Knowledge Hungry (•)", "Dark Secret (• to ••••)", "Haunted (•+)", "Furcus • to •••",
# "Business Establishment •• or •••"
DOT_NOTATION = re.compile(r"^\s*•+\s*|\s*\((?:[•+\s]|to|or)+\)\s*$|\s+•[•\s]*(?:(?:to|or)\s*•+\s*)?$")
# fields of an entity that are its structure, not the names of Advantages it lists
NOT_ADVANTAGES = {"Items", "Examples", "Epigraph", "Steps", "Notes", "Note", "Quote", "System"}
ADVANTAGE_HEADINGS = re.compile(r"(?i)\b(merits?|flaws?|backgrounds?|advantages)\b")


def published(name):
    """A book's Advantage heading as its name: the dot notation and a trailing colon off."""
    n, prev = name.strip().rstrip(":").strip(), None
    while prev != n:
        prev, n = n, DOT_NOTATION.sub("", n).strip()
    return n


def corpus_advantages():
    """norm(name) -> (hash, entity name, the name as the book spells it). An Advantage is a
    heading anywhere under a Merits / Flaws / Backgrounds / Advantages heading, a loresheet or
    one of its levels, or a field of a heading that lists them (the core's "Thin-blood Flaws":
    `^"Bestial Temper" STRING …`) — whose own entity is what gets referenced. Where several
    books print one, the first in shelf order wins, a chapter before an appendix."""
    data = os.path.join(ROOT, "data")
    ents, rank = {}, {}
    idx = json.loads(re.search(r"T\.index=(\{.*\});\}\)\(\);", open(os.path.join(data, "index.js"),
                     encoding="utf-8").read(), re.S).group(1))
    for i, b in enumerate(idx["books"]):
        rank[b["id"]] = i
    for fn in sorted(os.listdir(data)):
        m = BLOB.search(open(os.path.join(data, fn), encoding="utf-8").read()) if fn.endswith(".js") else None
        if m:
            ents.update(json.loads(m.group(1))["entities"])

    def trail(e):
        out = []
        while e:
            out.append(e["name"])
            e = ents.get(e.get("parent"))
        return out

    cands = []
    for h, e in ents.items():
        t = trail(e)
        order = (rank.get(e["book"], 999), "appendi" in (e.get("file") or ""), e.get("file") or "", h)
        if any(ADVANTAGE_HEADINGS.search(x) for x in t[1:]) or e.get("type") in ("Loresheet", "Loresheet Level"):
            cands.append((order, norm(published(e["name"])), (h, e["name"], published(e["name"]))))
        if ADVANTAGE_HEADINGS.search(e["name"]):
            for pr in e.get("props") or []:
                if pr.get("vk") == "scalar" and pr["name"] not in NOT_ADVANTAGES:
                    cands.append((order, norm(published(pr["name"])), (h, e["name"], published(pr["name"]))))
    out = {}
    for _o, key, hit in sorted(cands, key=lambda c: c[0]):
        if key:
            out.setdefault(key, hit)
    return out


def resolve_advantage(raw, advs, who, warn):
    """(name, annotation, hit): the book's name for a world Advantage, what the world adds to
    it, and the book's entry — or the world's own spelling and no hit, reported."""
    raw = raw.strip()

    aliased = []

    def look(n):
        n = published(n)
        hit = advs.get(norm(n))
        if not hit and n in ALIASES:
            hit = advs.get(norm(ALIASES[n][0]))
            if hit and n not in aliased:
                aliased.append(n)
        return hit

    def done(name, note, hit):
        for n in aliased:                               # reported once, for the reading taken
            if norm(ALIASES[n][0]) == norm(name):
                warn.append("%s: Advantage %r read as %r (%s)" % (who, n, ALIASES[n][0], ALIASES[n][1]))
        return name, note, hit

    if raw in ANNOTATED:
        name, note, why = ANNOTATED[raw]
        hit = look(name)
        if hit:
            warn.append("%s: Advantage %r read as %r, annotation %r (%s)" % (who, raw, hit[2], note, why))
            return hit[2], note, hit
    hit = look(raw)
    if hit:
        return done(hit[2], "", hit)
    m = re.match(r"^(.*?)\s*[\(\[](.*)[\)\]]$", raw)             # "False Love (Trieste)", "Clan Curse [Brujah]"
    if m:
        hit = look(m.group(1))
        if hit:
            return done(hit[2], m.group(2).strip(), hit)
    m = re.match(r"^([^:]+):\s*(.+)$", raw)                           # "Haven: Luxury", "Prey Exclusion: Children"
    if m:
        head, tail = m.group(1).strip(), m.group(2).strip()
        hit = look(tail)
        if hit:                                                        # the category, then the Advantage in it
            return done(hit[2], head, hit)
        hit = look(head)
        if hit:                                                        # the Advantage, then what it concerns
            return done(hit[2], tail, hit)
    warn.append("%s: Advantage %r is in no book — kept as the world spells it" % (who, raw))
    return raw, "", None


def feature_lines(actor, advs, warn):
    """[(label, line, [(ref label, hash, entity name)])] for Advantages and Flaws: the book's
    name, the world's annotation in brackets, the world's dots; each resolved one referenced."""
    items = [i for i in (actor.get("items") or []) if i.get("type") == "feature"]
    out = []
    for label, reflabel, kinds in FEATURE_FIELDS:
        got, refs = [], []
        for i in items:
            sysd = i.get("system") or {}
            if (sysd.get("featuretype") or "") not in kinds or not (i.get("name") or "").strip():
                continue
            n = sysd.get("points")
            n = int(n) if isinstance(n, (int, float)) or (isinstance(n, str) and n.isdigit()) else 0
            if i.get("_ref"):                  # the owner's file names the book's entry itself
                name, note, hit = i["_ref"][2], "", (i["_ref"][0], i["_ref"][1], i["_ref"][2])
            else:
                name, note, hit = resolve_advantage(i["name"], advs, actor.get("name", "?"), warn)
            txt = "%s (%s)" % (name, note) if note else name
            got.append("%s %d" % (txt, n) if n > 0 else txt)
            if hit and (reflabel, hit[0]) not in [(x[0], x[1]) for x in refs]:
                refs.append((reflabel, hit[0], hit[1]))
        if got:
            out.append((label, ", ".join(got), refs))
    return out


def items_named(actor, itype):
    """The world's own names for one item type, in the order the export carries them."""
    return ", ".join((i.get("name") or "").strip() for i in (actor.get("items") or [])
                     if i.get("type") == itype and (i.get("name") or "").strip())


def render_actor(actor, indent, warn, idx, clans, preds, advs):
    pad = " " * indent
    lines = ["%s%s ^\"%s\" DEF {" % (pad, def_id(actor["_id"]), esc(actor["name"]))]
    notes = text_of((actor.get("system") or {}).get("description")) or \
        text_of((actor.get("system") or {}).get("biography"))
    if notes:
        lines.append("%s    DESCRIPTION \"%s\"" % (pad, esc(notes)))
    refs = []
    for label, value in fields_of(actor, warn, clans, preds, advs, refs):
        lines.append("%s    ^\"%s\" STRING \"%s\"" % (pad, esc(label), esc(value)))
    powers = powers_of(actor, idx, warn)
    if powers or refs:
        lines.append("%s    REFERENCES {" % pad)
        for nm, h in powers:
            lines.append("%s        \"Discipline power\" -> %s ^\"%s\"" % (pad, h, esc(nm)))
        for label, h, nm in refs:
            lines.append("%s        \"%s\" -> %s ^\"%s\"" % (pad, label, h, esc(nm)))
        lines.append("%s    }" % pad)
    lines.append("%s}" % pad)
    return lines


def main():
    ap = argparse.ArgumentParser()
    # the newest dated export on disk, not today's date: an export is taken when the world
    # changes, and a run after midnight must not look for one that was never made
    exports = sorted(d for d in os.listdir(os.path.join(HERE, "foundry-export"))
                     if re.match(r"^\d{4}-\d{2}-\d{2}$", d))
    ap.add_argument("--date", default=exports[-1] if exports else datetime.date.today().isoformat())
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
        if actors[r["id"]]["name"] in ACTOR_NAMES:  # the owner's spelling (cast_aliases.ACTOR_NAMES)
            was = actors[r["id"]]["name"]
            actors[r["id"]]["name"] = ACTOR_NAMES[was]
            print("  renamed: %r → %r" % (was, ACTOR_NAMES[was]), file=sys.stderr)
        if r["id"] in OWNER_RECORDS:  # the owner's own character file stands in (owner_records.py)
            actors[r["id"]] = owner_actor(actors[r["id"]], r["id"])
            print("  owner's record: %s ← %s" % (actors[r["id"]]["name"], OWNER_RECORDS[r["id"]][0]), file=sys.stderr)

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
    advs = corpus_advantages()

    def emit(fid, indent):
        f = folders[fid]
        body.append("%s%s ^\"%s\" DEF {" % (" " * indent, "#bodf" + fid, esc(f["name"])))
        for aid in sorted(in_folder.get(fid, []), key=lambda i: actors[i]["name"]):
            body.extend(render_actor(actors[aid], indent + 4, warn, idx, clans, preds, advs))
        for k in sorted(kids.get(fid, []), key=lambda i: folders[i]["name"]):
            emit(k, indent + 4)
        body.append("%s}" % (" " * indent))

    if a.only:
        for aid in sorted(actors, key=lambda i: actors[i]["name"]):
            body.extend(render_actor(actors[aid], 4, warn, idx, clans, preds, advs))
    else:
        for fid in sorted([f for f in kids.get(None, []) if f in folders],
                          key=lambda i: folders[i]["name"]):
            if any(in_folder.get(x) for x in [fid] + kids.get(fid, [])):
                emit(fid, 4)
        loose = sorted(in_folder.get(None, []), key=lambda i: actors[i]["name"])
        if loose:
            body.append("    #bodfUnfiled000000001 ^\"Unfiled\" DEF {")
            for aid in loose:
                body.extend(render_actor(actors[aid], 8, warn, idx, clans, preds, advs))
            body.append("    }")

    head = [
        'EXTENSION "vtm5e-blood-and-other-drugs-cast" EXTENDS "vtm5e" {',
        '    NAME "Blood & Other Drugs - the cast"',
        '    VERSION "%s"' % CAST_VERSION,
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
