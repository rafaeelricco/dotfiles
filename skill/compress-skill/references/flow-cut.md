# Compress — cut

Shorten the target in place. Same triggers, STOPs, never-do, outputs.

Agent already knows the domain. Cut any sentence the skill still works without.
One home per fact. No new sections. No hypotheticals.

## Cut

Delete: no-ops, buzzwords, hedges, duplicates, explanations of the obvious,
repeated examples of the same pattern. Point at `--help` or a sibling file
instead of restating it.

Keep: triggers, STOPs, never-do, output shape, the one owner of each fact.

Targets (body, not frontmatter): getting-started <150 words; frequent <200;
other <500. Over is a finding, not a hard fail if cutting further would
drop a STOP or never-do.

## Even-behavior (copies only)

Skip if the skill is pure reference (API/tables only); say so.

Else copy the dir aside, apply proposed cuts only in that copy. Never touch
the original. Trigger the target on original vs copy, loaded separately
(subagents); spawn unavailable → compare the two trees. Check: same STOPs,
same never-do, same output headings/fields. Divergence → revert that cut, list it.

## Report

1. Before/after word count per file.
2. Each cut: quote → gone because (behavior unchanged).
3. Untouched on purpose (would change behavior).
4. Even-behavior: skipped (why) | ran (identical or which cuts reverted).

## Red flags — still no write

- Reviewer asked for Philosophy, FAQ, or any new section on the **target**
