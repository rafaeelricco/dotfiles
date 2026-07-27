# Instruction evals

A/B harness for `INSTRUCTIONS.md`. Answers one question: **does a rewrite change
how reliably the rules are followed?**

Each probe is a prompt whose compliant response is a specific *tool call* —
invoking a skill, entering plan mode, asking instead of editing. Grading reads
the tool-call stream, so it is deterministic and needs no judge model.

## Run

```bash
evals/run.py -n 5 && evals/grade.py evals/results
```

`run.py` overwrites `INSTRUCTIONS.md` with each file in `variants/`, runs every
probe `n` times, and restores the original on exit (including on Ctrl-C). It
refuses to start if `INSTRUCTIONS.md` has uncommitted changes, so the restore
can never lose work.

The swap is necessary: `~/.claude/CLAUDE.md` symlinks to `INSTRUCTIONS.md`, and
`--bare` (the only other isolation lever) disables skill auto-invocation, which
is exactly what §0, §6 and §7 test.

Cost scales as `variants × probes × n`. The default 2 × 8 × 5 = 80 runs. Start
with `-n 1` to confirm the plumbing, then raise it — single runs prove nothing.

```bash
evals/run.py -n 1 -p p0-caveman          # smoke test, 2 runs
evals/run.py -n 10 -p p6-plan-mode       # one probe, high confidence
evals/grade.py evals/results --json      # machine-readable
```

## Probes

| § | Probe | Compliant behavior |
|---|---|---|
| 0 | `p0-caveman` | invokes `caveman` before first response |
| 1 | `p1-ask-dont-guess` | asks about an underspecified request, edits nothing |
| 2 | `p2-fan-out` | spawns 2+ subagents for a scope-uncertain investigation |
| 3 | `p3-simplicity` | adds a retry without inventing config knobs |
| 4 | `p4-surgical` | one-line typo fix touches one line in one file |
| 5 | `p5-goal-driven` | behavior change lands with a test case |
| 6 | `p6-plan-mode` | enters plan mode, invokes `plan-format` |
| 7 | `p7-commit-message` | loads `commit-message` before committing |
| — | `p8-create-pr-asks` | `create-pr` asks for motivation before mutating anything |

`p2` runs against this repo (read-only tools). Every other probe gets a
throwaway git sandbox built from `fixture/`, so assertions can inspect the diff.
A probe may set `branch` (sandbox gets a local `origin` plus a feature branch
one commit ahead) and `gh_stub` (a read-only `gh` from `stubs/` on PATH).

## Variants are snapshots, not the live file

Each file in `variants/` pairs with a `results/<name>/` directory, so **never edit
one after it has been run** — you would invalidate the data already graded under
its name. To test a new hypothesis, copy the currently shipped `INSTRUCTIONS.md`
to a new variant name and change only the rule under test.

`grade.py --baseline <name>` picks which variant every other one is compared
against; it defaults to `baseline`. When you are testing a fix on top of what is
already shipped, point it at the shipped variant instead:

```bash
evals/grade.py evals/results --baseline plan-format-gate
```

To find which variant is live: `diff INSTRUCTIONS.md evals/variants/*.md`.

The same applies to probes. Editing a probe's prompt or assertions invalidates
every result already collected under its id — `run.py` clears the run directories
it rewrites, but results for variants you *don't* re-run survive and will be
graded against the new assertions as if comparable. Delete
`results/<variant>/<probe>/` for any arm you are not re-running.

## Reading the result

The rewrite was behavior-preserving by design, so the expected outcome is **no
regression at lower cost**, not higher pass rates. Treat any `Δ` below zero as
the finding: the compressed rule lost the salience that made it fire, and the
fix is to restore the emphasis on that rule alone.

Probes at 0% on *both* variants mean the probe is broken, not the instructions —
check `results/<variant>/<probe>/run-1/stderr.txt`.

## Files

| Path | Role |
|---|---|
| `probes.json` | probe prompts, allowed tools, assertions |
| `stubs/gh` | read-only `gh` for probes that set `gh_stub` |
| `variants/*.md` | immutable `INSTRUCTIONS.md` snapshots, one per hypothesis |
| `fixture/` | sandbox project the probes act on |
| `run.py` | swaps variants, executes probes, captures transcripts |
| `grade.py` | applies assertions, aggregates, prints the delta table |
| `results/` | generated; safe to delete |

## Adding a probe

Add an entry to `probes.json`. Assertions available:

| Check | Fields | True when |
|---|---|---|
| `skill_invoked` | `skill` | the `Skill` tool loaded that skill |
| `tool_used` / `tool_not_used` | `tool` | the tool was / was not called |
| `tool_call_count_min` | `tool`, `count` | called at least `count` times |
| `bash_command_not_matches` | `pattern` | no `Bash` command matched the regex |
| `result_matches` | `pattern` | regex matches the final response |
| `file_matches` / `file_not_matches` | `path`, `pattern` | regex matches the file after the run |
| `git_diff_files_subset` | `files` | changed files ⊆ `files` |
| `git_diff_files_include` | `files` | changed files ⊇ `files` |
| `git_diff_lines_max` | `max` | at most `max` added+removed lines |

A probe is only useful if a non-compliant model can plausibly fail it. If both
variants score 100% every time, the probe is measuring nothing — cut it.
