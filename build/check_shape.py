#!/usr/bin/env python3
"""
check_shape.py — the gate verify_data.py cannot be.

verify_data proves every string round-trips. It does NOT prove a string landed on the right
field: a value that parses loose in a body is present in the data and attached to nothing,
and every string still round-trips. So this asserts the SHAPES the site reads, against counts
taken from the corpus itself — grep, or a line scanner that shares no code with the parser —
never a number typed here. Deliberately specific: if a parser or build change displaces a
field, this says which.

    python3 build/check_shape.py [<path to titterpig-dsl-vtm5e/0.5>]
"""
import glob
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_data import DEFAULT_CORPUS, BOOKS, FILE_PREFIX, SHAPES, LEVEL_HEADING  # noqa: E402
from verify_data import BLOB, INDEX_BLOB, RECORDS_BLOB, HERE  # noqa: E402

FAILS = []
COUNT = [0]


def check(label, got, want):
    ok = got == want
    COUNT[0] += 1
    print("  %-66s %s%s" % (label, got, "" if ok else "   EXPECTED %s  ← FAIL" % (want,)))
    if not ok:
        FAILS.append(label)


def load():
    ents, books, index, records = {}, {}, None, None
    for fn in sorted(os.listdir(os.path.join(HERE, "data"))):
        if not fn.endswith(".js"):
            continue
        src = open(os.path.join(HERE, "data", fn), encoding="utf-8").read()
        m = BLOB.search(src)
        if m:
            d = json.loads(m.group(1))
            ents.update(d["entities"])
            books[d["book"]["id"]] = d["book"]
        elif INDEX_BLOB.search(src):
            index = json.loads(INDEX_BLOB.search(src).group(1))
        else:
            records = json.loads(RECORDS_BLOB.search(src).group(1))
    return ents, books, index, records


def grep_count(corpus, pattern, files="*.ttrpg"):
    """How many lines of the corpus match — the source's own count."""
    paths = sorted(glob.glob(os.path.join(corpus, files)))
    out = subprocess.run(["grep", "-c", "-E", pattern] + paths, capture_output=True, text=True)
    return sum(int(line.rsplit(":", 1)[-1] or 0) for line in out.stdout.strip().split("\n") if line)


# ── an independent reader: DEF blocks and the property names printed in them ──
DEF_LINE = re.compile(r'^\s*(#[A-Za-z0-9]+)\s+\^"((?:[^"\\]|\\.)*)"\s+DEF\s*\{\s*$')
PROP_LINE = re.compile(r'^\s*\^"((?:[^"\\]|\\.)*)"\s+(STRING|INTEGER|LIST|BOOLEAN|ENUM)\b')
STR_RE = re.compile(r'"(?:[^"\\]|\\.)*"')


def scan(path):
    """[(hash, name, {prop names}, file)] in file order, by brace depth over quote-stripped
    lines. Only props printed at the entity's own depth count (a TABLE's or a GUIDANCE's
    rows are one level deeper)."""
    out, stack, depth = [], [], 0
    for line in open(path, encoding="utf-8"):
        bare = STR_RE.sub('""', line.split(" #", 1)[0] if not DEF_LINE.match(line) else line)
        m = DEF_LINE.match(line)
        if m:
            rec = (m.group(1), m.group(2).replace('\\"', '"'), set(), os.path.basename(path))
            out.append(rec)
            depth += 1
            stack.append((depth, rec))
            continue
        p = PROP_LINE.match(line)
        if p and stack and stack[-1][0] == depth:
            stack[-1][1][2].add(p.group(1))
        depth += bare.count("{") - bare.count("}")
        while stack and stack[-1][0] > depth:
            stack.pop()
    return out


