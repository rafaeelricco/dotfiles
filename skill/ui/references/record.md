# Record

A taste is one site's pack, `<skill>/tastes/<name>/`. For new packs, `taste.json`
(version 2) owns the reviewed design and `design-system.txt` is its generated guide.
`assets/` holds own parts; `references/`, `shots/` and `capture/` hold supporting
material. See taste's `references/taste-contract.md` for the schema, evidence and
house/reference behavior. Git ignores `tastes/`; recorded packs stay on this machine.
Capture needs Node 22+ and Chrome, Edge or Chromium (`CHROME_PATH` names the binary).
Capture from a tab uses the `browser-use` skill: load it first.

| Ask                                                 | Do                                       |
| --------------------------------------------------- | ---------------------------------------- |
| one or more URLs of one site (`as <name>` optional) | Capture, Look, Write, Extract, Check     |
| no URL, the page is open in Chrome (`browser-use`)  | Capture from the tab, Look, Write        |
| `list`                                              | `node <skill>/scripts/record.mjs list`   |
| "like `<name>`", or a URL plus "on my project"      | record it if it is not saved, then Apply |

## Capture

`node <skill>/scripts/record.mjs <url>... [--name <name>]` opens each page headless at 1440x900 and
390x844, light then dark, and writes the pack: `design-system.txt`, `shots/` (full-page JPEGs),
`capture/` (the page's stylesheets, an HTML snapshot, frames of what moves, `candidates.json`) and,
when missing, `taste.json`. The name defaults to the host (`raycast`); `house` is taken. Give the
pages that show the system: home, one product page, pricing.

From a tab, with `browser-use`: evaluate the whole of `<skill>/scripts/record-capture.js` in it and
save what it returns, at 1440 and at 390 wide:

```bash
browser-use <<'PY'
import json; json.dump(js(open("<skill>/scripts/record-capture.js").read()), open("cap-1440.json", "w"))
PY
```

then `node <skill>/scripts/record.mjs --from <json>... --name <name>`; take the shots into `shots/` with `browser-use`.

A consent wall, a login or a bot check in the way: stop and say so; never click through one.
A name that exists stops the script. `--keep-doc` captures again while preserving the
guide; `--force` replaces a legacy guide on the user's word or regenerates a version 2
guide from its definition. Both preserve `taste.json`, `assets/`, `references/`
and immutable capture evidence. Use `guide NAME` to refresh a version 2 guide explicitly.

## Look

Read every file in `shots/` before writing.

## Write

Review `taste.json` against every screenshot. Correct measured roles in its `tokens`,
choose explicit font sources and fallbacks, and write its `guidance` and field evidence.
For local font sources, copy the named files with the same relative paths beside the
exported CSS (or beside the page for a kit head). HTTPS sources remain explicit URLs;
output generation never downloads or substitutes fonts.
Keep raw observations unchanged. Resolve required null values before CSS/head output;
do not turn missing measurements into kit defaults. Define the supported layout and
motion choices before planning a new page.

Run `node <skill>/scripts/record.mjs guide <name>` after editing. The generated guide
is for reading; edits to it do not affect version 2 CSS or head output. Legacy packs
retain their existing Markdown and corrections path, described in the taste contract.

## Extract

`capture/candidates.json` lists everything that moved, stuck, reacted or was drawn. Settle each one in
`taste.json` â†’ `settled`, following `taste`'s `references/extract.md`: `fits:<family>/<id>` (a kit part
already does it), `variant:<family>/<id>` (a kit part with other numbers, written under `variants`),
`own:<family>/<id>` (you built it in `assets/`, with its `spec.md`), or `skip: <why>`. Fill `use_when`,
and list under `signature` the two or three items a page in this taste must carry.

## Check

`node <taste skill>/scripts/taste.mjs pack check <name>` must end `PACK: PASS`. A record is not done before it.

## Apply

- **Into a project** (an existing app or site, or "the exact style"):
  `node <skill>/scripts/record.mjs css <name> --out <the project's styles folder>/tokens.css`, import it
  as the file's Install section says, and note `taste: <name>` in `.agents/ui.md`. From then on the
  file is the project's tokens: `compose`, `style` and `shape` read its Usage rules, Composition,
  Signature and component tables. A value it lacks is a Stop and ask, not a guess.
- **A new page through the `taste` kit** (`page`): compile with
  `taste.mjs plan --mode reference â€¦ --taste <name>`. Read the resolved plan and guide.
  Use `record.mjs kit <name>` for its head block and apply the printed contract
  attributes. If a part conflicts with the intended design, correct the definition
  and replan; do not reroll a house dealer or drop a required signature part.

Either way a page built from a taste carries your own text, pictures, name and mark, never the site's,
and `motion/laws.md` outranks a recorded duration or curve.
