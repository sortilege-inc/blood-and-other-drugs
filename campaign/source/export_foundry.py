#!/usr/bin/env python3
"""
export_foundry.py — a dated, verbatim export of the Foundry world, over the foundryrestapi.com
relay (campaign/PLAN.md O2: Foundry is the source of truth for records).

    FOUNDRY_API_KEY=... python3 campaign/source/export_foundry.py [--date YYYY-MM-DD]

Writes campaign/source/foundry-export/<date>/:

    manifest.json          what was asked for and what came back, with counts
    Actor/<id>.json        one file per document, the relay's `data` exactly as returned
    Scene/<id>.json
    Item/<id>.json
    Folder/<id>.json       the folder tree, so an actor's barony is readable

The key is read from the environment and never written to disk: it is session-scoped
(see the Sjorseidr note). Re-running with the same --date overwrites that day's export.
"""
import argparse
import datetime
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = "https://foundryrestapi.com"
WORLD = "blood-and-other-drugs"
TYPES = ("Actor", "Scene", "Item", "JournalEntry", "RollTable")
HERE = os.path.dirname(os.path.abspath(__file__))


def call(path, key, tries=3):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "curl/8.0", "x-api-key": key})
    for n in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            if n == tries - 1:
                raise SystemExit("export_foundry: %s — %s" % (path, e))
            time.sleep(2 * (n + 1))


def client_id(key):
    for c in call("/clients", key).get("clients", []):
        if c.get("worldId") == WORLD:
            if not c.get("isOnline"):
                raise SystemExit("export_foundry: the world %s is offline — start Foundry" % WORLD)
            return c["clientId"]
    raise SystemExit("export_foundry: no client for world %s" % WORLD)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    a = ap.parse_args()
    key = os.environ.get("FOUNDRY_API_KEY")
    if not key:
        raise SystemExit("export_foundry: set FOUNDRY_API_KEY (session-scoped; never commit it)")
    cid = client_id(key)
    out = os.path.join(HERE, "foundry-export", a.date)

    listed, saved, folders = {}, {}, set()
    for t in TYPES:
        res = call("/search?clientId=%s&filter=documentType:%s" % (cid, t), key).get("results", [])
        rows = [r for r in res if r.get("resultType") == "WorldEntity"]
        listed[t] = [{"uuid": r["uuid"], "id": r["id"], "name": r["name"],
                      "subType": r.get("subType"), "folder": r.get("folder")} for r in rows]
        os.makedirs(os.path.join(out, t), exist_ok=True)
        saved[t] = 0
        for r in listed[t]:
            d = call("/get?clientId=%s&uuid=%s" % (cid, r["uuid"]), key)
            if "data" not in d:
                raise SystemExit("export_foundry: no data for %s (%s)" % (r["uuid"], r["name"]))
            with open(os.path.join(out, t, r["id"] + ".json"), "w", encoding="utf-8") as fh:
                json.dump(d["data"], fh, ensure_ascii=False, indent=2, sort_keys=True)
            saved[t] += 1
            if r.get("folder"):
                folders.add(r["folder"])
        print("  %-13s listed %3d · saved %3d" % (t, len(listed[t]), saved[t]))

    os.makedirs(os.path.join(out, "Folder"), exist_ok=True)
    seen = {}
    todo = list(folders)
    while todo:                                   # a folder's parent is a folder too
        fid = todo.pop()
        if fid in seen:
            continue
        d = call("/get?clientId=%s&uuid=Folder.%s" % (cid, fid), key).get("data")
        if not d:
            continue
        seen[fid] = d
        with open(os.path.join(out, "Folder", fid + ".json"), "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, indent=2, sort_keys=True)
        if d.get("folder"):
            todo.append(d["folder"])
    print("  %-13s saved %3d" % ("Folder", len(seen)))

    manifest = {
        "world": WORLD, "clientId": cid, "date": a.date,
        "takenAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "counts": {t: {"listed": len(listed[t]), "saved": saved[t]} for t in TYPES},
        "folders": {fid: {"name": d.get("name"), "parent": d.get("folder")} for fid, d in seen.items()},
        "listed": listed,
    }
    with open(os.path.join(out, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2, sort_keys=True)
    bad = [t for t in TYPES if saved[t] != len(listed[t])]
    print("export_foundry: %s → %s" % (a.date, "INCOMPLETE " + ", ".join(bad) if bad else "every listed document saved"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
