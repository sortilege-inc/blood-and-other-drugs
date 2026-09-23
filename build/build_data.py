#!/usr/bin/env python3
"""
build_data.py — the Vampire: The Masquerade 5e corpus (titterpig-dsl-vtm5e/0.5) → data/*.js.

Everything the site shows comes from here; nothing is hand-typed. The shape is GENERIC and
hash-keyed — the engine reads it without knowing the game, and system/vtm5e/ interprets it:

    window.VTM5E.index           { system, corpus, counts, books: [ … ] }       data/index.js
    window.VTM5E.records         [ {id, name, book, kind, …} ]                  data/records.js
    window.VTM5E.books[<id>]     { id, label, chapters: [ … ], entities: [root ids] }
    window.VTM5E.entities[<h>]   { id, name, key, book, file, type, parent, slot, children,
                                   desc, props, entries, table, choices, guidance, refs }

What this corpus needs that Troika's did not:

  * **Eighteen books, 11 MB.** One data file per book (`data/<book>.js`), loaded on demand by
    engine/data.js; a page costs only data/index.js and data/records.js until it opens a book.
    A corpus file belongs to a book by its file-name PREFIX (`vtm5e-0.5-<book>-<chapter>`);
    BOOKS below is the prefix map, the only hand-written list in the build, and every corpus
    file must be claimed by exactly one book or this exits non-zero.

  * **Chapters in printed order.** Each chapter file opens with `# source: … (pages N-M)`;
    a book's chapters are sorted by that first page (a `.lore` file by its first "printed N").
    The comment is read as it stands — nothing is inferred when it is absent (the BASE).

  * **`.lore` is Markdown, not DSL** (the core's prologue and its handouts, transcribed from
    page images). A lore chapter carries its text verbatim as one string; verify_data.py gates
    it line by line.

  * **Records by shape.** The BASE declares one type (`^"Table"`); a Discipline power, a
    ritual and a Storyteller character are known by the fields the book prints on them. The
    SHAPES below name those fields — by KEY, never by value — and data/records.js lists every
    entity that has one, with its place: the nearest `Level N` heading before it in its file
    and the nearest Discipline heading before it. The Discipline names are read from the
    corpus by the book's own patterns (disciplines_of), not typed here. check_shape.py asserts
    every count against grep over the corpus.

Every string is carried byte-for-byte from the DSL (only DSL escapes resolved); this file
decides shape alone. verify_data.py then proves the round trip in both directions.

    python3 build/build_data.py [<path to titterpig-dsl-vtm5e/0.5>]
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_dsl import parse_files  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CORPUS = os.path.expanduser("~/Sortilege/Titterpig/DSL/titterpig-dsl-vtm5e/0.5")
FILE_PREFIX = "vtm5e-0.5-"

# ───────────────────────── the prefix → book map ─────────────────────────
#
# `label` is this build's own short name for the book (declared as ours to the gate); each
# chapter's own title is its file's NAME, verbatim. Order: the core, the Players Guide, then
# the supplements in the order the corpus's sources.json first lists them.
BOOKS = [
    {"id": "base", "label": "Types and vocabulary", "kind": "base", "prefix": "base"},
    {"id": "core", "label": "Core Rulebook", "kind": "book", "prefix": "core"},
    {"id": "players-guide", "label": "Players Guide", "kind": "book", "prefix": "players-guide"},
    {"id": "anarch", "label": "Anarch", "kind": "book", "prefix": "anarch"},
    {"id": "camarilla", "label": "Camarilla", "kind": "book", "prefix": "camarilla"},
    {"id": "chicago-by-night", "label": "Chicago by Night", "kind": "book", "prefix": "chicago-by-night"},
    {"id": "second-inquisition", "label": "Second Inquisition", "kind": "book", "prefix": "second-inquisition"},
    {"id": "cults-of-the-blood-gods", "label": "Cults of the Blood Gods", "kind": "book", "prefix": "cults-of-the-blood-gods"},
    {"id": "let-the-streets-run-red", "label": "Let the Streets Run Red", "kind": "book", "prefix": "let-the-streets-run-red"},
    {"id": "tattered-facade", "label": "The Tattered Facade", "kind": "book", "prefix": "tattered-facade"},
    {"id": "blood-stained-love", "label": "Blood-Stained Love", "kind": "book", "prefix": "blood-stained-love"},
    {"id": "sabbat", "label": "Sabbat", "kind": "book", "prefix": "sabbat"},
    {"id": "gehenna-war", "label": "The Gehenna War", "kind": "book", "prefix": "gehenna-war"},
    {"id": "in-memoriam", "label": "In Memoriam", "kind": "book", "prefix": "in-memoriam"},
    {"id": "blood-sigils", "label": "Blood Sigils", "kind": "book", "prefix": "blood-sigils"},
    {"id": "children-of-the-blood", "label": "Children of the Blood", "kind": "book", "prefix": "children-of-the-blood"},
    {"id": "bleed", "label": "Bleed and How to Deal With It", "kind": "book", "prefix": "bleed"},
    {"id": "wod-storyteller", "label": "Storyteller System: Expanded Mechanics", "kind": "book", "prefix": "wod-storyteller"},
    {"id": "errata", "label": "Errata and Rules Update", "kind": "errata", "prefix": "errata"},
]
KINDS = {b["kind"] for b in BOOKS} | {"ttrpg", "lore"}
DSL_EXTS = (".ttrpg",)
LORE_EXTS = (".lore",)

# ───────────────────────── records by shape ─────────────────────────
# Field names the book prints on a record — keys only. A record is the FIRST shape it fits.
SHAPES = [
    ("power", lambda ps: "Cost" in ps and ("System" in ps or "Duration" in ps)),
    ("ritual", lambda ps: "Ingredients" in ps and ("Process" in ps or "System" in ps)),
    ("character", lambda ps: "Standard Dice Pools" in ps or "Secondary Attributes" in ps
     or ("Attributes" in ps and "Skills" in ps)),
]
SHAPE_NAMES = [s[0] for s in SHAPES]
LEVEL_HEADING = re.compile(r"^Level \d+$")
DISCIPLINE_MARK = "Characteristics"        # the heading the book prints after a Discipline's name
DISCIPLINES_HEADING = "Disciplines"        # a clan's list of its three
CORE_DISCIPLINES = FILE_PREFIX + "core-disciplines.ttrpg"
# scalar fields a record list shows without loading its book
RECORD_FIELDS = {
    "power": ["Cost", "Dice Pools", "Amalgam", "Prerequisite"],
    "ritual": ["Ingredients"],
    "character": ["Clan", "Generation", "Blood Potency", "Humanity", "Standard Dice Pools"],
}

PAGE_RE = re.compile(r"#\s*source:[^\n]*?\(pages?\s+(\d+)")
LORE_PAGE_RE = re.compile(r"printed\s+(\d+)")


# ───────────────────────── AST accessors ─────────────────────────

def kws(body, name):
    return [x for x in (body or []) if x.get("n") == "kw" and x["kw"] == name]


def kw1(body, name):
    got = kws(body, name)
    return got[0] if got else None


def kwstr(body, name):
    n = kw1(body, name)
    if not n:
        return None
    return next((a["v"] for a in n["args"] if a["k"] == "str"), None)


def kwlist(body, name):
    n = kw1(body, name)
    return (arg(n, "list") or []) if n else []


def arg(node, kind):
    return next((a["v"] for a in (node or {}).get("args", []) if a["k"] == kind), None)


def elem_ref(e):
    if e.get("k") == "ref":
        return {"hash": e["hash"], "name": e["v"]}
    if e.get("k") == "hash":
        return {"hash": e["v"], "name": None}
    if e.get("k") == "caret":
        return {"hash": None, "name": e["v"]}
    return None


def prop_nodes(body):
    """A DEF's properties: the PROPERTIES block's rows, plus any row written directly in
    the body (this corpus writes nearly all of them there)."""
    out = [p for p in (body or []) if p.get("n") == "prop" and p.get("type") != "CHOICE"]
    for b in kws(body, "PROPERTIES"):
        out.extend(p for p in (b.get("body") or []) if p.get("n") == "prop")
    return out


def elem_value(e):
    if e.get("k") == "def":
        return {"vk": "def", "fields": [prop_value(p) for p in prop_nodes(e.get("body"))]}
    if e.get("k") in ("ref", "hash", "caret"):
        return dict(vk="ref", **elem_ref(e))
    return {"vk": "scalar", "value": e["v"]}


def prop_value(p):
    v = {"name": p["name"]}
    t = p.get("type")
    if t == "DEF":
        v["vk"] = "def"
        ext = kw1(p.get("body"), "EXTENDS")
        if ext:
            v["type"] = arg(ext, "caret")
            v["typeHash"] = arg(ext, "hash")
        v["fields"] = [prop_value(x) for x in prop_nodes(p.get("body"))]
        return v
    if t == "LIST":
        v["vk"] = "list"
        if p.get("of"):
            v["of"] = p["of"]
        if p.get("of_hash"):
            v["ofHash"] = p["of_hash"]
        v["items"] = [elem_value(e) for e in p.get("items", [])]
        return v
    if t == "ENUM":
        v["vk"] = "enum"
        if "options" in p:
            v["options"] = p["options"]
        if "value" in p:
            v["value"] = p["value"]
        return v
    if t == "REF":
        v["vk"] = "ref"
        v["ref"] = {"hash": p.get("hash"), "name": p.get("ref")}
        return v
    v["vk"] = "scalar"
    if t and t != "VALUE":
        v["type"] = t
    if "value" in p:
        v["value"] = p["value"]
    for m in ("min", "max", "required", "fixed"):
        if m in p:
            v[m] = p[m]
    return v


# ───────────────────────── entity blocks ─────────────────────────

def refs_of(body):
    """§5c REFERENCES: `"label" -> #hash ^"Name"` lines, stand-off."""
    out = []
    for rb in kws(body, "REFERENCES"):
        for item in (rb.get("body") or []):
            if item.get("n") != "str":
                continue
            for a in item.get("args", []):
                if a["k"] == "ref":
                    out.append({"label": item["v"], "hash": a["hash"], "name": a["v"]})
    return out


def guidance_of(body):
    """§22 GUIDANCE: a sidebar, beside what it CONCERNS."""
    out = []
    for gb in kws(body, "GUIDANCE"):
        for e in kws(gb.get("body"), "ENTRY"):
            out.append({
                "name": arg(e, "caret"), "id": arg(e, "hash"),
                "concerns": [r for r in (elem_ref(x) for x in kwlist(e.get("body"), "CONCERNS")) if r],
                "topics": [x["v"] for x in kwlist(e.get("body"), "TOPICS") if x.get("k") == "str"],
                "text": kwstr(e.get("body"), "TEXT"),
            })
    return out


def choices_of(body):
    out = []
    for cb in kws(body, "CHOICES"):
        for p in (cb.get("body") or []):
            if p.get("n") == "prop" and p.get("type") == "CHOICE":
                out.append({"name": p["name"], "pick": p.get("pick"),
                            "items": [r for r in (elem_ref(e) for e in p.get("items", [])) if r]})
            elif p.get("n") == "str":
                out.append({"rubric": p["v"]})
    return out


def defs_block(body, keyword):
    out = []
    for b in kws(body, keyword):
        for p in (b.get("body") or []):
            if p.get("n") == "prop" and p.get("type") == "DEF":
                out.append(prop_value(p))
            elif p.get("n") == "entity":
                out.append({"vk": "entity", "id": p["hash"], "name": p["name"]})
    return out


def table_of(body):
    """A printed table, cell for cell: COLUMNS then ROWs."""
    tb = kw1(body, "TABLE")
    if not tb:
        return None
    columns = [x["v"] for x in kwlist(tb.get("body"), "COLUMNS")]
    rows = [[x["v"] for x in (arg(r, "list") or [])] for r in kws(tb.get("body"), "ROW")]
    return {"columns": columns, "rows": rows}


def entity_record(e, doc, book, parent_id=None, slot=None):
    body = e["body"]
    props = [prop_value(p) for p in prop_nodes(body)]
    ext = kw1(body, "EXTENDS")
    return {
        "id": e["hash"],
        "name": e["name"],
        "key": e["name"],
        "form": e.get("kind") or "DEF",
        "book": book,
        "file": doc["file"],
        "type": arg(ext, "caret") if ext else None,
        "typeHash": arg(ext, "hash") if ext else None,
        "parent": parent_id,
        "slot": slot,
        "children": [],
        "desc": kwstr(body, "DESCRIPTION"),
        "props": props,
        "entries": defs_block(body, "ENTRIES"),
        "table": table_of(body),
        "choices": choices_of(body),
        "guidance": guidance_of(body),
        "refs": refs_of(body),
    }


def collect_entities(doc, book, out, order, body=None, parent=None, slot=None):
    """Every hashed entity anywhere in the tree, keyed by hash, with `parent` the nearest
    enclosing entity and `slot` the keyword block it sat in. `order` receives every id in
    document order (what records by shape read their place from)."""
    ids = []
    for e in (body if body is not None else doc["body"]):
        if e.get("n") == "entity":
            rec = entity_record(e, doc, book, parent["id"] if parent else None, slot)
            if rec["id"] in out:
                raise SystemExit("duplicate entity hash %s (%s and %s)" % (rec["id"], out[rec["id"]]["file"], doc["file"]))
            out[rec["id"]] = rec
            order.append(rec["id"])
            ids.append(rec["id"])
            if parent:
                parent["children"].append(rec["id"])
            collect_entities(doc, book, out, order, e["body"], rec, None)
        elif e.get("n") == "kw" and e.get("body"):
            ids.extend(collect_entities(doc, book, out, order, e["body"], parent, e["kw"]))
    return ids


def corrections_of(doc, book):
    """A corrections layer (spec §13): each top-level MODIFY / OVERRIDE names the entity it
    patches (in another book) and carries its replacement properties and its sidebars. An
    entity nested inside one (the errata's replacement table) is collected as an entity of
    this book like any other; its id is listed here so the reader can show it with the fix."""
    out = []
    for n in doc["body"]:
        if n.get("n") != "kw" or n["kw"] not in ("MODIFY", "OVERRIDE"):
            continue
        body = n.get("body") or []
        out.append({
            "op": n["kw"], "file": doc["file"], "book": book,
            "target": {"hash": arg(n, "hash"), "name": arg(n, "caret")},
            "props": [prop_value(p) for p in prop_nodes(body)],
            "guidance": guidance_of(body),
            "nested": [e["hash"] for e in body if e.get("n") == "entity"],
        })
    return out


# ───────────────────────── files ─────────────────────────

BANNER = ("/* Generated by build/build_data.py from titterpig-dsl-vtm5e/0.5 — do not edit by hand.\n"
          "   Every string is verbatim from the DSL corpus; regenerate rather than patch. */\n")

REGISTER = """(function(){var d=%s;var T=window.VTM5E=window.VTM5E||{books:{},entities:{},loaded:{}};
T.loaded[d.src]=true;T.books[d.book.id]=d.book;
for(var h in d.entities){T.entities[h]=d.entities[h];}})();
"""


def corpus_files(corpus):
    out = set()
    for root, _dirs, files in os.walk(corpus):
        for fn in files:
            if fn.endswith(DSL_EXTS + LORE_EXTS):
                out.add(os.path.relpath(os.path.join(root, fn), corpus))
    return out


def book_of(fn):
    """The book a file belongs to: the longest prefix it carries."""
    stem = fn[len(FILE_PREFIX):] if fn.startswith(FILE_PREFIX) else None
    if stem is None:
        return None
    hits = [b for b in BOOKS if stem == b["prefix"] + os.path.splitext(stem)[1]
            or stem.startswith(b["prefix"] + "-")]
    hits.sort(key=lambda b: -len(b["prefix"]))
    return hits[0]["id"] if hits else None


def claimed_files(corpus):
    """file → book id; raises if any corpus file is claimed by no book."""
    on_disk = corpus_files(corpus)
    for b in BOOKS:
        b["_files"] = []
    unclaimed = []
    for fn in sorted(on_disk):
        bid = book_of(fn)
        if not bid:
            unclaimed.append(fn)
            continue
        next(b for b in BOOKS if b["id"] == bid)["_files"].append(fn)
    empty = [b["id"] for b in BOOKS if not b["_files"]]
    if unclaimed or empty:
        raise SystemExit("build_data: the prefix → book map is out of step with the corpus.\n"
                         "  in the corpus, claimed by no book: %s\n"
                         "  books with no file: %s" % (unclaimed or "none", empty or "none"))
    return on_disk


def first_page(path, lore):
    head = open(path, encoding="utf-8").read(4000)
    m = (LORE_PAGE_RE if lore else PAGE_RE).search(head)
    return int(m.group(1)) if m else None


def lore_chapter(path, fn):
    text = open(path, encoding="utf-8").read()
    title = next((ln for ln in text.split("\n") if ln.startswith("# ")), fn)   # the H1 line as written
    return {"file": fn, "kind": "lore", "name": title, "page": first_page(path, True), "text": text}


# ───────────────────────── records by shape ─────────────────────────

def prop_names(e):
    return {p["name"] for p in e["props"]}


def disciplines_of(entities, orders):
    """The Discipline names, read from the corpus by two of the book's own patterns (the
    nesting is too uneven for either alone — PLAN.md decision 4):

      1. in the core's Disciplines chapter, a heading the book follows directly with a
         heading named `Characteristics` (the 11 core Disciplines and Thin-Blood Alchemy);
      2. a heading printed under a clan's `Disciplines` heading in two or more books (what
         brings in Oblivion, which the core does not print).

    A `Level N` heading is never a Discipline. D1 recommends the BASE declare the names."""
    names = set()
    for fn, order in orders:
        if fn != CORE_DISCIPLINES:
            continue
        for i, h in enumerate(order[:-1]):
            if entities[order[i + 1]]["name"] == DISCIPLINE_MARK and entities[h]["name"] != DISCIPLINE_MARK:
                names.add(entities[h]["name"])
    listed = {}
    for e in entities.values():
        if e["name"] == DISCIPLINES_HEADING:
            for k in e["children"]:
                listed.setdefault(entities[k]["name"], set()).add(entities[k]["book"])
    names |= {n for n, books in listed.items() if len(books) >= 2}
    return {n for n in names if not LEVEL_HEADING.match(n)}


def scalar(e, name):
    p = next((x for x in e["props"] if x["name"] == name), None)
    return p.get("value") if p and p.get("vk") in ("scalar", "enum") else None


def records_of(entities, orders, disciplines):
    out = []
    for fn, order in orders:
        level = None
        discipline = None
        for h in order:
            e = entities[h]
            if LEVEL_HEADING.match(e["name"]):
                level = e["name"]
            opens = next((d for d in disciplines if e["name"] == d or e["name"].startswith(d + " ")), None)
            if opens:                    # "Oblivion", "Oblivion Ceremonies", "Thin-Blood Alchemy Formulae"
                discipline, level = opens, None
            ps = prop_names(e)
            kind = next((k for k, test in SHAPES if test(ps)), None)
            if not kind:
                continue
            rec = {"id": h, "name": e["name"], "book": e["book"], "kind": kind,
                   "under": entities[e["parent"]]["name"] if e["parent"] else None}
            if kind in ("power", "ritual"):
                rec["discipline"] = discipline
                rec["level"] = level
            fields = {}
            for f in RECORD_FIELDS[kind]:
                v = scalar(e, f)
                if v is not None:
                    fields[f] = v
            if fields:
                rec["fields"] = fields
            out.append(rec)
    return out


# ───────────────────────── emit ─────────────────────────

def main():
    corpus = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CORPUS
    data_dir = os.path.join(HERE, "data")
    os.makedirs(data_dir, exist_ok=True)
    on_disk = claimed_files(corpus)

    for fn in sorted(os.listdir(data_dir)):
        if fn.endswith(".js"):
            os.remove(os.path.join(data_dir, fn))

    entities = {}
    corrections = []
    orders = []                      # (file, [ids in document order]) in book/chapter order
    books_out = []
    for b in BOOKS:
        chapters = []
        for fn in b["_files"]:
            path = os.path.join(corpus, fn)
            if fn.endswith(LORE_EXTS):
                chapters.append(lore_chapter(path, fn))
                continue
            chapters.append({"file": fn, "kind": "ttrpg", "page": first_page(path, False), "_path": path})
        # printed order; a chapter with no printed page keeps its place after those that have one
        chapters.sort(key=lambda c: (c["page"] is None, c["page"] or 0, c["file"]))
        roots = []
        for c in chapters:
            if c["kind"] != "ttrpg":
                continue
            doc = parse_files([c.pop("_path")])[0]
            order = []
            c["container"] = doc["container"]
            c["name"] = kwstr(doc["body"], "NAME")
            c["roots"] = collect_entities(doc, b["id"], entities, order)
            corrections.extend(corrections_of(doc, b["id"]))
            roots.extend(c["roots"])
            orders.append((c["file"], order))
        books_out.append((b, chapters, roots))

    disciplines = disciplines_of(entities, orders)
    records = records_of(entities, orders, disciplines)

    index_books = []
    total = 0
    for b, chapters, roots in books_out:
        rec = {"id": b["id"], "label": b["label"], "kind": b["kind"], "chapters": chapters, "entities": roots}
        mine = {h: e for h, e in entities.items() if e["book"] == b["id"]}
        payload = {"src": "data/%s.js" % b["id"], "book": rec, "entities": mine}
        with open(os.path.join(data_dir, "%s.js" % b["id"]), "w", encoding="utf-8") as fh:
            fh.write(BANNER)
            fh.write(REGISTER % json.dumps(payload, ensure_ascii=False, sort_keys=True))
        total += len(mine)
        counts = {"entities": len(mine), "chapters": len(chapters)}
        for k in SHAPE_NAMES:
            counts[k] = sum(1 for r in records if r["book"] == b["id"] and r["kind"] == k)
        index_books.append({
            "id": b["id"], "label": b["label"], "kind": b["kind"],
            "files": {"main": ["data/%s.js" % b["id"]]},
            "chapters": [{"file": c["file"], "kind": c["kind"], "name": c.get("name"), "page": c["page"]} for c in chapters],
            "counts": counts,
            "bytes": os.path.getsize(os.path.join(data_dir, "%s.js" % b["id"])),
        })

    index = {"system": "vtm5e", "books": index_books, "disciplines": sorted(disciplines),
             "corrections": corrections,
             "counts": {"books": len(index_books), "entities": total, "files": len(on_disk),
                        "records": {k: sum(1 for r in records if r["kind"] == k) for k in SHAPE_NAMES}}}
    with open(os.path.join(data_dir, "index.js"), "w", encoding="utf-8") as fh:
        fh.write(BANNER)
        fh.write("(function(){var T=window.VTM5E=window.VTM5E||{books:{},entities:{},loaded:{}};"
                 "T.index=%s;})();\n" % json.dumps(index, ensure_ascii=False, sort_keys=True))
    with open(os.path.join(data_dir, "records.js"), "w", encoding="utf-8") as fh:
        fh.write(BANNER)
        fh.write("(function(){var T=window.VTM5E=window.VTM5E||{books:{},entities:{},loaded:{}};"
                 "T.records=%s;})();\n" % json.dumps(records, ensure_ascii=False, sort_keys=True))

    print("build_data: %d corpus files → %d books, %d entities; records: %s; %d Discipline headings; %d corrections"
          % (len(on_disk), len(index_books), total,
             ", ".join("%s %d" % (k, index["counts"]["records"][k]) for k in SHAPE_NAMES), len(disciplines), len(corrections)))
    for x in index_books:
        c = x["counts"]
        print("  %-24s %3d ch %6d ent %5d KB  %s" % (x["id"], c["chapters"], c["entities"], x["bytes"] // 1024,
              " · ".join("%s %d" % (k, c[k]) for k in SHAPE_NAMES if c[k])))


if __name__ == "__main__":
    main()
