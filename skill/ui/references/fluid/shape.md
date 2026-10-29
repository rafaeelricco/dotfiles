# Shape

Checks that nested rounded surfaces follow `system.md` → Surfaces (concentric
corners). Run it as the last step of `compose` and `style`, and on its own when
asked to audit corners.

## Measure in the browser

Static CSS cannot tell which surface sits inside which: padding, radius and
nesting live in different files and components. Measure the rendered page.

1. Open the page in a browser the session can drive and evaluate
   `../../assets/radius-audit.js`. It returns one row per nested pair whose
   radius is more than 2px off, with the corner, outer radius, gap, actual and
   expected values; `latent` marks a surface that only fills on hover or
   selection.
2. Run it in every state the change can show: each route or screen, every menu,
   popover, dialog and sheet open, selected and disabled rows, and a phone
   width.
3. States the browser cannot reach (no backend, no data): read the component's
   CSS and markup, and work out the gap from the parent's border and padding.

## Report

- Group rows by kind: mismatch; inner larger than outer; an exception from
  `system.md` → Surfaces (large gap, uneven gaps), judged by eye.
- Each mismatch names the child and parent selectors with file:line, and the fix
  as the parent's `--outer-radius`/`--inset` plus the child's calc().
- `compose` and `style` fix their own mismatches before finishing. A standalone
  audit reports first and fixes only what the user approves.
