# Extract

What each file says. Field shapes are in `<skill>/schemas/`; this file says how to fill them.

## Evidence

Every measured value carries `evidence`: a probe path (`raw/probe-1440.json#type.h2`) or a
screenshot path. The screenshot wins when the two disagree; then keep the screenshot's value and
say in `why` what the probe got wrong (a gradient averaged to one colour, a hidden element, a
consent banner). Never change a file under `raw/`.

## sections/NN-<type>.json

- `type` and `hero_form` (see `classify.md`); `why` names what in the picture decided it.
- `layout`: one line, 1440 then 390 ("heading left 5 cols, product window right 7 cols; stacks
  text first at 390").
- `boxes`: the probe's tree for this section, cut to what explains the layout (usually 3–10
  boxes), in percent of the section. Mark repeats with `repeat` instead of listing each card.
- `motion`: ids of the `motion/*.json` entries that live in this section.

## design.json

- `colors`: one hex per role (`bg`, `surface`, `ink`, `muted`, `accent`, `border`), from the
  probe's `colors` and `buttons`, checked against the screenshots; `bg` is `colors.page` when the
  screenshots show it behind the sections, else the fill they do show. `colors_dark` the same from
  the dark probe, or `null` when the dark screenshot matches light.
- `type`: h1, h2, h3, body, small, button from the probe's `type` at 1440, with the 390 size
  beside it when it differs.
- `fonts`: each family with its source and the nearest free fallback you would use. The source
  is the absolute URL in the probe's `fonts.faces[].src`: the one face when there is one, else
  the regular weight. A family split into several unicode-range files with no way to tell which
  holds Latin is `null` with that `why`.
- `spacing`: container, gutter, section padding (from the section boxes), card gap.
- `radius`, `shadows`, `components` (button, card, input). A component's `crop` is a hover frame
  of it when one exists, else the section shot that shows it (say which part in `why`), else
  `null`.

## motion/<id>.json

One entry per distinct effect, not per element: six cards rising together are one entry with a
`stagger`. `what` says in one line what moves and how; `trigger` per `classify.md`; numbers from
the probe (`animations`, `transitions`) where it has them, else read from the frames and say so
in `why`.

## site.json

`kind` (one of the schema's ids, by what the site sells), `title` (the page's `<title>`),
`summary` (what the site sells and to whom, one sentence), `character` (2–3 sentences a designer
could act on), `use_when` (1–3 kinds of page this taste fits), `widths` (`[1440, 390]`),
`problems` (shots retaken or missing, sections the probe missed).

## review.md

For a person to check the record in one read. Image paths are relative to the site folder.

```markdown
# <name> — <url>

<summary> · captured <date> · <kind>

<character>

## 01 · hero (split)

![1440](sections/01@1440.png) ![390](sections/01@390.png)
**Layout** <layout> · **Motion** <motion ids or none>
**Why hero/split** <why>

… one block per section …

## Motion

### <id> — <trigger>

<what> · <duration> <easing>
![](<each path in its frames>) …

## Problems

<problems, or "none">
```

## catalog.json

One entry per site: `name`, `url`, `captured`, `kind`, `summary`, `use_when`, the list of section
types in page order, the list of motion triggers, and `path` (`<name>/`). Replace the site's entry
when re-recording; keep the others.
