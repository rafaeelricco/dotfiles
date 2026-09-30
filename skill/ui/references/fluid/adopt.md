# Adopt

Run once per project, before composing or styling. Read-only on source; its one
write is `.agents/ui.md`, which later runs read instead of repeating the pass.

## Read and check

Read `package.json`, entry CSS, root layout, and component directory listings.

- **Motion library:** `motion` or `framer-motion` present. None → the spring and
  gliding pieces need CSS or a library the user picks (`../motion/libraries.md`).
- **Reduced motion:** library present → `<MotionConfig reducedMotion="user">` at
  the root; a `prefers-reduced-motion` query does not reach its transform and
  layout animations. No library → that query. Missing → transforms ignore the
  OS setting.
- **Font:** variable with a weight axis (Inter: plus `opsz`). Without it, weight
  changes snap instead of interpolating — reflow is stopped by the hidden copy,
  not the font; bare text nodes that animate weight shove neighbours either way
  (`patterns.md` → Weight without reflow).
- **Tokens:** each duration, curve, surface, and size in use, mapped to the
  nearest tier or level in `system.md` (Motion tiers, Press, Sizes, Surfaces,
  Type, Scrollbars); mark the deliberate outliers.

## Record

Write `.agents/ui.md` at the project root. Plain markdown: tell the user they
can edit it or delete it to force a fresh pass. Files forbidden → reply instead.

```markdown
# UI record

- checked: <date>
- package.json: <relevant dependencies and versions>

## Verdicts

- motion library / reduced motion / font axes: <finding>
- token map: <existing token -> nearest tier or level>
- <new behavior asked about>: <date, wanted | declined>
- check: <a claim not verified yet, phrased as a question>

## Inventory

- <system pieces and components present; stock or locally changed>

## Advice

- [ ] <what a user sees, where, how often> -- <what it buys back>. impact H|M|L, effort S|M|L

## Done / declined

- <moved here, never deleted, so it is not raised again>
```

## Later runs

- Trust Verdicts while `package.json` is unchanged; when it changed, redo only
  the checks it touches.
- Inventory (which components exist, which are customized) is leads, not truth:
  files change without `package.json` changing. Open them before relying on it.
- Raise an open Advice item once, when a task touches what it affects.
- Record only what you saw; anything unverified goes under Verdicts as `check:`.
- Copying from `assets/`: diff against any same-named project file first and
  never overwrite local changes.
- `.agents/fluid-functionalism.md` present, no `.agents/ui.md` → carry its
  verdicts, advice, and outcomes into `.agents/ui.md`; leave the old file.

## Upgrades shortlist

2-5 items, ranked; fewer than two real candidates → say so, never pad.

- **UI only.** Infrastructure findings (unused dependencies, package manager,
  toolchain migrations, icon-set changes) go under Verdicts as facts, never
  pitched. A blocker like that may be cited only to explain an L rating.
- **Systems first:** motion tiers, gliding hover, surfaces, sizes, since one
  system lifts every surface; then components (`components.md`).
- **Write from what a user sees:** the surface, how often it is on screen, what
  goes wrong at that moment, and the quality regained. Name the file and the fix
  size last, if at all.
- **Rate** impact (high / medium / low) by traffic and by whether the code shows
  the failure; effort (S / M / L) by call sites and distance from the spec.
  Rank by impact per effort within the order above.
- **Something the app has never done is a question,** not a finding: stillness may
  be intended. Ask once, naming where it lands first and what it costs; record
  the answer (`patterns.md` → New behavior).
- **A blocked install never gates an upgrade.** Every item can be done by hand
  with the project's existing tokens; never lead with a migration nobody asked for.
