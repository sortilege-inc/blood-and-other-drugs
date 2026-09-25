#!/usr/bin/env python3
"""
check_cast.py — every value in the generated cast DSL, checked against the Foundry export.

    python3 campaign/source/check_cast.py [--date YYYY-MM-DD] [--dsl FILE] [--only NAME]

Independent of convert_cast.py on purpose: it PARSES the generated file with the VTT's own
parser and re-derives what each field should say straight from the export's JSON, field by
field. It shares no code with the converter, so a converter bug cannot hide behind it.

Checks, per actor: the nine Attributes; every rated Skill with its rating and its specialty AND
that no unrated skill is printed; every Discipline rating; Humanity, Generation, Blood Potency,
Health and Willpower; that every `power` item the actor carries is referenced by name; the
world's own prose fields, each against the export's own HTML; and the two PUBLISHED names the
converter rewrites — Clan and Predator Type — which are checked twice over: that the written
name still points at the world's (aliases, a trailing qualifier and typography aside), that
the world's parenthetical went to the Note field instead of into the name, and that the name
written is one a book actually prints. Exits non-zero on the first mismatch it reports.
"""
import argparse
import datetime
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "build"))
from parse_dsl import parse_files  # noqa: E402
from cast_aliases import ALIASES  # noqa: E402

DATA_BLOB = re.compile(r"var d=(\{.*?\});var T=window\.VTM5E", re.S)

A_ORDER = ["Strength", "Dexterity", "Stamina", "Charisma", "Manipulation", "Composure",
           "Intelligence", "Wits", "Resolve"]
A_KEY = {n: n.lower() for n in A_ORDER}
S_KEY = {"Athletics": "athletics", "Brawl": "brawl", "Craft": "craft", "Drive": "drive",
         "Firearms": "firearms", "Larceny": "larceny", "Melee": "melee", "Stealth": "stealth",
         "Survival": "survival", "Animal Ken": "animalken", "Etiquette": "etiquette",
         "Insight": "insight", "Intimidation": "intimidation", "Leadership": "leadership",
         "Performance": "performance", "Persuasion": "persuasion", "Streetwise": "streetwise",
         "Subterfuge": "subterfuge", "Academics": "academics", "Awareness": "awareness",
         "Finance": "finance", "Investigation": "investigation", "Medicine": "medicine",
         "Occult": "occult", "Politics": "politics", "Science": "science", "Technology": "technology"}
D_KEY = {"Animalism": "animalism", "Auspex": "auspex", "Blood Sorcery": "sorcery",
         "Celerity": "celerity", "Dominate": "dominate", "Fortitude": "fortitude",
         "Obfuscate": "obfuscate", "Oblivion": "oblivion", "Potence": "potence",
         "Presence": "presence", "Protean": "protean", "Thin-Blood Alchemy": "alchemy"}


def walk(nodes, out):
    for n in nodes or []:
        if n.get("n") == "entity":
            out[n["hash"]] = n
            walk(n.get("body"), out)
        elif n.get("n") == "kw":
            walk(n.get("body"), out)
    return out


def props(ent):
    out = {}
    for p in ent.get("body") or []:
        if p.get("n") == "prop" and "value" in p:
            out[p["name"]] = p["value"]
    return out


def refnames(ent):
    out = []
    for b in ent.get("body") or []:
        if b.get("n") == "kw" and b.get("kw") == "REFERENCES":
            for item in b.get("body") or []:
                for arg in item.get("args", []):
                    if arg.get("k") in ("ref", "caret"):
                        out.append(arg["v"])
    return out


def split_entries(s):
    """Split on , and ; but never inside parentheses: a specialty may contain both."""
    out, buf, depth = [], [], 0
    for ch in s or "":
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch in ",;" and depth == 0:
            out.append("".join(buf)); buf = []
        else:
            buf.append(ch)
    out.append("".join(buf))
    return [x.strip() for x in out if x.strip()]


def parse_pairs(s, names):
    """'Athletics 1, Craft (Oil painting) 4; Etiquette 5' -> {name: (rating, specialty)}.
    A specialty may itself contain parentheses and commas, so the name is what stands before
    the FIRST '(' and the specialty everything to the LAST ')'."""
    got = {}
    for chunk in split_entries(s):
        m = re.match(r"^(.*?)\s*(\d+)$", chunk)
        if not m:
            return None, "unparsable entry %r" % chunk
        head, n = m.group(1).strip(), int(m.group(2))
        spec = None
        if head.endswith(")") and "(" in head:
            i = head.index("(")
            spec, head = head[i + 1:-1].strip(), head[:i].strip()
        if names and head not in names:
            return None, "unknown name %r" % head
        got[head] = (n, spec)
    return got, None


