# Page planning

## 2. The page plan by kind

The full plans, deal lists and section order: `references/sections.md`.

- **Place** (a cafe, bakery, guesthouse, shop). Photographs lead: 12 to 20 on the full page, 8 to
  12 compact, under 8 frames the 3-screen short page, whatever the trade; no client photographs:
  the draft path and a live search (`photos.md`), then count; the palette dealt by trade. The hero
  a photograph whenever a frame fits (a remote place: its region's landscape), the visit block on
  screen two, the offer, the place, orders or booking.
  **Variety** (`sections.md` section 4): the place hero in its dealt form (band, bleed, split,
  name), the offer and the place in different dealt compositions, never two sections round one
  picture; one type moment (the address or name set large); one main action a screen; list text
  16px. Flat grounds with one or two dealt bands, square photographs, one button style, the phone
  bar, the dealt moments and scene, loops inside card visuals; no shader ground, fragment, diagram
  or tab (one quiet treatment at most).
- **Product and service** (site-kind other). Photographs lead: the product, the people, the rooms,
  the work, two or more a screen on a product page. Real icons for the tools a studio uses; one
  still diagram at most; flat grounds and the dealt bands. No tech-looking shader ground, print or
  gradient; the dealt moments, a scene where one fits, loops inside card visuals and at most one
  quiet treatment (`effects-usage.md`); WebGL only for that treatment or a product render the brief
  asks for. **A
  physical product with no photographs is shown in photographs:** stand-ins of the same kind of
  thing from `photos.mjs search`, each listed in the report, on the full product page; a render
  (`assets/objects/product-render`, stills) only when the brief asks for 3D or a render; never a
  drawing, mood stock or a set of props (`sections.md`, Product).
- **Every product page** (photographed, in stand-ins or rendered on a 3D ask, hardware too; the bar is Figure and 1X;
  `sections.md`, Product): the product **big** where it stands
  whole (most of its frame, or on the ground at anchor scale), never mid-size in a grey rounded
  panel on a grey ground; **a different picture each section**, never one view twice; **every headline promise pictured** (a family bike shows the child bench); dealt
  compositions, no structure twice, one contrasting ground; the **swatch changes the picture**,
  every colour shown once; **no fact twice**; buttons step and press (rule 5).
- **Tech** (software, gaming, hardware). The client's own subject leads at true size. Software: its
  own UI as live HTML showing what it works on (a code-review tool: a red and green diff with its
  Accept action) in one `app-frame`, never a generic dashboard or only fragments on panels; cards:
  fragments on lit panels, pulsing diagrams, real icons. Hardware: its photographs, else stand-in
  photographs of its kind (a render only when the brief asks for 3D), never a split hero of only
  an order form or a drawn SVG. A game: its name in the h1, a launch line, its world as full-bleed
  key art (else its name set large over stand-in photographs of its setting), an effect never in
  its place (`sections.md`, Gaming). **60 to 80 words a screen** outside UI mocks (`copy.md`). By
  deal: **one effect** (a shader ground in the hero or the one `[data-visual]` frame, a WebGL
  part, an object or one big scene) and **two or three moments** in their own sections; four live
  WebGL contexts at most; no card moves with the scroll (`effects-usage.md`).
- **One object never carries the page.** The product or hero object whole leads the hero and **two more sections at
  most**; another kind of visual the brief supports carries the rest (`sections.md` section 1,
  its table): a game's world and crew; hardware's use at the bench, its parts close up; a still
  diagram card, a type moment, a context photograph where the trade allows.
- **The client's own assets get slots.** A trailer, key art, screenshots, CAD renders or a motion
  video the brief names each get a frame that reads finished now (a real `<video>` with a stand-in
  poster, a play control only when there is a page or file to play, three to five stand-in
  photographs of the world, a CAD frame), named in a comment for the client's file, never empty
  (`sections-library.md`, client-slots).

## 3. What serves which page

Open the reference of every asset family the page uses first. A dash means never.

| Need                                                                                 | Asset                                     | Software, gaming                                               | Hardware                              | Product, service                      | Place                                | Reference                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------ | ------------------------------------ |
| Heights, edges, heroes, type                                                         | `system.css`, `assets/layout`             | dealt hero                                                     | dealt hero                            | dealt hero                            | place hero (dealt form)              | `layout-v4.md`                       |
| Sections and recipes                                                                 | `starter.html`                            | its plan                                                       | product plan                          | its plan                              | place plan                           | `sections.md`, `sections-library.md` |
| Tokens, grid, buttons, nav, footer, colour                                           | `system.css`, `system.js`                 | yes                                                            | yes                                   | yes                                   | place tokens                         | `system.md`                          |
| Forms, keyboard, head and share tags                                                 | `starter.html`, `system.css`, `system.js` | yes                                                            | yes                                   | yes                                   | yes                                  | `system.md`                          |
| Copy, contacts, credits                                                              | `scripts/copy-lint.mjs`                   | yes                                                            | yes                                   | yes                                   | yes                                  | `copy.md`, `copy-voice.md`           |
| Hero entrance (dealt from the deck), section reveals, hover, press, focus, nav, tabs | `assets/motion`                           | yes                                                            | yes                                   | yes                                   | yes                                  | `motion.md`                          |
| Loops inside card visuals                                                            | `assets/motion`, `assets/ui`              | yes                                                            | yes                                   | in card visuals                       | in card visuals                      | `motion.md`, `cards.md`              |
| A count                                                                              | `assets/motion`                           | the hero's one count                                           | the hero's one count                  | `counter-rolls` when dealt            | `counter-rolls` when dealt           | `motion.md`                          |
| Photographs                                                                          | `scripts/photos.mjs`                      | people, customers; a game's art, else stand-ins of its setting | lead                                  | lead                                  | lead, 12-20                          | `photos.md`                          |
| Real tool, app and file icons                                                        | `scripts/icons.mjs`                       | yes                                                            | yes                                   | tools really used                     | -                                    | `icons.md`                           |
| Feature cards, UI fragments                                                          | `assets/ui`                               | lead (gaming: none)                                            | its app                               | an app the client runs                | -                                    | `cards.md`                           |
| Diagram cards (hub, lanes, pulses)                                                   | `assets/diagrams`                         | 0-2, pulsing                                                   | 0-2, pulsing                          | 0-1, still                            | -                                    | `diagrams.md`                        |
| CSS grounds                                                                          | `assets/backgrounds`                      | 0-2 dealt                                                      | 0-2 dealt                             | flat tokens                           | flat tokens                          | `backgrounds.md`                     |
| Shader grounds and treatments                                                        | `assets/effects`                          | the one effect                                                 | the one effect                        | one quiet treatment at most           | one quiet treatment at most          | `effects-usage.md`                   |
| Creative parts (`fx-*`)                                                              | `assets/components`                       | yes                                                            | yes                                   | `fx-photo` plain, `fx-map` still      | `fx-map` still                       | `effects-creative.md`                |
| Objects and prints                                                                   | `assets/objects` (house pack)             | one, as the effect; a render when the brief asks for 3D        | its render when the brief asks for 3D | its render when the brief asks for 3D | -                                    | `effects-objects.md`                 |
| Award-site moments                                                                   | `assets/moments`                          | 2-3, any intensity                                             | 2-3, any intensity                    | 2-3 by fit (bold on product)          | 2-3, warm, quiet or lively           | `moments.md`                         |
| Big scenes                                                                           | `assets/scenes`                           | 0-1                                                            | 0-1                                   | 0-1 by fit, no WebGL                  | 0-1, warm, quiet or lively, no WebGL | `scenes.md`                          |
| Speed and weight                                                                     | `scripts/perf.mjs`                        | yes                                                            | yes                                   | yes                                   | yes                                  | `perf.md`                            |

Read `copy.md`, `copy-voice.md`, `system.md`, `layout-v4.md` and `sections.md` in full before the first page.
