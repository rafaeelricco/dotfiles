---
name: taste
description: >-
  Builds and reviews finished company websites (software, product, service, place or game sites)
  from a starter kit: copy from a fact sheet and a voice card, one section per screen, real
  photographs and product UI, motion dealt by fit, and a finish gate run in a real browser. Use when
  building, redesigning, polishing or reviewing such a page, as static HTML or inside an existing
  framework project, or when the user says a page looks generic, templated or "AI-made".
hooks:
  Stop:
    - hooks:
        - type: command
          command: 'for f in ${CLAUDE_SKILL_DIR:+"$CLAUDE_SKILL_DIR/scripts/gate.mjs"} ${CLAUDE_PLUGIN_ROOT:+"$CLAUDE_PLUGIN_ROOT/scripts/gate.mjs" "$CLAUDE_PLUGIN_ROOT/skills/taste-skill/scripts/gate.mjs"} ${HOME:+"$HOME/.claude/skills/taste/scripts/gate.mjs" "$HOME/.agents/skills/taste/scripts/gate.mjs"}; do if [ -f "$f" ]; then exec node "$f" --hook claude; fi; done; if [ -d .taste-skill ]; then printf "%s gate.mjs not found; CLAUDE_SKILL_DIR=%s CLAUDE_PLUGIN_ROOT=%s CLAUDE_PROJECT_DIR=%s HOME=%s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${CLAUDE_SKILL_DIR-}" "${CLAUDE_PLUGIN_ROOT-}" "${CLAUDE_PROJECT_DIR-}" "${HOME-}" > .taste-skill/gate-hook-missing.txt 2>/dev/null; fi; for d in .taste-skill */.taste-skill; do if [ -f "$d/build.json" ]; then echo "tasteskill gate: gate.mjs not found (CLAUDE_PLUGIN_ROOT=${CLAUDE_PLUGIN_ROOT-}); the build in $d is not checked" >&2; break; fi; done; exit 0'
          timeout: 600
---

# Taste

Build the website a good company would ship: it says plainly what is sold, shows the real thing on
every screen, and looks made for this client, not from a template and not like an art piece.
figma.com and x.ai are the bar (in words: `layout-v4.md` section 1).

`<skill>` is this folder. It needs Node 22+ and Chrome, Edge or Chromium; the scripts also find a Playwright Chromium,
and `CHROME_PATH` names any other (ffmpeg optional).

**A brief that points at a site to follow** ("like this site", "replicate its taste") is first the `ui`
skill's `record` job: invoke `ui` with it, then build here only if a page with this kit is what is asked.
A page given a recorded taste is dealt with `--taste <name>`: the pack's own parts and signature items
are dealt, and the taste's head block (`ui` → `record.md`, Apply) replaces the dealt palette, pairing
and radius. Turning what a site does into kit parts is `references/extract.md`; nothing captured is
written inside this skill. That block carries the taste's faces (a face kept for the h1 alone
stays on the h1), type sizes, button height and button shadow; never set them back to the kit's. The
taste's Usage rules, Composition and Signature win over this skill's look rules: the font list
(`layout-v4.md` §5), the accent as the only filled button and flat buttons (`system.md`), the fixed
type scale, tracked capitals, light or dark bands, centred blocks and a nav button. A kit check that a
taste breaks on purpose is listed in the taste's Kit overrides (`references/gate.md`, Taste overrides),
never waived page by page. Everything else here holds: one section per screen, equal edges, contrast,
the copy rules and the gate.

Skill-local files: `./references/*`, `./scripts/*`, `./assets/*` and `./library/*` only.
Read `./references/flow-taste.md` now. A section, step or house-rule number cited as `SKILL.md`'s,
in a reference or in a script's output, is in that file.
Load each additional reference only when that flow names it.
