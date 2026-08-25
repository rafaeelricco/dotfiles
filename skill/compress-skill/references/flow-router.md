# Compress — router

Target is an existing skill. Grain is job-scout: a short `SKILL.md` that
loads one flow; that flow names every other `./references/*` file.

## Draft (do not write yet)

Already a router (`Read ./references/flow-*.md now` and little else) →
thin the flow files; do not invent a second router.

Else:

1. **`SKILL.md`** — keep `name` + `description`. Body is identity (one
   line), path resolve the skill already had, `Skill-local files:
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

Gone from `SKILL.md` and from the flow: missing-file STOP strings,
“Do not”, “Never X”, third-fail counters, “STOP this agent”.
The agent reports a missing input and stops; the skill does not
script the sentence.

Stay as **what the work is**, not a ban list: write-set, which URL is
source, what the verifier may see, “content not geometry”.
Mechanical facts the model cannot invent (env flags, slugify, spawn
brief) stay in the flow.

## Even-behavior (copies only)

Copy the dir aside; apply the draft only there.
Check: same description/triggers; same output headings/fields; same
write-set; `SKILL.md` loads the flow; contracts not restated in the
flow. STOPs may leave `SKILL.md` — that is the verb.
Divergence on those checks → revert that cut, list it.

## Report

1. Before/after word count per file (include the new flow).
2. Each move: quote → flow | gone because (recipe, not a STOP).
3. Untouched on purpose.
4. Even-behavior: skipped (why) | ran (identical or reverted).
