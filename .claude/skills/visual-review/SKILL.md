---
name: visual-review
description: >-
  Produce an interactive, self-contained HTML code review from a git diff. Use
  when the user asks to visual-review, /visual-review, review this diff/branch/PR
  as a visual report, make an interactive code review, or wants review findings
  as a browsable HTML dashboard instead of inline text. Grounds itself in the
  repo's own conventions first, then runs a multi-lens parallel review with
  adversarial verification, and writes an annotatable .html dashboard that
  auto-opens. Read-only on source — only writes the .html artifact.
---

# Visual Review

Turn a git diff into a **findings-first interactive HTML dashboard**: severity
summary on top, findings ranked most-severe-first, each carrying the offending
diff hunk, a render-only suggested-fix diff, a concrete failure scenario, and a
lightweight wireframe when it touches UI.

Net-new skill. Borrows *discipline* from Builder.io's visual-plan / visual-recap
(findings-first shape, grounding rule, secret redaction) but is fully
self-contained: no Plan MCP, output is one local `.html` file.

`SKILL_DIR` below means the absolute base directory of this skill (printed when
the skill launches). `SCRATCH` means the session scratchpad directory.

## Core rules

- **Read-only on source.** Never edit reviewed code. The skill writes only the
  `.html` artifact and one `.gitignore` line. Suggested fixes are rendered as
  diffs, never applied.
- **Grounding (true by construction).** Every diff hunk, `file:line` anchor, and
  file-tree entry is built mechanically from real changed lines. Never invent. If
  the diff lacks a fact, omit it — a confidently wrong finding is dangerous
  because the reviewer trusts the dashboard and skips the line.
- **Judge against repo convention, not generic ideals.** Use the Step 0 context
  brief: a reuse/simplification finding must cite the existing symbol it
  duplicates; never flag an intentional, documented convention as a defect.
- **Redact secrets.** Any credential-looking literal (keys, tokens, `.env`
  values) in a hunk is redacted (`sk-•••`) before it reaches the JSON/HTML.
- **Maximum rigor, always.** No effort flag. Every review agent runs
  `effort: 'xhigh'`. Token cost is not a constraint; accuracy is.

## Step 0 — Ground the review in the repo (FIRST, before any finding)

