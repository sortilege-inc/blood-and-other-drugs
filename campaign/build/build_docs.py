#!/usr/bin/env python3
"""
build_docs.py — the chronicle's authored prose (campaign/docs/) → campaign/data/docs.js.

The docs are Markdown, one file per page, each with an optional front matter of `key: value`
lines between `---` fences. Every section's format is in campaign/docs/README.md. This writes
one self-registering file, `window.BloodDocs`, which the campaign's site tabs
(campaign/site/site.js) render; it never touches the VTT's own data/.

Everything in docs/ is published with the site, so it holds only what the coterie knows. The
Storyteller's own material — prep, threads, secrets, what a person really is — lives in the GM
tabs on /gm/, in the pack (PLAYBOOK §4b.2), never here.

It fails (exit 1), naming the file, on anything a page would show wrong:

  * a front-matter key the section does not define, or a required one missing
  * a `portrait` path that is not a file under campaign/
  * an `entity` id that is neither in the books (data/*.js) nor in the chronicle's layer
    (campaign/data/campaign.js) — build the layer first (build/build_layer.sh)
  * a `[[slug]]` link to a page that does not exist, or a file name used twice
  * a Markdown file in no section (it would be published and drawn nowhere)

    python3 campaign/build/build_docs.py
"""
import json
import os
import re
import sys

import markdown

CAMPAIGN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(CAMPAIGN)
DOCS = os.path.join(CAMPAIGN, "docs")
OUT = os.path.join(CAMPAIGN, "data", "docs.js")
ENTITY_BLOB = re.compile(r"var d=(\{.*?\});var T=window\.VTM5E", re.S)

# section → (folder, keys it allows, keys it requires). The order is the site's (PLAN.md O6).
SECTIONS = {
    "city": ("city", {"name", "region", "portrait"}, {"name"}),
    "coterie": ("coterie", {"name", "epithet", "clan", "portrait", "entity"}, {"name"}),
    "people": ("dramatis-personae", {"name", "epithet", "circle", "portrait", "entity", "first"}, {"name", "circle"}),
    "chronicle": ("chronicle", {"title", "part", "date", "played"}, {"title"}),
    "trade": ("trade", {"name", "kind"}, {"name"}),
}
WIKILINK = re.compile(r"\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]")

errors = []


def fail(path, msg):
    errors.append("%s: %s" % (os.path.relpath(path, ROOT), msg))


def front_matter(path, text):
    """`---` / key: value lines / `---` at the top of a file → (dict, body)."""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        fail(path, "front matter opened with --- and never closed")
        return {}, text
    meta = {}
    for ln in text[4:end].split("\n"):
        if not ln.strip():
            continue
        k, sep, v = ln.partition(":")
        if not sep:
            fail(path, "front-matter line is not `key: value`: %r" % ln)
            continue
        meta[k.strip()] = v.strip()
    return meta, text[end + 5:]


def known_entities():
    ids = set()
    for d in (os.path.join(ROOT, "data"), os.path.join(CAMPAIGN, "data")):
        for fn in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if fn.endswith(".js") and fn != "docs.js":
                m = ENTITY_BLOB.search(open(os.path.join(d, fn), encoding="utf-8").read())
                if m:
                    ids.update(json.loads(m.group(1)).get("entities") or {})
    return ids


def render(md_text):
    return markdown.markdown(md_text, extensions=["tables", "sane_lists", "attr_list"])


def asset(path, meta, key):
    """A path in front matter is relative to campaign/; the page gets it relative to the site root."""
    v = meta.get(key)
    if not v:
        return None
    if not os.path.isfile(os.path.join(CAMPAIGN, v)):
        fail(path, "%s %r is not a file under campaign/" % (key, v))
        return None
    return "campaign/" + v


def read_section(sid):
    folder, allowed, required = SECTIONS[sid]
    d = os.path.join(DOCS, folder)
    out = []
    for fn in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if not fn.endswith(".md") or fn == "README.md":
            continue
        path = os.path.join(d, fn)
        meta, body = front_matter(path, open(path, encoding="utf-8").read())
        for k in sorted(set(meta) - allowed):
            fail(path, "front-matter key %r is not one of %s" % (k, ", ".join(sorted(allowed))))
        for k in sorted(required - set(meta)):
            fail(path, "front-matter key %r is required" % k)
        page = {"slug": fn[:-3], "md": body}
        for k in allowed:
            if meta.get(k):
                page[k] = meta[k]
        if "portrait" in allowed and meta.get("portrait"):
            page["portrait"] = asset(path, meta, "portrait")
        page["_path"] = path
        out.append(page)
    return out


def main():
    site = {"home": None}
    path = os.path.join(DOCS, "home.md")
    if os.path.isfile(path):
        _meta, body = front_matter(path, open(path, encoding="utf-8").read())
        site["home"] = {"md": body}
    for sid in SECTIONS:
        site[sid] = read_section(sid)

    # a page anywhere else would be published and drawn nowhere: fail it
    folders = {f for f, _a, _r in SECTIONS.values()}
    for dirpath, _dirs, files in os.walk(DOCS):
        for fn in files:
            rel = os.path.relpath(os.path.join(dirpath, fn), DOCS)
            parts = rel.split(os.sep)
            if fn.endswith(".md") and rel not in ("README.md", "home.md") and not (len(parts) == 2 and parts[0] in folders):
                fail(os.path.join(dirpath, fn), "not a page of any section (see campaign/docs/README.md); "
                     "the Storyteller's own notes go in the GM tabs on /gm/, not in docs/")

    entities = known_entities()
    for sid in SECTIONS:
        for p in site[sid]:
            if p.get("entity") and p["entity"] not in entities:
                fail(p["_path"], "entity %r is in neither the books nor the chronicle's layer" % p["entity"])
    # [[slug]] / [[slug|text]] link any page to any other, by its file name (unique across sections)
    slugs = {}
    for sid in SECTIONS:
        for p in site[sid]:
            if p["slug"] in slugs:
                fail(p["_path"], "file name %r is also used in %s — [[links]] need it unique" % (p["slug"], slugs[p["slug"]]))
            slugs[p["slug"]] = sid

    def links(md_text, path):
        def sub(m):
            slug, label = m.group(1), m.group(2)
            if slug not in slugs:
                fail(path, "[[%s]] names no page" % slug)
                return label or slug
            return '<a class="doc-link" data-tab="%s" data-slug="%s">%s</a>' % (slugs[slug], slug, label or slug)
        return WIKILINK.sub(sub, md_text)

    if site["home"]:
        site["home"] = {"html": render(links(site["home"]["md"], os.path.join(DOCS, "home.md")))}
    for sid in SECTIONS:
        for p in site[sid]:
            p["html"] = render(links(p.pop("md"), p["_path"]))
            p["words"] = len(re.sub(r"<[^>]+>", " ", p["html"]).split())
            del p["_path"]

    if errors:
        print("build_docs: FAILED")
        for e in errors:
            print("  " + e)
        return 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("/* Generated by campaign/build/build_docs.py from campaign/docs/ — do not edit by hand. */\n")
        fh.write("window.BloodDocs=%s;\n" % json.dumps(site, ensure_ascii=False, sort_keys=True))
    print("build_docs: %s → %s" % (", ".join("%s %d" % (s, len(site[s])) for s in SECTIONS),
                                    os.path.relpath(OUT, ROOT)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
