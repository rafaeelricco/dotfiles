# Page

A whole marketing page (landing, company, product, place) is art direction, copy
and layout before it is components. The `taste` skill owns all three and a browser
gate that checks the result: invoke that skill and follow its run. Reading its
file is not enough, because its finish gate arms only when the skill is invoked.
This file only settles where the two skills meet.

1. **Its resolved design is the project's tokens.** The resolved taste (reference mode), or kit (house mode), ranks
   as "the project's own tokens" (SKILL.md â†’ Values), so `adopt` does not run: a
   second token set on one page is the generic look `taste` exists to prevent.
2. **Kit files and kit motion stand as shipped,** corners included. Its gate fails
   an edited kit file, and `motion/laws.md` already lets marketing move to explain
   (â†’ Gate) and run longer (â†’ Timing). The geometry rule (SKILL.md â†’ Values)
   applies only to what step 4 adds.
3. **Hand-written motion** outside the kit is a `build`: `motion/build.md`.
4. **A part the kit lacks** (a control with real state, not a section) â†’ `compose`
   or `style` for that part alone, with the kit's tokens; `shape` checks only
   that part.
5. **Completion follows taste/references/taste-contract.md.** Report technical gate status
   and visual review status separately; neither substitutes for the other.
6. **A saved taste** selects reference mode (`taste/references/taste-contract.md`): run `node <skill>/scripts/record.mjs list`, match the brief against each
   taste's `use_when`, and pass the match as `--taste <name>` (`record.md` â†’ Apply). No match: say so
   in one line and build from the kit alone.
