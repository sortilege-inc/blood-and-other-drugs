#!/usr/bin/env python3
"""
build_map.py — the chronicle's Google My Map (YYZ by Night) → campaign/data/map.js.

The source is `campaign/source/yyz-by-night.kml`, the map's own KML export:

    curl -sL -o campaign/source/yyz-by-night.kml \
      "https://www.google.com/maps/d/kml?mid=13Bnvfyex1eDpMy4fRq40isZksfSBmlo&forcekml=1"

Two of its three layers are published (owner, 2026-09-25): **Factions** (207 neighbourhoods,
each with who holds it, a line of description and its Kindred count) and **Persons of
Interest** (31 pins, each with its fields as the map shows them). The third, *Neighbourhoods*,
is the same city without data and is not drawn. Colours are the map's own styles.

It writes one self-registering file, `window.BloodMap`: the neighbourhoods as SVG paths in a
1000-wide frame, the pins as points in it, and the legend. The City tab draws it
(campaign/site/site.js). It fails (exit 1), naming what, on anything the page would show wrong:

  * a published layer missing, or a placemark in it without a name or a geometry
  * any placemark in the source that is not in the output (counted per layer)
  * a faction or pin group whose colour is not a single style on the map
  * a name still carrying a `?` the export put in place of a letter (see REPAIRS)
  * a pin's link to a Dramatis Personae page that does not exist

    python3 campaign/build/build_map.py
"""
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET

CAMPAIGN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(CAMPAIGN)
SRC = os.path.join(CAMPAIGN, "source", "yyz-by-night.kml")
OUT = os.path.join(CAMPAIGN, "data", "map.js")
PEOPLE = os.path.join(CAMPAIGN, "docs", "dramatis-personae")
K = "{http://www.opengis.net/kml/2.2}"
LAYERS = ("Factions", "Persons of Interest")
WIDTH = 1000.0
TOLERANCE = 0.45  # Douglas–Peucker, in frame units (a 1000-wide map)

# Google's export writes `?` for some letters it cannot encode. Repaired to the owner's own
# spelling (the cast notes, the Foundry world); every repair is printed on each run.
REPAIRS = {"Darya Vukovi?": "Darya Vuković"}

errors = []


def fail(msg):
    errors.append(msg)


def kml_colour(c):
    """KML aabbggrr → (#rrggbb, alpha 0–1)."""
    c = (c or "").strip().lower()
    if not re.fullmatch(r"[0-9a-f]{8}", c):
        return None, None
    return "#" + c[6:8] + c[4:6] + c[2:4], round(int(c[0:2], 16) / 255, 2)


def styles(root):
    """style id → (poly colour, icon colour), with StyleMaps resolved to their `normal` style."""
    base = {}
    for s in root.iter(K + "Style"):
        base[s.get("id")] = (s.findtext(K + "PolyStyle/" + K + "color"), s.findtext(K + "IconStyle/" + K + "color"))
    out = dict(base)
    for m in root.iter(K + "StyleMap"):
        for p in m.findall(K + "Pair"):
            if p.findtext(K + "key") == "normal":
                out[m.get("id")] = base.get((p.findtext(K + "styleUrl") or "").lstrip("#"), (None, None))
    return out


def fields(pm):
    return {e.get("name"): (e.findtext(K + "value") or "").strip() for e in pm.iter(K + "Data")}


def coords(el):
    pts = []
    for tok in (el.text or "").split():
        lon, lat = tok.split(",")[:2]
        pts.append((float(lon), float(lat)))
    return pts


