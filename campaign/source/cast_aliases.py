#!/usr/bin/env python3
"""
cast_aliases.py — where the Foundry world names a published power differently from the book.

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
}

# Absolver, Ripper, Domina and Hedonist stood here while the third-party shelf was unbuilt.
# They needed no alias in the end: The Black Hand prints them as "Absolver (Sabbat Only)" and
# so on, and a published heading's trailing qualifier is a general case, not four exceptions —
# convert_cast.corpus_names() registers the bare form as a second key and resolve() reports
# each one. Upstream V10 loads the shelf (sortilege-vtt-vtm5e f154fdb).
