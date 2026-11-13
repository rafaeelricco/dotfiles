---
name: taste
description: "Records reference websites into a catalog of tastes: per-section screenshots, section types, layout boxes, design system and motion, as small JSON files plus a review page. Use when the ui skill records a site, to list or search saved tastes, or to apply a saved taste to a project."
---

# Taste

A taste is one recorded site in `<skill>/catalog/<name>/`. It is inspiration, never a copy:
a build takes its structure, rhythm, tokens and motion, never its text, logos, pictures or code.
`catalog/` is git-ignored, so recorded sites stay on this machine.

| Ask                              | Do                                          |
| -------------------------------- | ------------------------------------------- |
| a URL (`as <name>` optional)     | `references/record.md`                      |
| list, or find a section / motion | read `catalog/catalog.json`, answer from it |
| apply a taste to a project       | `references/apply.md`                       |

Every file written follows its schema in `schemas/`, checked with the validator in
`references/record.md` step 5. A field the schema lacks is not written. A measured value the
schema lets be `null` (a colour, a size, a font source, a crop) is `null` when nothing shows it,
with a `why` beside it.
