# Classify

The ids and their one-line tells live in the schemas: section `type` and `hero_form` in
`schemas/section.schema.json`, motion `trigger` in `schemas/motion.schema.json`. This file says
how to choose between them.

## Sections

- Judge from the 1440 screenshot first, then confirm with the probe's `boxes` and `heading`.
- Name what the section does for the reader, not how it is styled: a dark band of three cards
  is `features-grid`, not "dark band".
- One section, one type. When a section does two jobs (a closing ask above a spec sheet), take
  the job its heading states and name the other in `layout`. Two neighbours the page shows as
  one band are still two sections when the probe splits them.
- `hero` is always the section holding the first h1; pick its `hero_form` from what fills the
  first screen beside or under the words.
- `other` only when no id fits; its `why` says what the section is.

## Motion triggers

Decide from the frames `record.md` step 4 takes, with the probe as support. Scroll frames 01–06
go down through the section; 07 is shot back at 01's position and 08 back at 04's. Compare only
inside the section: ignore a change of one pixel row or a few anti-aliased edges, and ignore a
probe `sticky` element sliding inside its section's clip (that is the `pin`, not more motion).

| Seen                                                                     | Trigger         |
| ------------------------------------------------------------------------ | --------------- |
| the entrance frames differ and settle; probe `animations` at the top     | `load`          |
| scroll frames all alike                                                  | no scroll entry |
| 01–06 change; 07 is like 06, not 01 (ran once, stays done)               | `scroll-in`     |
| 01–06 change; 07 is like 01; 08 unlike 04 (replays on each entry)        | `scroll-in`     |
| 07 is like 01 and 08 like 04, and the frames stop changing once the section is fully on screen (a short reveal that replays) | `scroll-in` |
| 07 is like 01 and 08 like 04, and the frames keep changing at every step while it is on screen | `scroll-linked` |
| 07 is like neither 01 nor 06 (it changed with no scroll)                 | `loop`          |
| probe `sticky` entry (fixed or sticky); not read from frames             | `pin`           |
| the two hover frames differ                                              | `hover`         |

A probe animation with `scroll: true` is `scroll-linked` and one with `iterations: "infinite"`
is `loop`, without the frame test. Say in the entry's `why` which frames decided it, and say so
when a canvas or video effect gives no timing.
