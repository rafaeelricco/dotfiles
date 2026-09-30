# Plan Template

Every plan the `audit` job writes follows this structure. Each plan must be complete and exact on its own, and never points elsewhere ("the audit above", "the easing we discussed").

````markdown
# NNN — <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` at the moment the plan is written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n files, rough size>

## Problem

What is wrong, where it is, and why it changes how the product feels. Cite each
location as `path/to/file.tsx:123` and quote the current code word for word:

```css
/* src/components/dropdown.css:14 — current */
.dropdown {
  transition: all 400ms ease-in;
}
```

## Target

The exact end state, with every value written out: curves, durations, spring
configs, media queries. Vague guidance like "use a nicer easing" does not qualify:

```css
/* target */
.dropdown {
  transition:
    transform 80ms var(--ease-out),
    opacity 80ms var(--ease-out);
  transform-origin: var(--transform-origin);
}
.dropdown[data-ending-style] {
  transition-duration: 60ms;
}
```

## Repo conventions to follow

How this codebase already handles it, plus one exemplar for the executor to
imitate (token names, file placement, prop patterns):

- Easing tokens are defined in `src/styles/tokens.css`; new curves go there too, like this one:

  ```css
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  ```

- <exemplar file:line that already does this correctly>

## Steps

1. <One concrete edit per step: the file, what changes, and the resulting code.>
2. …

## Boundaries

- Out of scope: <files/components>.
- Touch motion properties only; markup and structure stay as they are unless a step says otherwise.
- No new dependencies.
- If a step no longer matches the code (it drifted since the commit stamp), report the mismatch instead of improvising.

## Verification

- **Mechanical**: <exact commands (typecheck, lint, build) with the expected outcome>.
- **Feel check**: run the UI, trigger <interaction>, and confirm:
  - <a checkable observation, e.g. "the dropdown grows from its trigger, not from center">
  - <e.g. "hammering the toggle never restarts the animation from zero">
  - In DevTools (Animations panel), slow playback to 10% and confirm <detail>.
  - Turn on `prefers-reduced-motion` (Rendering panel) and confirm the movement disappears while the opacity feedback stays.
- **Done when**: <completion criteria a machine or an eye can check>.
````

## Notes for the plan author

- Write one plan per finding. Two findings may share a plan only when they touch the same files with the same fix pattern (for example, one easing-token swap across several components).
- Take every value from `laws.md` (limits) and `../fluid/system.md` (web tokens).
- When plans are written, also create or update `<plan dir>/README.md`, in whichever directory the plans went (`plans/`, or `animation-plans/` when `plans/` was taken). It lists each plan's number, title, severity, and status, gives the recommended order, and notes any dependencies.
