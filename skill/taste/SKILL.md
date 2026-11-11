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
A page given a recorded taste uses `taste.mjs plan --taste <name>` in reference mode.
Follow `references/taste-contract.md` for its structured definition, precedence,
legacy compatibility and completion checks. Turning observed behavior into own kit
parts is `references/extract.md`; captured material stays in the pack. Technical PASS
alone does not establish visual quality.

Skill-local files: `./references/*`, `./scripts/*`, `./assets/*` and `./library/*` only.
Read `./references/flow-taste.md` now. References to its page-planning sections 2 and 3 are in
`./references/page-planning.md`; other flow section, step and house-rule numbers are in the flow.
Load each additional reference only when that flow names it.
