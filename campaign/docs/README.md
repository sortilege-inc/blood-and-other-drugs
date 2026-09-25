# campaign/docs — the chronicle's authored prose

Markdown, one file per page. `bash campaign/build/build.sh` turns it into
`campaign/data/docs.js`, which the site's campaign tabs render (`campaign/site/site.js`). The
build fails, naming the file, on a bad key, a missing file, an unknown entity, a broken
`[[link]]` or a page in no section.

A page may open with front matter: `key: value` lines between `---` fences. Paths are relative
to `campaign/`. The file name (without `.md`) is the page's slug, unique across every section,
and sets the order within its section — number them (`01-…`) where order matters.

| Where | Site tab | Front matter (**required**) | The body |
|---|---|---|---|
| `home.md` | Home | — | The chronicle's front page, above the cards into every section. |
| `city/*.md` | The City | **name**, region, portrait | A place in Toronto by night. `region` groups them (a barony, the court's ground, the unclaimed). |
| `coterie/*.md` | The Coterie | **name**, epithet, clan, portrait, entity | One of the coterie. `entity` is their record in `campaign/dsl/`. No player names (PLAN.md, M3). |
| `dramatis-personae/*.md` | Dramatis Personae | **name**, **circle**, epithet, portrait, entity, first | Someone the coterie has **met**, and only what it has learned of them. `circle` groups them as the coterie knows them (the court, a barony, the street…); `first` is where they were met. `entity` links their record for the build's check — **no stat block is drawn on the public site**. |
| `chronicle/*.md` | The Chronicle | **title**, part, date, played | One night of play, as a chapter. Written from the session's transcript, which is the authority (the recaps are not). Prose only: no dice, no named rules, no player names. |
| `trade/*.md` | The Trade | **name**, kind | Blood as a drug — what is made, by whom, what it costs. `kind` groups them. |

**Everything in `docs/` is published with the site**, so it holds only what the coterie knows. The
Storyteller's own material — prep, threads, secrets, what someone really is — is not a doc: it
goes in the GM tabs on `/gm/`, saved in the pack. A `.md` anywhere not listed above fails the build.

Link any page to any other with `[[slug]]` or `[[slug|the words shown]]`.

Portraits go in `campaign/assets/`, web-optimised (WebP).
