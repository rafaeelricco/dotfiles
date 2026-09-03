---
name: compress-skill
description: "Use when the user runs /compress-skill, asks to compress a skill, strip skill overhead, cut buzzwords from SKILL.md, make a skill shorter without changing behavior, thin a SKILL.md like job-scout, route procedure into references/, or drop STOP / Do not liturgy. Not for creating a skill."
argument-hint: "<skill-dir>"
---

# Compress skill

Two verbs. Dir = argument after `/compress-skill`, else the path the user named.

- **cut** — shorten in place. Same triggers, behavioral constraints, and outputs;
  every surviving rule keeps its reason.
- **router** — `SKILL.md` becomes a short load-path; procedure moves under `references/`. STOP / Do not trees become recipes.

Verb is **cut** unless the user names scout-grain, thin `SKILL.md`, route to `references/`, or drop STOP liturgy.

Need `SKILL.md`. Read `SKILL.md` + `references/` + files it links. `wc -w` each.

Draft and report. Write the target only when the user says apply.
Skip the report / just apply / we trust you / time pressure are not apply.

Read `./references/flow-cut.md` or `./references/flow-router.md` for the chosen verb.