a. Resolve the target and capture the diff (cheap, read-only). Run from the repo
   root and write the artifacts into `SCRATCH`:

   ```bash
   BASE=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main)
   HEAD_SHA=$(git rev-parse --short HEAD)
   BRANCH=$(git rev-parse --abbrev-ref HEAD)
   git diff "$BASE"...HEAD > "$SCRATCH/diff.patch"
   git diff --name-status "$BASE"...HEAD > "$SCRATCH/files.txt"
   ```

   Argument forms (`$ARGUMENTS`):
   - *(none)* → current branch vs its merge-base with the default branch (above).
   - `<PR#>` → capture the PR diff and accurate metadata (no working-tree mutation):

         gh pr diff <PR#> > "$SCRATCH/diff.patch"
         gh pr diff <PR#> --name-only > "$SCRATCH/files.txt"
         BRANCH=pr-<PR#>
         BASE=$(gh pr view <PR#> --json baseRefName --jq .baseRefName)
         HEAD_SHA=$(gh pr view <PR#> --json headRefOid --jq .headRefOid | cut -c1-7)

     The file-tree's change flags are derived from `diff.patch`, so the bare `--name-only`
     list is sufficient.
   - `<A>..<B>` or `<A>...<B>` → use that range in place of `"$BASE"...HEAD`.

   If `diff.patch` is empty, stop and tell the user there is nothing to review.

b. **Fan out read-only Explore sub-agents IN PARALLEL** (single message, multiple
   Agent calls, `subagent_type: "Explore"`) to map the project. Scale to the
   changed scope: ~2 agents for a small/familiar diff, up to ~6 for a large or
   unfamiliar one. Give each agent ONE distinct question and the changed-file
   list; require concrete answers with `file:line` references:

   - **Stack & tooling** — languages, frameworks, build/test/lint/format configs.
   - **Conventions** — naming, error-handling, functional/type-safety idioms, and
     the module boundaries actually used in the changed areas.
   - **Reusable utilities near the changed files** — existing helpers/abstractions
     a change might duplicate, so reuse findings can cite a real symbol.
   - **Test conventions** — framework, where tests live, patterns for the changed areas.
   - **Project rules & skills** — `CLAUDE.md`, lint configs, `.claude/skills/`,
     contributing docs — standards the review must respect, not violate.

c. Synthesize the agents' results into a compact **context brief** and write it to
   `"$SCRATCH/context.json"`:

   ```json
   {
     "stack": "…",
     "conventions": ["…"],
     "reusable_utilities": [{ "symbol": "…", "file": "…", "line": 0, "use": "…" }],
     "test_conventions": "…",
     "project_rules": ["…"]
   }
   ```

   This brief is the lens for every finding and every verifier.

## Step 1 — Run the review Workflow

Invoke the Workflow tool with the shipped script (deterministic — do not
re-author it). This requires the multi-agent orchestration that a slash-command
skill is permitted to trigger:

```js
Workflow({
  scriptPath: "SKILL_DIR/references/workflow.js",
  args: {
    diffPath:    "SCRATCH/diff.patch",
    filesPath:   "SCRATCH/files.txt",
    contextPath: "SCRATCH/context.json",
    base:   BASE,
    head:   HEAD_SHA,
    branch: BRANCH,
    repoRoot: "<repo root absolute path>"
  }
})
```

(Substitute the real absolute paths for `SKILL_DIR`, `SCRATCH`, and the values
captured in Step 0.)

The script runs one finder per lens (correctness, security, performance,
simplification, api-contract, tests), each reading the context brief; dedups by
`file:line:category`; then runs a **3-skeptic refute-majority** verify per
finding (survives only if ≥2 of 3 fail to refute). UI-touching findings carry
grounded `wireframe_html`. All agents run at `xhigh`. It returns a single JSON
object: `{ verdict, summary, fileTree, findings[] }`.

> Concurrency reality: a workflow runs ~16 agents at once and queues the rest.
> Many findings → verify tasks queue through those slots. Accuracy is unaffected;
> only wall-clock grows. This is the honest meaning of "up to ~50 validations".

## Step 2 — Render the HTML

Write the Workflow's returned JSON to `"$SCRATCH/findings.json"` (exactly the
object the workflow returned), then render and gitignore the output:

```bash
mkdir -p .visual-review
grep -qxF '.visual-review/' .gitignore 2>/dev/null || echo '.visual-review/' >> .gitignore
SAFE_BRANCH=${BRANCH//\//-}
python3 "SKILL_DIR/scripts/render.py" \
  "$SCRATCH/findings.json" ".visual-review/${SAFE_BRANCH}-${HEAD_SHA}.html"
```

`render.py` is deterministic — it owns all layout, CSS, and the filter JS. Never
hand-write the HTML.

## Step 3 — Open and report

```bash
open ".visual-review/${SAFE_BRANCH}-${HEAD_SHA}.html"   # macOS
```

Report to the user: the verdict, counts by severity, and the artifact path. If
zero findings survived verification, say so plainly — the dashboard still renders
the clean verdict and the file-tree.

## Finding shape (authoritative schema lives in references/workflow.js)

Each finding object:

| field | meaning |
|---|---|
| `category` | `correctness` \| `security` \| `performance` \| `simplification` \| `api-contract` \| `tests` |
| `severity` | `critical` \| `high` \| `medium` \| `low` |
| `summary` | one-line statement of the defect |
| `failure_scenario` | concrete inputs/state → wrong output or crash |
| `file`, `line` | anchor in the changed code |
| `hunk` | `{ before, after }` split-diff of the offending lines (from the real diff) |
| `suggested_fix` | unified diff of a proposed fix, or `null` (render-only, never applied) |
| `wireframe_html` | grounded semantic-HTML wireframe for UI findings, or `null` |
| `verdict` | always `"CONFIRMED"` (only survivors are returned) |
