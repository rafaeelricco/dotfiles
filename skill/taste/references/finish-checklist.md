# Finish checklist

Each line names its checks: `consistency.mjs` ids in brackets, `layout-check.mjs` findings in braces,
`perf.mjs` rows. The last line is for your eyes.

- **First screen:** the hero (h1, eyebrow, lead) says what is sold, for whom or where, within five
  seconds, with one hard fact; the h1 in the form the voice card chose [copy-headline, copy-fact,
  copy-h1-category]; the hero fills it alone at every width, its main button inside it [hero-screen,
  hero-fill, fold-action, fold-cut] {hero-fold}.
- **One section per screen:** every section 1 or 2 screens, its h2 first and top-aligned, no
  neighbour's heading or picture in its tile, nothing sparse, no section half empty [section-height, one-section,
  one-heading, section-air, one-screen, section-gaps, empty-area] {screen-short, screen-height, sparse,
  neighbour, neighbour-ground}; no empty strip under or inside a section, no blank phone screen
  {empty-band, blank-screen}.
- **Equal edges:** every block on the `.wrap` lines or the grid's columns, nothing out to one side,
  no sideways scroll [container-edges, row-lines, split-pair, off-grid, right-edge, col-edge,
  spill, off-viewport, stagger, top-stagger] {edge-left, edge-right, spill, bleed-one-side,
  one-sided, lines}.
- **Every visual draws** at 1440, 1024, 768 and 390; a refused effect shows its still fallback
  [visual-empty, empty-visual, gl-fallback, shader-lint, no-visual, photo-weight].
- **No caption** explains, apologises for or labels a picture; credits in one footer line
  [visual-caption, caption, credit-wall, photo-credit]; no placeholder, sample note or printed
  `.example` address [placeholder, sample-label] {placeholder}.
- **Nothing ships broken:** no console error or failed file, system.js once as a module, every
  moment on the element its demo.html names and visible on screen {console-error, script-twice,
  script-module, moment-target, moment-hidden}.
- **The right things for the kind:** outside tech no tech-looking effect ground or print; the
  moments and scene dealt by fit, one quiet treatment at most (WebGL only for that treatment or a
  product render the brief asked for) [effect-kind, effects-fit, photo-print]; the subject itself
  shows: the product big, whole in three sections at most, a new picture each [product-shown,
  same-object, photo-repeat]; each asset the brief names in its slot; a game's name and its world as key art,
  the diff of a code-review tool, software's `app-frame`;
  real photographs where they fit, none twice [photo-set, photo-repeat, photo-upscale]; real icons in their own
  colours; flat grounds on other [grounds]; a place deals two different compositions and one type
  moment.
- **Motion:** every button, link, linked card and linked photograph visibly answers the pointer,
  nothing tilts [motion-layer, hover, hover-move, tilt]; the hero enters once on load in its dealt
  variant [hero-enter]; the section reveals run (h2 and lead photograph, once) {reveal-none}; two
  or three dealt moments, one of them moving in the first three screens [moment-none]
  {motion-visible}; card loops cycle in 2.5-4 s [loop-cycle]; nothing moves because the page
  scrolled except a dealt moment inside its own section or the dealt scene (every kind, by fit)
  [scroll-linked, scroll-reveal, pinned: expected only there]; motion-lint passes (no
  `transition: all`, no ease-in on an entrance, nothing from scale 0, no layout property animated);
  anything
  moving past 5 s has a pause button [loop-pause]; under reduced motion everything rests and nothing
  stays hidden [reduced-motion, hidden-content]; at most four live contexts [webgl].
- **Contacts** as rule 9 [street-number, postcode, coordinates, company-number, phone-number];
  Get directions only with a street, "See the area" with a district, no map link with a town only [map-link].
- **Keyboard and head:** every control named, alt on pictures, labels you can see, headings one
  level at a time, no tabindex above 0; Tab reaches the skip link first, its ring shows at once and
  never under the header; the menu button says its state; lang, title, description and share tags
  [a11y-name, img-alt, field-label, heading-order, tabindex, skip-link, focus-ring, focus-visible,
  focus-hidden, menu-toggle, lang, page-meta, share-meta].
- **One system:** one button pair, one card style, one radius scale, one link look [button-styles,
  button-shape, card-family, card-layout, link-styles]; two boxes deep at most [nesting]; one
  heading scale, its faces loaded [heading-scale, font-load]; text contrast [text-contrast,
  contrast].
- **Copy and links:** the copy notes come first (`.taste-skill/copy.md`: fact sheet, voice card,
  draft) [copy-notes]; headings name things and each says its own thing, buttons a verb and an
  object, at most two hero actions [copy-headings, copy-heading-echo, copy-buttons, copy-actions,
  action-count]; the close's heading says something new [copy-close-repeat, copy-close-ask]; one
  action twice a screen at most [action-repeat]; a heading's grey half is its own sentence [run-on];
  one fact, one wording [fact-agree]; assumed facts marked, never an open-now line from them
  [assumed, open-now]; every link lands, forms send, a confirmation only after a real send, each
  error under its own field [links, forms, form-send, form-fields]; no slop word, stock line,
  leftover or device used as a tic, a voice of its own (copy-lint's ids: copy-notes, copy-residue,
  copy-slop-word, copy-stock-phrase, copy-two-fragment, copy-virtue, ...; `copy-voice.md`).
- **Fast:** no FAIL row in `perf.mjs` (image weight, contexts, layout shift).
- **820, 768, 390 and 320:** sections on their screens [section-height]; on a phone a section is at
  least its screens and grows with what it holds, so nothing lies on anything else or under a fixed
  bar [collide]; every link and control outside running text 44px tall [tap-size] (a FAIL when
  another target is under 8px away); nothing past the screen at 320 [off-viewport], and nothing
  lies on anything else there either [collide]; the first screen ending whole or on a clear bleed [fold-card]
  (`layout-v4.md`); splits stack text first, no row half empty; one column at 390, buttons full
  width, a full-screen menu; the place action bar.
- **Your eyes:** for a recorded taste, compare normal-sized desktop and mobile crops against
  its actual reference using `references/taste-contract.md`. Assess composition, typography,
  surfaces, imagery and motion separately. Generic benchmark sites cannot replace that reference.
