# Extract

How a thing seen on a reference site becomes a kit part. `capture/candidates.json` names each one
with its frames, keyframes and stylesheets; `capture/` holds the site's own CSS and HTML to read.

1. **Look.** Read the candidate's frames and the rules its `evidence` names. Say in one line what
   moves, when (load, loop, hover, scroll) and why the page has it.
2. **Fits.** Render the proposed part beside the reference crop at matched size. Compare
   silhouette, chrome, surfaces, type and interaction states. A matching name or purpose is
   insufficient. Set `reviewVersion: 1` and `matchEvidence[candidateId]` with `reference`,
   `actual` (pack-relative image paths) and `notes`, then `fits:<family>/<id>`.
3. **Variant.** A kit part does it with other numbers: an effect's declared params
   (`assets/effects/index.json`, `params`) under `variants.effects`, its colours as
   `variants.effects.<id>.palette` (`bg`, `surface`, `ink`, `muted`, `accent`, `accentInk`, hex; the page mounts
   them as `data-fx-palette`), or a motion token of `motion.md` (Tokens) under `variants.motion`.
   A `fits:` item is also listed under `fits.<family>` or `signature`, and a `variant:` item under
   `variants.effects`: a dealer reads those lists, never `settled`. A retired kit item is never a fit.
4. **Own.** Nothing matches: build it in the pack as `assets/<family>/<id>/`, in that family's
   format (the same files as a built-in: `meta.json`, its code, `demo.html`), plus `spec.md`.
   Start from the nearest built-in's folder and from the site's own rules in `capture/css/`.
   Write it as if it sat in the kit: its code imports `../fx.js` or `../lib.js`, its demo links
   `../../system.css`, exactly as the built-in does. On a page `kit-copy.mjs` puts it there; in
   the pack those paths do not resolve, so `pack.mjs check` stages the item inside the kit to load
   and shoot it (`--render`).
5. **Skip.** Not part of the look (a cookie bar, a chat widget): `skip: <why>`. A defining
   navigation, frame, ground or selection treatment cannot be skipped because the kit lacks
   it. Build an own component, include it in the signature and mount it visibly.

The hero is no candidate: name in `taste.json` → `heroes` the ids of `assets/layout/heroes.json` that
open a page as the recorded one does (the taste file's Composition, Hero line: a centred hero is
`centred`). `start.mjs plan --taste` deals among them, and as usual when none fits the page type and
what the brief has; `pack.mjs check` refuses an id heroes.json does not hold. A `signature` holds a
scene or an effect, never both: the big scene is the page's one effect, so the plan deals no scene
beside a signature effect.

`spec.md` holds what a rebuild needs: trigger, duration, delay and easing of every step, keyframes,
scroll range in screens, the layer stack, the element structure, each state, and the capture files
it came from.

Limits for an own item: its code carries no URL of the recorded site, it rests under reduced motion
(`motion.md`), it stays within the family's budget (`pack.mjs check` prints it), and its id is not a
built-in's. `node <skill>/scripts/taste.mjs pack check <name>` decides done.
