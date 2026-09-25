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
}
