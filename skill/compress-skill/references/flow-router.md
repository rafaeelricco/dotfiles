# Compress — router

Target is an existing skill. Grain is job-scout: a short `SKILL.md` that
loads one flow; that flow names every other `./references/*` file.

## Draft (do not write yet)

Already a router (`Read ./references/flow-*.md now` and little else) →
thin the flow files; do not invent a second router.

Else:

1. **`SKILL.md`** — keep `name`, `description`, and existing optional frontmatter.
   Body is identity (one line), path resolve the skill already had, `Skill-local files:
./references/* only.`, `Read ./references/flow-{stem}.md now.`,
   `Load each additional reference only when that flow names it.`
   `{stem}` = existing `flow-*.md` if there is one; else the skill name.
   No STOP tree here.

2. **`references/flow-{stem}.md`** — the procedure as recipes: sequence,
   non-obvious mechanics, output shape, write-set. Create the file when
   missing. Move lookup, compile, spawn, templates. Do not copy a Fact
   table, verifier check list, or worker brief that already lives in a
   contract/worker file.

3. **Contracts / workers** — unchanged role. Do not dump the old STOP
   tree into them.

## Strip

Remove scripted STOP wording and redundant bans only when their behavioral
constraints survive. Preserve retry limits, stopping conditions, authorization
gates, and scope restrictions in the flow. The agent reports a missing input
and stops; the skill need not script the sentence.

Stay as **what the work is**, not a ban list: write-set, which URL is
source, what the verifier may see, “content not geometry”.
Mechanical facts the model cannot invent (env flags, slugify, spawn
brief) stay in the flow.

## Even-behavior (copies only)

Copy the dir aside; apply the draft only there.
Check: same frontmatter/triggers; same behavioral constraints, including retry
limits, stopping conditions, and authorization gates; same output headings/fields
and write-set; `SKILL.md` loads the flow; contracts not restated in the flow.
STOP wording may leave `SKILL.md`; its constraints must survive.
Divergence on those checks → revert that cut, list it.

## Report

1. Before/after word count per file (include the new flow).
2. Each move: quote → flow | gone because (recipe, not a STOP).
3. Untouched on purpose.
4. Even-behavior: skipped (why) | ran (identical or reverted).
