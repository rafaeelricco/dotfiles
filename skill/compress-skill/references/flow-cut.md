# Compress — cut

Shorten the target in place. Preserve its triggers, behavioral constraints, and outputs.

Cut what the agent already knows: general domain knowledge, restated defaults,
and sentences the skill still works without. A rule keeps the reason beside it;
a rule without its reason gets applied where it does not fit.
One home per fact. No new sections. No hypotheticals.

## Cut

Delete: no-ops, buzzwords, hedges, duplicates, explanations of the obvious,
repeated examples of the same pattern, and bans on an output style that carry
no reason and encode no product constraint — state the wanted behavior once,
positively. Point at `--help` or a sibling file instead of restating it.

Keep: triggers, every behavioral constraint and scope restriction — including
fragile-operation gates such as destructive commands, approvals, and auth —
output shape, the reason beside each rule, and the one owner of each fact.

Word count is a measurement, not a target: report before/after, and justify
every cut by what it removes, never by length.

## Even-behavior (copies only)

Skip if the skill is pure reference (API/tables only); say so.

Else copy the dir aside, apply proposed cuts only in that copy. Never touch
the original. Trigger the target on original vs copy, loaded separately
(subagents); spawn unavailable → compare the two trees. Compare semantic
behavior, not wording: same triggers, every behavioral constraint and scope
restriction (including any removed from the candidate copy), same output
headings/fields, and the reason beside each surviving rule. A negative rule may
become positive only when its constraint and reason survive. Divergence → revert
that cut, list it.

## Report

1. Before/after word count per file.
2. Each cut: quote → gone because (behavior unchanged).
3. Untouched on purpose (would change behavior).
4. Even-behavior: skipped (why) | ran (identical or which cuts reverted).

## Red flags — still no write

- Reviewer asked for Philosophy, FAQ, or any new section on the **target**
