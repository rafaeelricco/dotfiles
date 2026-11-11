# Record

A taste is one site's pack, `<skill>/tastes/<name>/`: `design-system.txt` (measured values from the
script, judgment written by you), `taste.json` (when to use it and which kit parts carry it),
`assets/` (its own animations, components, effects and scenes in the `taste` kit's formats),
`references/`, and `shots/` and `capture/` (screenshots and the raw capture). Git ignores the whole
`tastes/` folder: a pack stays on this machine, so it may keep anything captured. It needs Node 22+
and, for a URL, Chrome, Edge or Chromium (`CHROME_PATH` names the binary).

| Ask                                                 | Do                                       |
| --------------------------------------------------- | ---------------------------------------- |
| one or more URLs of one site (`as <name>` optional) | Capture, Look, Write, Extract, Check     |
| no URL, the page is open in your own browser tool   | Capture from the tab, Look, Write        |
| `list`                                              | `node <skill>/scripts/record.mjs list`   |
| "like `<name>`", or a URL plus "on my project"      | record it if it is not saved, then Apply |

## Capture

`node <skill>/scripts/record.mjs <url>... [--name <name>]` opens each page headless at 1440x900 and
390x844, light then dark, and writes the pack: `design-system.txt`, `shots/` (full-page JPEGs),
`capture/` (the page's stylesheets, an HTML snapshot, frames of what moves, `candidates.json`) and,
when missing, `taste.json`. The name defaults to the host (`raycast`); `house` is taken. Give the
pages that show the system: home, one product page, pricing.

From a tab: evaluate the whole of `<skill>/scripts/record-capture.js` in it, save the JSON it returns,
then `node <skill>/scripts/record.mjs --from <json>... --name <name>`; take the shots with your own tool.

A consent wall, a login or a bot check in the way: stop and say so; never click through one.
A name that exists stops the script. `--keep-doc` captures a saved taste again and keeps its
`design-system.txt` (use it to give an older taste its `capture/`); `--force` replaces that file and
what was written into it, only on the user's word. Neither touches `taste.json`, `assets/` or `references/`.

## Look

Read every file in `shots/` before writing.

## Write

Replace every `<!-- write: ... -->` slot, at the depth of https://r1cco.com/design-systems/base.txt:

| Slot            | What goes there                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| intro           | the visual DNA in one bold sentence, then the character in one line                                              |
| When to use     | three bullets: what to build with it, the words that should call it                                              |
| Usage rules     | 6 to 10 numbered rules a builder could break: the primary action's colour, text sizes, borders, radii, dark mode |
| Stop and ask    | drift and mixing (the brand-assets line is printed: keep it)                                                     |
| Composition     | how a page is assembled: the hero's structure, section rhythm, density, where pictures sit                       |
| Signature       | the two or three things that make it recognisable, and how to get the same feeling with your own material        |
| component Rules | under each measured component, what never changes                                                                |
| Kit overrides   | `\| Check \| Why \|` rows for the `taste` kit's look checks this taste breaks on purpose, or `None.`             |

Change no measured value; one that looks wrong goes under Provenance and caveats. Check the Colors
table and the **Primary button** line against the shots: the ink must read on the page ground and the
primary is the button the page asks you to press. A wrong one is a capture bug to report, not a value to
hand-correct on the page.
Kit overrides name only the checks `taste`'s `references/gate.md` (Taste overrides) allows, each Why
citing the Usage rule or Signature it serves; write `None.` until a page in this taste meets one.
Done when `grep -c "<!-- write:" <file>` prints 0.

## Extract

`capture/candidates.json` lists everything that moved, stuck, reacted or was drawn. Settle each one in
`taste.json` → `settled`, following `taste`'s `references/extract.md`: `fits:<family>/<id>` (a kit part
already does it), `variant:<family>/<id>` (a kit part with other numbers, written under `variants`),
`own:<family>/<id>` (you built it in `assets/`, with its `spec.md`), or `skip: <why>`. Fill `use_when`,
and list under `signature` the two or three items a page in this taste must carry.

## Check

`node <taste skill>/scripts/pack.mjs check <name>` must end `PACK: PASS`. A record is not done before it.

## Apply

- **Into a project** (an existing app or site, or "the exact style"):
  `node <skill>/scripts/record.mjs css <name> --out <the project's styles folder>/tokens.css`, import it
  as the file's Install section says, and note `taste: <name>` in `.agents/ui.md`. From then on the
  file is the project's tokens: `compose`, `style` and `shape` read its Usage rules, Composition,
  Signature and component tables. A value it lacks is a Stop and ask, not a guess.
- **A new page through the `taste` kit** (`page`): deal with `start.mjs plan … --taste <name>`. Its head
  block is `record.mjs kit <name>`, pasted in place of `start.mjs css` or `brand` (its step 4); the
  pack's own parts and the kit parts it lists as fits are dealt, its signature items always. Read the whole
  taste file before the copy notes. Where a dealt part breaks the taste's Usage rules, Composition or
  Signature (a light band on a dark-only taste, a scene unlike its pages), deal that part again and
  say so on plan line 2; never just drop it, since the gate fails a dealt moment or scene left out.
  The block names the taste (`<meta name="taste">`) and carries its faces (an h1-only face stays on the
  h1), type sizes, button height and shadow: keep it whole and never restyle those back to the kit's. A
  kit check the taste breaks on purpose goes in the taste's Kit overrides, never in the page's waivers.

Either way a page built from a taste carries your own text, pictures, name and mark, never the site's,
and `motion/laws.md` outranks a recorded duration or curve.