def simplify(pts, tol):
    """Douglas–Peucker on a ring (first == last kept)."""
    if len(pts) < 4:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-12
        best, idx = -1.0, None
        for i in range(a + 1, b):
            x0, y0 = pts[i]
            d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm if (dx or dy) else math.hypot(x0 - x1, y0 - y1)
            if d > best:
                best, idx = d, i
        if idx is not None and best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def main():
    root = ET.parse(SRC).getroot()
    style = styles(root)
    folders = {f.findtext(K + "name"): f for f in root.iter(K + "Folder")}
    for layer in LAYERS:
        if layer not in folders:
            fail("layer %r is not in the map" % layer)
    if errors:
        return report()

    # the frame: every published geometry, projected equirectangular at the city's latitude
    lonlat = [p for layer in LAYERS for c in folders[layer].iter(K + "coordinates") for p in coords(c)]
    lon0, lon1 = min(p[0] for p in lonlat), max(p[0] for p in lonlat)
    lat0, lat1 = min(p[1] for p in lonlat), max(p[1] for p in lonlat)
    k = math.cos(math.radians((lat0 + lat1) / 2))
    scale = WIDTH / ((lon1 - lon0) * k)
    height = round((lat1 - lat0) * scale, 1)

    def xy(p):
        return ((p[0] - lon0) * k * scale, (lat1 - p[1]) * scale)

    def path(ring):
        if len(ring) < 4:  # a closed ring needs three corners and its return
            return None
        pts = simplify([xy(p) for p in ring], TOLERANCE)
        if len(pts) < 4:
            pts = [xy(p) for p in ring]
        return "M" + "L".join("%.1f %.1f" % p for p in pts[:-1]) + "Z"

    def group_colour(layer, key, idx):
        seen = {}
        for pm in folders[layer].findall(K + "Placemark"):
            sid = (pm.findtext(K + "styleUrl") or "").lstrip("#")
            seen.setdefault(fields(pm).get(key, ""), set()).add(style.get(sid, (None, None))[idx])
        out = {}
        for g, cs in seen.items():
            if len(cs) != 1 or None in cs:
                fail("%s: %r is drawn in %d colours on the map, not one" % (layer, g, len(cs)))
                continue
            out[g] = kml_colour(cs.pop())
        return out

    # ── Factions ────────────────────────────────────────────────
    fcol = group_colour("Factions", "faction", 0)
    hoods = []
    for pm in folders["Factions"].findall(K + "Placemark"):
        name, f = (pm.findtext(K + "name") or "").strip(), fields(pm)
        rings = [path(coords(c)) for c in pm.iter(K + "coordinates")]
        if not name or not rings or None in rings:
            fail("Factions: %s" % ("a placemark without a name" if not name else "%r has no shape to draw" % name))
            continue
        pop = f.get("kindredpop", "")
        hoods.append({"name": REPAIRS.get(name, name), "faction": f.get("faction", ""), "desc": f.get("description", ""),
                      "pop": int(float(pop)) if pop else None, "d": "".join(rings)})

    # ── Persons of Interest ─────────────────────────────────────
    pcol = group_colour("Persons of Interest", "faction", 1)
    pages = {}
    for fn in sorted(os.listdir(PEOPLE)) if os.path.isdir(PEOPLE) else []:
        if fn.endswith(".md"):
            m = re.search(r"^name:\s*(.+)$", open(os.path.join(PEOPLE, fn), encoding="utf-8").read(), re.M)
            if m:
                pages[fn[:-3]] = m.group(1).strip()

    def page_for(name):
        """A pin links to the Dramatis Personae page whose name it is, or whose name appears in it
        as whole words (Lucien ← *Prince Lucien DuSang*, Sabine ← *Sabine Moreau*, Gamut ← *Gamut (DJ)*)."""
        bare = re.sub(r"\s*\(.*?\)\s*", " ", name).strip()
        for slug, pn in pages.items():
            if pn in (name, bare) or (" " + pn + " ") in (" " + bare + " "):
                return slug
        return None

    people = []
    for pm in folders["Persons of Interest"].findall(K + "Placemark"):
        raw, f = (pm.findtext(K + "name") or "").strip(), fields(pm)
        pt = [p for c in pm.iter(K + "coordinates") for p in coords(c)]
        if not raw or not pt:
            fail("Persons of Interest: a placemark without a %s" % ("name" if not raw else "point"))
            continue
        name = REPAIRS.get(raw, raw)
        x, y = xy(pt[0])
        rec = {"name": name, "x": round(x, 1), "y": round(y, 1)}
        for key in ("description", "faction", "religion", "clan", "status"):
            if f.get(key):
                rec[key] = f[key]
        slug = page_for(name)
        if slug:
            rec["page"] = slug
        people.append(rec)

    # ── gates ───────────────────────────────────────────────────
    for layer, got in (("Factions", hoods), ("Persons of Interest", people)):
        want = len(folders[layer].findall(K + "Placemark"))
        if want != len(got):
            fail("%s: %d placemarks in the map, %d written" % (layer, want, len(got)))
    for rec in hoods + people:
        if "?" in rec["name"]:
            fail("name %r still carries the export's `?` — add it to REPAIRS" % rec["name"])
    for p in people:
        if p.get("page") and p["page"] not in pages:
            fail("pin %r links to a page that does not exist: %s" % (p["name"], p["page"]))
    if errors:
        return report()

    legend = {
        "factions": [{"name": g, "colour": c[0], "count": sum(h["faction"] == g for h in hoods)}
                     for g, c in sorted(fcol.items(), key=lambda kv: -sum(h["faction"] == kv[0] for h in hoods))],
        "people": [{"name": g or "Unaffiliated", "key": g, "colour": c[0], "count": sum(p.get("faction", "") == g for p in people)}
                   for g, c in sorted(pcol.items(), key=lambda kv: -sum(p.get("faction", "") == kv[0] for p in people))],
    }
    data = {"width": WIDTH, "height": height, "hoods": hoods, "people": people, "legend": legend,
            "source": "YYZ by Night, the chronicle's Google map"}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("/* Generated by campaign/build/build_map.py from campaign/source/yyz-by-night.kml — do not edit by hand. */\n")
        fh.write("window.BloodMap=%s;\n" % json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    for raw, fixed in REPAIRS.items():
        print("  repaired: %r → %r" % (raw, fixed))
    linked = [p for p in people if p.get("page")]
    print("  pins linked to Dramatis Personae: " + ", ".join("%s → %s" % (p["name"], p["page"]) for p in linked))
    print("build_map: %d neighbourhoods (%d factions), %d persons of interest (%d linked) → %s, %d KB"
          % (len(hoods), len(fcol), len(people), len(linked), os.path.relpath(OUT, ROOT), os.path.getsize(OUT) // 1024))
    return 0


def report():
    print("build_map: FAILED")
    for e in errors:
        print("  " + e)
    return 1


if __name__ == "__main__":
    sys.exit(main())
