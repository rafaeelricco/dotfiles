# Taste: the flow

**Every page is built in a copy of `<skill>/assets/starter.html`, with the kit's core and dealt
parts copied into `assets` by `taste.mjs build`, however small the brief.** "Keep it simple" or "just a quick page" means fewer sections,
never a page or stylesheet of your own: the starter carries the hero entrance, the moments, the
screens and the checks, and the finish gate fails a page built without it.

## House rules

These are defaults for pages without a recorded taste. With a recorded taste,
`references/taste-contract.md` decides aesthetic precedence; functional checks still apply.

1. **No caption or description under any image, render or visual.** Licence credits go in one
   footer line.
2. **Every visual renders, never an empty ground,** at 1440, 1024, 768 and 390.
3. **One section per screen:** the hero alone on the first screen, every section exactly one or
   two screens tall at 1440x900, no second section heading peeking in. The one exception is a
   live `photo-chapters` section, three or four screens, set by the moment.
4. **Equal left and right content edges.**
5. **Hover micro-animations:** a linked card lifts 2px, a photo zooms 1.02-1.03 inside its frame,
   buttons step on hover and press on click, underlines draw, card loops cycle in 2.5-4 s, repeat
   and restart on hover. The motion layer does it; never strip or override it. No tilt, carousels
   or timed tabs. Every hero enters once on load (`data-enter`, the dealt variant), and every page
   carries two dealt moments, three on a long page (the gate holds both).
6. **Real photographs wherever the kind takes them** (`page-planning.md` section 2 sets the count); grounds, heroes,
   layouts and fonts come from the deal (step 4), never from taste.