def main():
    corpus = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CORPUS
    ents, books, index, records = load()
    print("check_shape: the fields the site reads, against the corpus's own counts")

    # ── the books and their chapters ──
    files = sorted(os.path.basename(p) for p in glob.glob(os.path.join(corpus, "*.ttrpg")) + glob.glob(os.path.join(corpus, "*.lore")))
    prefixes = {b["prefix"] for b in BOOKS}
    check("books in the index = the BOOKS map", len(index["books"]), len(BOOKS))
    check("chapters across the books = corpus files", sum(len(b["chapters"]) for b in books.values()), len(files))
    check("lore chapters = .lore files", sum(1 for b in books.values() for c in b["chapters"] if c["kind"] == "lore"), len(glob.glob(os.path.join(corpus, "*.lore"))))
    lore_ok = all(c["text"] == open(os.path.join(corpus, c["file"]), encoding="utf-8").read()
                  for b in books.values() for c in b["chapters"] if c["kind"] == "lore")
    check("every lore chapter's text is its file, byte for byte", lore_ok, True)
    unpaged = [c["file"] for b in books.values() for c in b["chapters"] if c["page"] is None and b["id"] != "base"]
    check("chapters with no printed page (outside the BASE)", unpaged, [])
    order_ok = all([c["page"] for c in b["chapters"]] == sorted(c["page"] for c in b["chapters"])
                   for b in books.values() if b["id"] != "base")
    check("every book's chapters in printed-page order", order_ok, True)
    check("every chapter file carries its book's prefix", all(
        any(c["file"].startswith(FILE_PREFIX + b["prefix"]) for bb in BOOKS if bb["id"] == bid for b in [bb])
        for bid, b in books.items() for c in b["chapters"]), True)

    # ── entities and what they carry ──
    check("entities = hashed DEF lines in the corpus", len(ents), grep_count(corpus, r'^\s*#[A-Za-z0-9]+ \^".*" DEF \{$'))
    check("entities with a DESCRIPTION = DESCRIPTION lines", sum(1 for e in ents.values() if e["desc"] is not None),
          grep_count(corpus, r'^\s*DESCRIPTION "'))
    corr = index["corrections"]
    check("GUIDANCE entries (entities + corrections) = ENTRY lines",
          sum(len(e["guidance"]) for e in ents.values()) + sum(len(c["guidance"]) for c in corr),
          grep_count(corpus, r'^\s*ENTRY \^"'))
    check("GUIDANCE entries with TEXT = TEXT lines",
          sum(1 for e in ents.values() for g in e["guidance"] if g["text"] is not None) + sum(1 for c in corr for g in c["guidance"] if g["text"] is not None),
          grep_count(corpus, r'^\s*TEXT "'))
    check("printed tables = TABLE blocks", sum(1 for e in ents.values() if e["table"]), grep_count(corpus, r'^\s*TABLE \{'))
    check("table rows = ROW lines", sum(len(e["table"]["rows"]) for e in ents.values() if e["table"]), grep_count(corpus, r'^\s*ROW \['))
    check("table headers = COLUMNS lines", sum(1 for e in ents.values() if e["table"] and e["table"]["columns"]), grep_count(corpus, r'^\s*COLUMNS \['))
    check("tables typed ^\"Table\" (the BASE's one type)", sum(1 for e in ents.values() if e["type"] == "Table"), grep_count(corpus, r'^\s*EXTENDS #vtm5Table000000000001 \^"Table"'))
    check("corrections = MODIFY / OVERRIDE lines", len(corr), grep_count(corpus, r'^\s*(MODIFY|OVERRIDE) #'))
    check("every correction names a target that is in the data", all(c["target"]["hash"] in ents for c in corr), True)
    check("the replacement Lingering Kiss carries its 4 printed fields", [p["name"] for c in corr if c["target"]["name"] == "Lingering Kiss" for p in c["props"]],
          ["Cost", "System", "Duration", "Restrictions"])

    # ── records by shape, against the independent scanner ──
    scanned = []
    for path in sorted(glob.glob(os.path.join(corpus, "*.ttrpg"))):
        scanned.extend(scan(path))
    check("the scanner sees every entity", len(scanned), len(ents))
    for kind, test in SHAPES:
        want = [h for h, _n, ps, _f in scanned if next((k for k, t in SHAPES if t(ps)), None) == kind]
        got = [r["id"] for r in records if r["kind"] == kind]
        check("%s records = scanned DEFs of that shape (count)" % kind, len(got), len(want))
        check("%s records = scanned DEFs of that shape (same ids)" % kind, sorted(got) == sorted(want), True)
    by_id = {r["id"]: r for r in records}
    check("every record's name is its entity's", all(ents[r["id"]]["name"] == r["name"] for r in records), True)

    # the core's Discipline chapter, read by the scanner: each power's Discipline and level
    core = scan(os.path.join(corpus, FILE_PREFIX + "core-disciplines.ttrpg"))
    level, disc, want = None, None, {}
    names = set(index["disciplines"])
    for h, n, ps, _f in core:
        if LEVEL_HEADING.match(n):
            level = n
        if n in names:
            disc, level = n, None
        if h in by_id and by_id[h]["kind"] in ("power", "ritual"):
            want[h] = (disc, level)
    got = {h: (by_id[h].get("discipline"), by_id[h].get("level")) for h in want}
    check("core Discipline powers and rituals placed as the scanner reads them", got == want, True)
    check("core powers with no Discipline or no level", sorted(by_id[h]["name"] for h, v in got.items() if None in v and by_id[h]["kind"] == "power"), [])
    check("Discipline names read from the corpus (%d)" % len(index["disciplines"]), sorted(index["disciplines"]),
          sorted({n for i, (h, n, ps, f) in enumerate(core[:-1]) if core[i + 1][1] == "Characteristics" and n != "Characteristics"} | {"Oblivion"}))
    oblivion = sum(1 for r in records if r.get("discipline") == "Oblivion" and r["kind"] == "power")
    check("Oblivion powers found (Chicago by Night, Cults, Players Guide…) > 0", oblivion > 0, True)

    # ── the book's die glyphs, carried as the conversion wrote them ──
    tokens = re.compile(r"\[(Regular|Hunger) Die: [A-Za-z ]+\]")
    seen = set()
    for e in ents.values():
        for s in [e["desc"] or ""] + [g["text"] or "" for g in e["guidance"]]:
            seen.update(m.group(0) for m in tokens.finditer(s))
    raw = subprocess.run(["grep", "-ohE", r"\[(Regular|Hunger) Die: [A-Za-z ]+\]"] + sorted(glob.glob(os.path.join(corpus, "*.ttrpg"))), capture_output=True, text=True).stdout.split("\n")
    check("die-glyph tokens in the data = in the corpus", sorted(seen), sorted({x for x in raw if x}))

    print("check_shape: %s (%d assertions)" % ("OK" if not FAILS else "FAILED: " + ", ".join(FAILS), COUNT[0]))
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(main())
