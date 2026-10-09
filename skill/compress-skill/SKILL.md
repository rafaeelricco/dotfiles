---
name: compress-skill
description: "Audit a skill for instructions that no longer fit, shorten it, and turn its SKILL.md into a short router over references/, without changing its behavior. Any step alone on request (audit | cut | router)."
argument-hint: "<skill-dir>"
disable-model-invocation: true
---

# Compress skill

Three verbs, run together by default. Dir = argument after `/compress-skill`, else the path the user named.

- **audit** — find instructions that no longer fit the target model, the repo, or each other. Edits nothing.
- **cut** — shorten in place. Same triggers, behavioral constraints, and outputs;
  every surviving rule keeps its reason.
- **router** — `SKILL.md` becomes a short load-path; procedure moves under `references/`. STOP / Do not trees become recipes.

Default is **audit, then cut, then router**: the audit's findings are cut's first cuts, and cut catches
what the audit does not target. Cutting first leaves router less to move, and it doesn't re-judge
what cut already kept. Cut and router run on one copy. Router drafts from the cut copy, not the original.
Even-behavior runs once: the original against the final copy, using cut's and router's checks. One report
that holds every run flow's sections, with word counts from original to final.

Run one verb alone only when the user names it: **audit** ("just audit", "what's stale"), **cut** ("just cut", "shorten only"), or
**router** (scout-grain, thin `SKILL.md`, route to `references/`, drop STOP liturgy, "no cuts").

Need `SKILL.md`. Read `SKILL.md` + `references/` + files it links. `wc -w` each.

Draft and report by default. An explicit request to apply, including “just apply,”
authorizes writing the target. Trust or time pressure alone does not.

Read each verb's flow when that verb starts: `./references/flow-audit.md`, `./references/flow-cut.md`, `./references/flow-router.md`.
