# Build

Start from `laws.md`. Web work (a browser UI) also reads `web.md` and `../fluid/system.md`; other media (video, native) use `laws.md` alone, and the `web.md` pointers in steps 3, 4, 6 and 7 become the medium's own tool, properties and accessibility settings. Settle 1 and 2 before anything else; 3–7 are a checklist, not a sequence. Make one call on each point and give the reason in a line, rather than offering a menu of motion options.

1. Gate — if the idea fails it, say so, suggest the non-motion alternative, and stop.
2. Purpose — pick the one purpose from `laws.md` → Gate that it serves. None fits → stop.
3. Tool — the first rung that fits in `web.md` → Tool. A component that doesn't exist yet (toast, drawer, ⌘K, dropdown) → hand off to `compose`; animating an existing one stays here, with its behavior spec from `../fluid/components.md`.
4. Properties — only what `web.md` → Properties allows.
5. Curve, duration, spring — curves per `laws.md` → Easing, timing per `laws.md` → Timing and, on the web, `../fluid/system.md` → Motion tiers, springs per `laws.md` → Springs. Use the repo's own tokens when it has them.
6. Interruption and exit — transitions for rapid-fire triggers and springs for gestures (`web.md` → Interruption); exit along the entry path (`laws.md` → Physicality); holds per `laws.md` → Timing.
7. Accessibility ships in the same edit (`web.md` → Accessibility).

A matching recipe → start from `recipes.md`.

Write the code, then close with a brief recap: the gate result, the ingredients used, and what to feel-check.
