# Extract

How a thing seen on a reference site becomes a kit part. `capture/candidates.json` names each one
with its frames, keyframes and stylesheets; `capture/` holds the site's own CSS and HTML to read.

1. **Look.** Read the candidate's frames and the rules its `evidence` names. Say in one line what
   moves, when (load, loop, hover, scroll) and why the page has it.
2. **Fits.** A kit part already does it (`moments.md`, `scenes.md`, `effects-usage.md`, `cards.md`):
   `fits:<family>/<id>`, and the id under `fits`.
3. **Variant.** A kit part does it with other numbers: an effect's declared params
   (`assets/effects/index.json`, `params`) under `variants.effects`, or a motion token of `motion.md`
   (Tokens) under `variants.motion`.
4. **Own.** Nothing matches: build it in the pack as `assets/<family>/<id>/`, in that family's
   format (the same files as a built-in: `meta.json`, its code, `demo.html`), plus `spec.md`.
   Start from the nearest built-in's folder and from the site's own rules in `capture/css/`.
   Write it as if it sat in the kit: its code imports `../fx.js` or `../lib.js`, its demo links
   `../../system.css`, exactly as the built-in does. On a page `kit-copy.mjs` puts it there; in
   the pack those paths do not resolve, so `pack.mjs check` stages the item inside the kit to load
   and shoot it (`--render`).
5. **Skip.** Not part of the look (a cookie bar, a chat widget): `skip: <why>`.

`spec.md` holds what a rebuild needs: trigger, duration, delay and easing of every step, keyframes,
scroll range in screens, the layer stack, the element structure, each state, and the capture files
it came from.

Limits for an own item: its code carries no URL of the recorded site, it rests under reduced motion
(`motion.md`), it stays within the family's budget (`pack.mjs check` prints it), and its id is not a
built-in's. `node <skill>/scripts/pack.mjs check <name>` decides done.
