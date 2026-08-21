---
name: compress-skill
description: "Use when the user runs /compress-skill, asks to compress a skill, strip skill overhead, cut buzzwords from SKILL.md, or make a skill shorter without changing behavior. Not for creating a skill."
argument-hint: "<skill-dir>"
---

# Compress skill

Shorten an existing skill. Same triggers, STOPs, never-do, outputs.

Agent already knows the domain. Cut any sentence the skill still works without.
One home per fact. No new sections. No hypotheticals.

## Input

Dir = argument after `/compress-skill`, else the path the user named.
Need `SKILL.md`. Missing → STOP.
Read `SKILL.md` + `references/` only. `wc -w` each file.

Never write the target dir until the user says apply.

## Cut

Delete: no-ops, buzzwords, hedges, duplicates, explanations of the obvious,
repeated examples of the same pattern. Point at `--help` or a sibling file
instead of restating it.

Keep: triggers, STOPs, never-do, output shape, the one owner of each fact.

Targets (body, not frontmatter): getting-started <150 words; frequent <200;
other <500. Over is a finding, not a hard fail if cutting further would
drop a STOP or never-do.

## Even-behavior (copies only, before STOP)

Skip if the skill is pure reference (API/tables only); say so.

Else copy the dir aside, apply proposed cuts only in that copy. Never touch
the original. Same user prompt on original vs copy (subagents, or a local
compare if spawn is unavailable). Check: same STOPs, same never-do, same
output headings/fields. Divergence → revert that cut, list it.

## Report (before any write to the target)

1. Before/after word count per file.
2. Each cut: quote → gone because (behavior unchanged).
3. Untouched on purpose (would change behavior).
4. Even-behavior: skipped (why) | ran (identical or which cuts reverted).

Then STOP. Write the target only when the user says apply.

## Red flags — still STOP, still no write

- Partner said skip the report / just apply / we trust you
- Time pressure, review tomorrow, "the skill is overkill"
- Reviewer asked for Philosophy, FAQ, or any new section