def plain(raw):
    if not raw:
        return ""
    s = re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", raw)
    s = re.sub(r"(?i)</\s*(p|div|h[1-6]|li)\s*>", "\n\n", s)
    s = re.sub(r"(?i)<\s*li[^>]*>", "• ", s)
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+", " ", s)).strip()


def norm(s):
    """Names are compared with typography normalised: the books set apostrophes and dashes
    typographically, Foundry types them straight."""
    s = ALIASES.get(s.strip(), (s,))[0]
    return (s.replace("\u2019", "'").replace("\u2018", "'").replace("\u2013", "-")
             .replace("\u2014", "-").strip().lower())


def bare_name(s):
    """A published heading without a trailing qualifier: The Black Hand prints its Predator
    Types "Absolver (Sabbat Only)", the world records "Absolver"."""
    m = re.match(r"^(.*?)\s*\([^()]*\)$", (s or "").strip())
    return (m.group(1).strip() if m and m.group(1).strip() else (s or "").strip())


def published_names():
    """Every name the books print, read straight out of data/ — this checker's own reading,
    so a name the converter invented has nowhere to hide."""
    out, data = set(), os.path.join(ROOT, "data")
    for fn in sorted(os.listdir(data)):
        m = DATA_BLOB.search(open(os.path.join(data, fn), encoding="utf-8").read()) if fn.endswith(".js") else None
        if m:
            out.update(e["name"] for e in json.loads(m.group(1))["entities"].values())
    return {norm(n) for n in out}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    ap.add_argument("--dsl", default=os.path.join(ROOT, "campaign/dsl/vtm5e-0.5-blood-cast.ttrpg"))
    ap.add_argument("--only")
    a = ap.parse_args()

    src = os.path.join(HERE, "foundry-export", a.date)
    m = json.load(open(os.path.join(src, "manifest.json"), encoding="utf-8"))
    ents = walk(parse_files([a.dsl])[0]["body"], {})
    by_name = {}
    for e in ents.values():
        by_name.setdefault(e["name"], []).append(e)

    rows = m["listed"]["Actor"]
    if a.only:
        rows = [r for r in rows if a.only.lower() in r["name"].lower()]
    fails, checked, people = [], 0, 0
    printed = published_names()

    for r in rows:
        d = json.load(open(os.path.join(src, "Actor", r["id"] + ".json"), encoding="utf-8"))
        hits = by_name.get(d["name"])
        if not hits:
            fails.append("%s: not in the DSL" % d["name"]); continue
        if len(hits) > 1:
            fails.append("%s: %d DEFs share the name" % (d["name"], len(hits))); continue
        ent, sysd, p = hits[0], d.get("system") or {}, props(hits[0])
        people += 1
        bad = lambda msg: fails.append("%s: %s" % (d["name"], msg))  # noqa: E731

        if ent["hash"] != "#bod" + d["_id"]:
            bad("id is %s, expected #bod%s" % (ent["hash"], d["_id"]))

        got, err = parse_pairs(p.get("Attributes", ""), set(A_ORDER))
        if err or got is None:
            bad("Attributes %s" % err)
        else:
            if list(got) != A_ORDER:
                bad("Attributes order/'completeness': %s" % list(got))
            for n in A_ORDER:
                want = int((sysd.get("attributes", {}).get(A_KEY[n]) or {}).get("value") or 0)
                checked += 1
                if got.get(n, (None,))[0] != want:
                    bad("%s is %s, export says %d" % (n, got.get(n, (None,))[0], want))

        got, err = parse_pairs(p.get("Skills", ""), set(S_KEY))
        if err or got is None:
            bad("Skills %s" % err)
        else:
            for label, key in S_KEY.items():
                node = sysd.get("skills", {}).get(key) or {}
                want = int(node.get("value") or 0)
                spec = next((b.get("source").strip() for b in (node.get("bonuses") or [])
                             if (b.get("source") or "").strip()), None)
                checked += 1
                if want <= 0:
                    if label in got:
                        bad("%s is printed at %s but the export rates it 0" % (label, got[label][0]))
                elif label not in got:
                    bad("%s missing; the export rates it %d" % (label, want))
                else:
                    if got[label][0] != want:
                        bad("%s is %d, export says %d" % (label, got[label][0], want))
                    if (got[label][1] or None) != spec:
                        bad("%s specialty is %r, export says %r" % (label, got[label][1], spec))

        if d.get("type") == "vampire":
            got, err = parse_pairs(p.get("Disciplines", ""), set(D_KEY))
            if err or got is None:
                bad("Disciplines %s" % err)
            else:
                for label, key in D_KEY.items():
                    want = int((sysd.get("disciplines", {}).get(key) or {}).get("value") or 0)
                    checked += 1
                    if want <= 0 and label in got:
                        bad("%s printed but the export rates it 0" % label)
                    elif want > 0 and got.get(label, (None,))[0] != want:
                        bad("%s is %s, export says %d" % (label, got.get(label, (None,))[0], want))
            for label, want in (("Humanity", str(int((sysd.get("humanity") or {}).get("value") or 0))),
                                ("Blood Potency", str((sysd.get("blood") or {}).get("potency") or "")),
                                ("Generation", plain((sysd.get("headers") or {}).get("generation")))):
                checked += 1
                if want and p.get(label, "") != want:
                    bad("%s is %r, export says %r" % (label, p.get(label), want))

        want_sec = "Health %d, Willpower %d" % (int((sysd.get("health") or {}).get("max") or 0),
                                                int((sysd.get("willpower") or {}).get("max") or 0))
        checked += 1
        if p.get("Secondary Attributes", "") != want_sec:
            bad("Secondary Attributes %r, export says %r" % (p.get("Secondary Attributes"), want_sec))

        want_powers = sorted({norm(i["name"]) for i in (d.get("items") or [])
                              if i.get("type") == "power" and i.get("name")})
        got_powers = sorted({norm(x) for x in refnames(ent)})
        checked += 1
        if want_powers != got_powers:
            miss = [x for x in want_powers if x not in got_powers]
            extra = [x for x in got_powers if x not in want_powers]
            bad("powers differ — missing %s, extra %s" % (miss or "none", extra or "none"))

        h = sysd.get("headers") or {}
        bio = sysd.get("bio") or {}
        for label, raw in (("Appearance", sysd.get("appearance")),
                           ("Concept", h.get("concept")),
                           ("Touchstones", h.get("touchstones")),
                           ("Chronicle", h.get("chronicle")),
                           ("Sire", h.get("sire")),
                           ("Embraced", (bio.get("dateof") or {}).get("death")),
                           ("Ambition", h.get("ambition")),
                           ("Desire", h.get("desire")),
                           ("Convictions", h.get("tenets")),
                           ("History", bio.get("history"))):
            want = plain(raw)
            checked += 1
            if want and p.get(label, "") != want:
                bad("%s differs from the export" % label)

        # the two published names the converter rewrites, and the world's own annotation it
        # splits off them (the corpus is canon — owner, 2026-09-24)
        for label, itype in (("Clan", "clan"), ("Predator Type", "predatorType")):
            raw = next((i["name"] for i in (d.get("items") or []) if i.get("type") == itype), "")
            if not raw:
                continue
            world, note_want = raw.strip(), ""
            mm = re.match(r"^([^(]+?)\s*\((.*)\)\s*$", world)
            if mm:
                world, note_want = mm.group(1).strip(), mm.group(2).strip()
            got, note_got = p.get(label, ""), p.get(label + " Note", "")
            checked += 2
            if not got:
                bad("%s missing; the world carries %r" % (label, raw))
                continue
            if norm(bare_name(got)) != norm(world):
                bad("%s is %r, which is not the world's %r" % (label, got, world))
            if note_got != note_want:
                bad("%s Note is %r, the world's parenthetical is %r" % (label, note_got, note_want))
            checked += 1
            if norm(got) not in printed and norm(got) != norm(world):
                bad("%s %r is in no book, and is not the world's own spelling either" % (label, got))

    for f in fails:
        print("  MISMATCH %s" % f)
    print("check_cast: %d actors, %d field checks — %s"
          % (people, checked, "%d mismatches" % len(fails) if fails else "all match"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