7. **Real full-colour icons** (a known product's real icon, never a drawn one); small diagram
   visuals in cards (a hub with branches; one input, a main processor, three parallel lanes;
   pulses running along the lines).
8. **The big award-site scenes and creative moments are part of the skill, by fit, on every
   kind:** every page deals two moments (three on a long page) and 0 or 1 scene. Each carries tones
   (warm, editorial, product, tech, playful) and an intensity (quiet, lively, bold), and the kind
   takes what fits (`moments.md`, The fit rule): a cafe, bakery, guesthouse or shop gets warm,
   quiet to lively moments and scenes beside its photographs, never anything too wild; tech, gaming
   and software keep the shader grounds and the bold ones. A place, service or product page takes
   at most one quiet treatment (`effects-usage.md`).
9. **Addresses:** street and district only (no street given: the district), no house number, postcode or coordinates; no register
   or VAT numbers; no phone in a real format; contacts on `.example`.

## 1. The kind of business decides everything

Write the kind on the plan's first line and declare it on the page: the page type on
`<html data-type>` and `<meta name="page-type">` (the same value), and `<meta name="site-kind">`;
a place adds `<meta name="page-kind" content="place">`. The dealers take the last column
(`start.mjs --page`, `moments.mjs --page`), the hero dealer the page type; `consistency.mjs` reads
the metas.

| Brief                                                                                                                  | page type | site-kind | kind     |
| ---------------------------------------------------------------------------------------------------------------------- | --------- | --------- | -------- |
| App, SaaS, AI, developer tool, fintech or banking app, a studio selling its own software                               | software  | software  | software |
| A game, a studio launching its game                                                                                    | software  | gaming    | gaming   |
| Hardware or a tech device (a drone, a robot arm, a keyboard)                                                           | product   | tech      | tech     |
| Any other physical product or brand (a chair, a bike, coffee beans sold online)                                        | product   | other     | product  |
| People are hired: clinic, law firm, agency, creative studio, trade                                                     | service   | other     | service  |
| People come to it: cafe, bar, bakery, restaurant, guesthouse, small hotel, shop, florist, bike shop, gym, local studio | place     | other     | place    |

A maker that also opens its door or teaches (a ceramics studio, a bakery with a web shop) is a
**place**; its web shop becomes the goods section. It is a product only when nothing happens at the door.

"Tech" below means site-kind software, gaming or tech; "other" is everything else. Shader effect
grounds, CSS grounds, dark pages and dark heroes are tech only. An other page is photographs, flat
colour, type, real icons, the hero's dealt entrance, the section reveals, its two or three dealt
moments and 0 or 1 scene (by fit, `moments.md`), loops inside card visuals, at most one quiet
treatment and the hover layer.

## 2–3. Page planning and asset fit

Read `references/page-planning.md` when planning the page. Its sections 2 and 3 cover the page plan by kind and which asset families fit.

## 4. The run

0. **The stack.** An empty folder builds a static page: copy `<skill>/assets/starter.html` to
   `index.html` and edit it in place; after the deal (step 4), `node <skill>/scripts/taste.mjs build --to assets`
   copies the core and the dealt parts, and `--add <family>/<id>` any part you place by hand (a UI
   fragment, an `fx-*` part, an object). Never copy the whole `<skill>/assets`. An existing project builds in its own stack, its components
   taking the starter's markup and classes, with the kit copied the same way into its public folder
   (`--to public/assets`) and loaded from there as plain files, by root paths (`/assets/system.js`), once
   the page has hydrated. A brief that asks for Next.js builds a static export (`output: 'export'`),
   checked on its built page (`--root out`). Any framework build reads `frameworks.md` first: the head, the script loader,
   the DOM the kit owns, which build the checks open, and what to cut from the copy.

1. **Read the brief.** Write down the kind (section 1), what is sold, who buys it, the one main
   action (the transaction: Book a room, Order a cake, Start a free trial; a place with neither:
   Get directions) and the real material: logo, screens, photographs, prices, address, hours.
   Then arm the finish gate, before any page exists:

   ```bash
   node <skill>/scripts/taste.mjs check --start index.html --kind <kind> --category "<what is sold>" --primary "<main action>"
   ```

   A framework build names its dev server's URL (`--start http://localhost:5173/`) or its built page
   (`--start dist/index.html --root dist`; a Next.js export: `out`) in place of `index.html`, and
   rebuilds before every gate run.

2. **Write the copy notes, then all the copy,** before the page. Copy the block in `copy.md` (The
   copy notes) to `.taste-skill/copy.md` and fill it from the brief: the fact sheet; the six
   questions, answered by you (what the brief cannot answer goes to "Client must supply", never onto
   the page); the voice card (Register from `copy-registers.md`; Hero form, one of the 14 in
   `copy-moves.md`, chosen on purpose or dealt by the brand name's letters, never the last page's;
   Admission; Enemy; Customer words; Five seconds); then the draft, one line per part (`H1:`,
   `Lead:`, `H2:`, `Button:`). Lint it: `node <skill>/scripts/copy-lint.mjs .taste-skill/copy.md`.
   The rules of `copy.md` hold: the hero (h1, eyebrow and lead) tells a stranger in five seconds what
   is sold and where or for whom, the h1 in the form on the card and the category plain in the lead
   or the eyebrow (a game: its name in the h1); one hard fact on the first screen; a noun in every
   heading, no two headings sharing a phrase; buttons as a verb and an object; the close's heading
   says something new, never the ask of the section above it. Nothing is invented but a coined brand
   name (searched first, the result kept in `names.json` beside the page) and, on a place, plausible
   hours and prices, each marked `data-assumed` (`copy.md`, What may be assumed). copy-lint FAILs a
   page with no notes or a voice card with an empty field.

3. **Plan the page.** In reference mode, follow its resolved section rhythm; the screen
   prescriptions below apply to house mode. Line 1: the kind. Line 2: the deal (step 4), with one sentence on
   why the palette fits the trade. Then one line per
   section: its id, its one idea, its picture and its kind (object, use, parts, world, slot, diagram, type; three object lines at most), its
   screens (1 or 2, from its content height, `layout-v4.md` section 2), which section holds a
   moment or the scene and why it moves (on tech also the effect). Pick the photographs now
   (`photos.md`), one line each: "heading says X, picture shows Y", against the claim, not the
   keyword; their count, stand-ins included, sets a place's length (`page-planning.md` section 2). What the brief asks
   for becomes an element (slot times, a date range with a room choice, an order with quantity:
   `sections.md` section 1, its table). Then read `cards.md` and the recipe of every id you use in
   `sections-library.md`.

4. **Resolve the build mode.** Follow `references/taste-contract.md`. With a version 2 taste,
   compile its reviewed definition; legacy tastes retain their original dealer path. Without a taste, use the house dealers:

   ```bash
   node <skill>/scripts/taste.mjs plan --page <kind> --trade <trade> [--type <page type>] [--has photo,ui,film,object,setting] [--long] [--mode house|reference] [--taste <name>] --history .taste-skill/history.json
   ```

   In house mode it runs the dealers below and ends with a PLAN block, one line a part, each naming the file or
   recipe to copy: the palette and pairing, the hero (and a place's form), the entrance, nav,
   footer, close, buttons, mark, bands, a composition for each section, the reveals, two or three
   moments, 0 or 1 scene, 0 or 1 effect. Copy the PLAN onto plan line 2 and into the comment at the
   top of `<body>`, and build exactly that. `--long` deals three moments for eight sections or more.
   Reference mode prints its resolved choices and required parts directly. Use its
   generated head and attributes. Correct the definition and replan to change them.
   Without a taste, the plan lists saved tastes so a relevant reference can be selected.
   The commands below are house-mode dealers, not reference-plan overrides:

   ```bash
   node <skill>/scripts/start.mjs deal --page <kind> --trade <trade> --history .taste-skill/history.json    # palettes, pairings and the LAYOUT block (nav, footer, close, buttons, mark, bands, compositions); add --axis after a word or editorial hero
   node <skill>/scripts/layout-deal.mjs --type <page type> --has <photo,ui,film,object,setting> --history .taste-skill/layout-history.json   # the hero; a game adds --kind gaming, hardware --kind tech
   node <skill>/scripts/moments.mjs pick --page <kind> --scene deal --history .taste-skill/history.json   # every kind: 0-1 scene, two moments (--long: three)
   node <skill>/scripts/effects.mjs pick --page <kind> --palette light|dark --slots hero --history .taste-skill/history.json   # tech; a place, service or product: --slots band, quiet treatments only
   node <skill>/scripts/start.mjs css --page <kind> --palette <id> --type <id> --radius soft --history .taste-skill/history.json
   node <skill>/scripts/start.mjs brand --page place --bg "#.." --ink "#.." --accent "#.." [--surface "#.."] [--muted "#.."] --type <id> --radius soft   # the client's own colours (a logo, a painted shopfront), in place of css
   ```

   Run every command from the project folder (the deal arms the gate in the folder it runs in, or
   joins the build already open one or two folders up). Build the LAYOUT block's close, bands and
   compositions as printed (`sections.md` section 2).

   A product or hardware with no photographs deals with `--has photo` for its stand-ins;
   `--has object` only for a cut-out or a render the brief asks for (always the `product` hero, its
   widest view across the wrap, no box); a game without art files passes `--has setting` (the
   `photo` hero, its name over a stand-in of its setting; a game always passes `--has`). A product
   page is dealt only the product, photo and film heroes. A place gets the place hero in a dealt
   form (band, bleed, split, name: `data-form`). A dealt part that needs a photograph the page lacks is dealt again (`sections.md` section 2). Take the
   first palette and the first pairing printed (the next only when the first clashes with the
   client's own logo or photographs, or the pairing fails `hero-lines`, said on plan line 2); the client's own colours go through
   `start.mjs brand` instead (`sections.md` section 4, Look); never violet: deal again. Keep the `:root` block as printed. Radius: `sharp` for fintech and developer tools, `soft` by default,
   `round` for consumer apps, square on a place. On tech only: the lit ground (`<html data-ground>`:
   `sand|sky|sage`, as the plan prints it), the CSS grounds (`backgrounds.md`) and the one effect
   (`effects-usage.md`). Write every result on plan line 2 and in
   the comment at the top of `<body>`, and build exactly that (a short page drops what it has no section for: `sections.md` section 4).

5. **Build.** In `starter.html`: set `<html lang data-type data-radius data-buttons data-motion>`
   (lang: the brief's language), the three metas, the head block (title, description, og, icon,
   theme-color: `system.md`, Head) and the nav class; keep the skip link and the `m-enter` head
   line; copy only the `<section class="hero …" data-enter>` of
   `assets/layout/hero-<id>.html` (never its nav, other sections, footer or credit line; every word
   and picture becomes the client's) and set `data-enter="<the dealt entrance>"`; move the dealt close and footer out of their `<template>`s
   and delete the rest. Every section is `main > section` with
   one `.wrap`, its h2 first, `--h: 1` or `2`. Build each to its recipe with the system's classes
   and tokens; write page CSS only where a reference says page CSS (inside a visual, `--p-h`,
   `.wall`, `.rail`, `.device`). Paste UI from `assets/ui/<name>/fragment.html` and rewrite every
   name, number and logo to the client's (kit icons become `data-icon`, `cards.md`); a diagram card is `data-diagram="<preset>"`
   with the client's labels; run `icons.mjs scan index.html --out assets/icons --colour` last, so every icon
   the page names is a local file. Mount an effect, object, moment or scene exactly as its
   reference says, never from your own script. A moment's section is copied from
   `assets/moments/_demo/in-page.html` (place: photo-chapters, word-highlight) or
   `in-page-service.html` (pinned-chapters, picture-develops film); a moment's own `demo.html` shows
   it alone and is not a page model. A scene's section is copied from its `demo.html` with the
   client's words and photographs (`scenes.md`, Classic scenes). A form is the starter's `booking-form` (`system.md`,
   Forms). Credits: the one footer line from `photos.mjs credits`, once the markup uses the
   photographs (it reads the page). Copy the hero's tile from `shoot.mjs` beside the page as `share.jpg`.

6. **Check and look.** Only the skill's scripts, each running one headless Chrome with WebGL on the
   CPU, closed by its own PID, one at a time in the foreground with a 10-minute timeout; never in
   the background, a windowed browser or a browser tool.
   Each serves the page file itself over http on 127.0.0.1 (never `file://`), so no server is needed;
   for a built page whose links start at the site root (`/_astro/page.css`), pass `--root` with the build folder (`dist`).
   `--profile <dir>` is the Chrome profile: a folder of its own in the OS temp folder or in the
   project's `.taste-skill` folder (`.taste-skill/chrome-check`), never outside the project (no
   `../`); a relative one that leads out of it is replaced by `.taste-skill/chrome-<script>`. Then:

   ```bash
   node <skill>/scripts/copy-lint.mjs index.html --kind <kind> --category "<what is sold>"
   node <skill>/scripts/motion-lint.mjs index.html --kind <kind>
   node <skill>/scripts/consistency.mjs index.html --widths 1440,1024,820,768,390 --rhythm-widths 1440,820,768,390 --profile <dir> --page <kind> --category "<what is sold>" --primary "<main action>"
   node <skill>/scripts/layout-check.mjs --url index.html --profile <dir> --sizes 1440x900,1024x768,820x1180,768x1024,390x844 --shots shots/layout
   node <skill>/scripts/shoot.mjs --url index.html --w 1440 --out shots/1440.png --profile <dir>
   node <skill>/scripts/perf.mjs index.html --profile <dir>
   ```

   Shoot 1024, 820x1180, 768x1024 and 390 as well. Every `layout-check.mjs` finding fails the page (no `--no-stress`).
   copy-lint and motion-lint open no browser and take under a second. Fix every FAIL (a copy-lint WARN too, or say
   why it stays) and read the copy aloud (`copy-voice.md` section 6); shoot again and read every
   screenshot against `references/finish-checklist.md`. In the fix rounds run `consistency.mjs --quick --widths
1440,390`. Then the gate, which runs the checker at 1440 and 390 every time, walks the page at 320
   for overflow, collide and tap-size, and runs copy-lint and motion-lint, whose FAILs block like the checker's:

   ```bash
   node <skill>/scripts/taste.mjs check index.html
   ```

   Fix what it lists and run it again until its last line is `GATE: PASS` or `GATE: OPEN`, three
   rounds at most (in Claude Code it also runs when you finish; a stop before your first gate run is
   no round, and to ask the user something after a block, just stop again). When the user tells you
   to stop, or to ship the page as it is, run `taste.mjs check --done "<what they said>"` (`GATE: DONE`)
   and report the open FAILs.
   `GATE: SETUP` (no page yet, a framework's source shell, a page that is not local): arm what a
   browser can open (step 1) and run it again. `GATE: ERROR` (the checks could not run) or
   `GATE: OFF`: put the line in the report and finish; do not rerun. Never edit
   the kit's files or hide anything from the checker. A FAIL you judge false is waived in
   `.taste-skill/waivers.json` with its reason, never fixed by gaming the check (`references/gate.md`);
   a word from the client's own copy that copy-lint FAILs is waived hit by hit, the brief as the reason
   (a word inside the client's name, as the logo or the title writes it, is not counted: one WARN).

7. **Report:** the `GATE:` line and visual review status first, with the comparison artifact
   and deliberate adaptations. Say separately whether the published host was checked.
   Then every waiver with its reason and every open FAIL; the
   kind, the deal (palette and why it fits, pairing, hero, entrance, grounds, effect, moments, scene); the
   voice card in one line, the notes' "Client must supply" list and every copy-lint WARN kept, with why; the checker, layout and perf
   results; what you could not check; every assumed fact (the checker's `assumed` list) and the
   coined name's search; the form's `.example` stand-in and the canonical domain still to come; the photographs and art the client must supply, every
   stand-in frame among them (library and live search); every client slot, its file and its stand-in.

## 5. Checklist

Use `references/finish-checklist.md` when reviewing the built page.

## 6. Never

- A card, row or tile that fades in on scroll; a stock fade on every block, card or row (the
  automatic section reveal, each h2 and lead photograph once, is the kit's and allowed); parallax
  on text; scroll-jacking; random blinking.
- Stock photographs passed off as the client's product, people or place (a stand-in is listed in
  the report as one, never shown with another maker's name or logo); a product page that never
  shows the product.
- A drawn look-alike of a real logo; invented reviews, quotes, customers or figures.
- Without a recorded taste, avoid violet or lavender in the page's own design. A validated
  taste may use its recorded colors, subject to contrast checks.
- Copying a reference site's code, copy, pictures or signature effect.
- Deleting or editing the kit's own files (`assets/`, `scripts/`) to clear a check: a check that
  flags a kit file is reported, and the page is checked again after any change.
