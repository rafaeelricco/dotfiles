# Recorded taste contract

## Precedence and build modes

The brief and required behavior apply in both modes. `start.mjs plan` uses house mode
without a taste and reference mode with a version 2 `--taste NAME`. A legacy taste
without an explicit mode uses its original dealer and gate behavior. `--mode house|reference`
can make the choice explicit; house plus a taste, reference without a taste, and explicit
reference mode with a legacy taste are errors. House mode retains the kit's dealers and history. Reference mode compiles reviewed
choices from a version 2 definition; it never fills gaps from house pools or history.
Accessibility, resource loading, keyboard use, reduced-motion support, overflow and
collision checks remain mandatory. Unknown checker findings remain blocking.

## One definition

For new packs, `taste.json` with `schemaVersion: 2` owns the design. Raw observations
stay in `capture/`; `design-system.txt` is a generated guide, never compiler input.
Edit the definition and regenerate the guide with `record.mjs guide NAME`.
The checked-in example is `tests/fixtures/taste_v2/sample/taste.json` in the dotfiles
repository; the validator in `scripts/taste-definition.mjs` owns the field schema.

- `tokens` holds colors by scheme, typography, surfaces and dimensions. Null means
  unresolved, not permission to substitute a house value.
- `fonts` holds explicit font sources and fallbacks. Compare substitute faces with
  reference crops. CSS and head generation do not probe the network or choose fonts.
- `guidance` holds character, usage, composition and deliberate adaptations.
- `evidence` links reviewed fields to capture or screenshot sources and explains
  corrections. Preserve original observations; correct the capture bug too.
- Existing `use_when`, `fits`, `variants`, `signature` and `settled` keep their roles.

Review typography, controls, surfaces, container width and mobile behavior against
crops. Generated CSS and the kit head use the same resolved values. A required
unresolved value fails output with its field path; do not patch generated CSS to hide it.

Legacy packs without a schema version keep their Markdown export and correction
path. Legacy builds and plans keep legacy validation and dealing; new version 2 reference
plans require a version 2 definition. There is no automatic migration or rewrite of a saved pack.
Invalid JSON or an unsupported version is an error, never a Markdown fallback.

## Layout and motion

Keep the existing layout choice lists and motion fields. A reference plan takes the
first compatible permitted choice, preserving ordered compositions and repetitions.
Missing required layout or hero choices fail before build state is written. Unsupported
parts need an own component or a reported capability gap; there is no wider catalogue
fallback. Optional unrecorded decoration is absent. Empty bands, zero moments and
still entrances are valid. Signature parts remain required.

For an own nav/footer/close, use `components/ID` in its choice list and include that
part in `signature`. Own parts retain their match evidence and functional checks.
The definition's evidence records why its layout and motion choices fit the reference.

The resolved plan is saved in `.taste-skill/deal.json` with its mode and definition
fingerprint. Apply its printed HTML attributes and parts. Change the definition and
replan when the design changes; do not rerun a house dealer against a reference build.
The gate checks the persisted contract. House aesthetic preferences are advisory for
reference builds; technical failures and reference-contract violations still block.
Version 2 builds do not use a Markdown Kit overrides table.

## Visual review

After technical checks, compare hero, middle and close at 1440x900 and 390x844
against reference crops at normal viewing size. Inspect hover, focus and reduced
motion. Compare hierarchy, composition, surfaces, imagery and motion independently.
Do not copy the reference's text, branding or licensed assets into the new page.
Record deliberate adaptations (including accessible colors and substitute fonts).

Save .taste-skill/visual-review.json with status reviewed, buildHash, packHash,
states {hover, focus, reducedMotion} containing observations, and comparisons.
Each comparison has region (hero/middle/close), viewport, reference, referenceHash,
actual, actualHash, notes {composition, typography, surfaces, imagery, motion},
findings [{severity: major/minor, status: open/resolved, description}], and adaptations.
Image paths are relative to the pack (reference) or project (actual). Keep build
shots under shots/; review files and build shots are excluded from the build digest.
The validator checks evidence and freshness, not aesthetic quality.

Use node <skill>/scripts/visual-review.mjs hashes --project DIR --pack PACK to
obtain current digests; image --project DIR --pack PACK --file PATH prints an
image digest (add --reference for a pack image). check with the same directories
validates the completed record. Never mark a review done without viewing the images.
The gate checks review freshness even when it reuses technical results. Legacy
packs remain readable but their new builds also require visual review.

## Completion

Technical PASS and visual REVIEWED are both required. Report unresolved issues
and whether the published host was actually checked; local success is not proof
that an artifact host loads modules, fonts, images or WebGL correctly.
