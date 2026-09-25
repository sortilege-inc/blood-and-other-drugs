#!/usr/bin/env python3
"""
cast_aliases.py — where the Foundry world names a published thing differently from the book.

Each entry asserts that the world's name IS that printed power, and says why. These are
NAME differences, not corpus gaps: every target below is printed in the corpus, and each
Discipline level named has exactly one power, so the mapping is unambiguous. Case and
typographic differences ("Plug-In" / "Plug-in", "Spirit's" / "Spirit\u2019s") need no entry —
matching normalises both.

Adding an entry is a content decision: it must be reported, not buried.
"""

ALIASES = {
    # the world's name          the corpus's name        why
    "Forgetful Mind":          ("The Forgetful Mind",    "Dominate 3; the world drops the article"),
    "Bond Familiars":          ("Bond Famulus",          "Animalism 1; the world pluralises and anglicises famulus"),
    "Malkavian":               ("Malkavians",            "the core's clans chapter heads the clan in the plural"),
    # The thin-blooded print no Bane, so they are not a clan by the VTT's own rule
    # (system/vtm5e/data.js) — but Foundry files them as one, under two spellings. The core's
    # chapter heads them "The Thin-Blooded"; this was a special case inside the converter
    # until check_cast grew a gate for rewritten names and refused it, which is the point.
    "Thin-Blooded":            ("The Thin-Blooded",      "the core heads the chapter with the article"),
    "Thin-Blood":              ("The Thin-Blooded",      "the core heads the chapter with the article"),
    # Advantages: the world writes a Background in the singular where the books head it plural
    "Contact":                 ("Contacts",              "the core heads the Background in the plural"),
    "Retainer":                ("Retainers",             "the core heads the Background in the plural"),
    # Advantages the world names wrongly — in no book, on neither the wiki's Advantages and
    # Flaws page nor its Loresheets page — mapped to the nearest published one. The owner's
    # ruling, 2026-09-25. The world's dots are kept as the world gives them.
    "Enemy":                   ("Enemies",               "owner: the core's Flaw, printed in its Allies entry; the Players Guide heads it Enemies"),
    "Language":                ("Linguistics",           "owner: the core's Merit, one language per dot"),
    "Rival":                   ("Adversary",             "owner: nearest fit — a Kindred who opposes you"),
    "Infamous Deed":           ("Infamy",                "owner: nearest fit — the Flaw for what you are known to have done"),
    "Iron Will":               ("Tempered Will",         "owner: nearest fit — V5's resistance to Dominate and Presence"),
    "Disallowed Feeding":      ("Prey Exclusion",        "owner: nearest fit — a Flaw restricting whom you feed from"),
    "Disallowed Influence":    ("Despised",              "owner: nearest fit — a group or region of the city shuts you out"),
    "Efficient Digestion":     ("Iron Gullet",           "owner: nearest fit — a Merit widening what you can feed on"),
    "Obsession Target":        ("Stalkers",              "owner: nearest fit — hangers-on fixated on you"),
    "Status Symbol":           ("Fame",                  "owner: nearest fit"),
}

# Advantages the world writes with its annotation run on, with no bracket or colon to split
# at. Each is the owner's ruling (2026-09-24): the published Advantage, and what the world
# adds to it. Everything bracketed or after a colon is split by rule and needs no entry.
ANNOTATED = {
    "Weak-Willed Regarding Art": ("Weak-willed", "Regarding Art",
                                  "owner: the Players Guide's Flaw; 'Regarding Art' is what it concerns"),
    # the owner's nearest fits (2026-09-25) where the world's name says what the published
    # Advantage is ABOUT, so it is kept as the annotation, as with False Love (Trieste)
    "Shunned by Sire":         ("Shunned", "by Sire",   "owner: the Players Guide's Flaw; the world's text is the book's"),
    "Cult":                    ("Herd", "Cult",         "owner: nearest fit — the cult is the Herd"),
    "Prestigious Sire":        ("Mawla", "Sire",        "owner: nearest fit — the sire is the Mawla"),
}

# Absolver, Ripper, Domina and Hedonist stood here while the third-party shelf was unbuilt.
# They needed no alias in the end: The Black Hand prints them as "Absolver (Sabbat Only)" and
# so on, and a published heading's trailing qualifier is a general case, not four exceptions —
# convert_cast.corpus_names() registers the bare form as a second key and resolve() reports
# each one. Upstream V10 loads the shelf (sortilege-vtt-vtm5e f154fdb).

