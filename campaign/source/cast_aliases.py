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
}

# Published in THE BLACK HAND, which this instance does not load yet (U2). They are not
# homebrew and must not be written as though they were: until the third-party shelf is built,
# the converter keeps the world's spelling and says so on every run.
AWAITING_THIRD_PARTY = {
    "Absolver": "The Black Hand, Walking the Path — \u201cAbsolver (Sabbat Only)\u201d",
    "Ripper":   "The Black Hand, Walking the Path — \u201cRipper (Sabbat Only)\u201d",
    "Domina":   "The Black Hand, Walking the Path — \u201cDomina (Sabbat Only)\u201d",
    "Hedonist": "The Black Hand, Walking the Path — \u201cHedonist (Sabbat Only)\u201d",
}
