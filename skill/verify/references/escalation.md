# Escalation

Read when the verdict is FAIL, PARTIAL, or BLOCKED. The gate's nine rules are
the decision; this file is what each one means in detail, what to escalate, and
what to do instead.

## Rule detail

**0. Be ambitious about decisive proofs.** Do not stop at "the project still
compiles." Look for the checks that would fail if this change were wrong. Prefer
the smallest set of proofs that still cover the changed behavior. If there is a
path to a more decisive check the repo already supports — targeted package test,
named test filter, project-level `check` script — take it.

**1. Do not rubber-stamp green typecheck.** Treat typecheck/lint alone as
insufficient for non-trivial behavior changes unless the diff is truly types-only
or a pure mechanical rename, and say so explicitly. Prefer unit, integration, or
package test scripts that exercise the changed paths. If no such test exists,
state the gap as residual risk or BLOCKED — not as a silent PASS.

**2. Do not run the whole monorepo when one package moved.** Be highly suspicious
of suite-wide jobs that bury signal under noise and time. Prefer the nearest
package or workspace root to the changed files. Only widen scope when shared
contracts or root tooling make that necessary — and say why.

**3. Bias toward evidence.** If behavior can stay unproven while a command is
green for unrelated reasons, push for a better check or name the residual risk
clearly. Do not soften a failing test into a mild suggestion. Strongly prefer one
failing relevant test over ten green irrelevant ones.

**4. Prefer this repo's real commands.** Discover `test`, `typecheck`, `lint`,
`check`, `build` — and language defaults like `dotnet test`, `go test`,
`cargo test`, `pytest`, `make test` — from package manifests, Makefiles, and CI,
but only when those CI steps are runnable locally. A harness driving a live
target is a real command surface, not an invented ritual. Treat invented one-off
command lines as a quality problem when the repo already has a canonical script.
Be skeptical of generic "just run everything" approaches that hide which package
actually matters.

**5. Match the check to the change.** Logic or domain change → tests for that
module or package. CLI change → invoke the affected subcommand with an expected
exit code or output fragment when cheap. Platform-specific paths (`android`,
`ios`, OS-only projects) → do not proxy with another platform; if a harness is
available and the target is live, drive it rather than typecheck. Docs-only
change → report that no behavioral verification is required.

**6. Keep validation in the canonical layer.** Prefer existing package scripts
and CI-local commands over bespoke ad-hoc shells. Call out when a check is
running in the wrong package for the files that changed. Push verification toward
the package or module that owns the change.

**7. Missing environment is a blocker, not a pass.** If a selected check cannot
start — toolchain, auth, secrets, device — mark it blocked with the single next
action required. Do not skip a failed product test and still claim overall
success. Absent tools are a gap to state, not a framework to build. Present tools
are an obligation: "the target was already running" is a reason to use it, never
a reason to stop at typecheck.

**8. Materialize non-local targets; gate untrusted PR execution.** See
`references/targets.md`.

## What to flag aggressively

- Typecheck or lint used as the only proof for a behavioral change.
- A full monorepo suite run for a one-package diff without justification.
- A claimed pass for a check that never ran.
- A failed test reclassified as "probably fine" or "flaky" without a re-run.
- Invented commands the repo does not define when a canonical script exists.
- Validation of the wrong package for the files that changed.
- An available harness left idle while a weaker static check stood in.
- A method chosen for the user when two were viable.
- Android-only (or iOS-only) changes "validated" on the other platform.
- Empty or docs-only diffs padded with unrelated green checks.
- Residual risk omitted when an obvious decisive check was available and skipped.
- PR mode continuing without `gh` authentication.
- `--branch` validation run against the user's active checkout instead of a
  worktree at the branch tip.
- `--pr` execution of package/Make/CI scripts from an untrusted fork without an
  explicit trust or isolation gate.

## Preferred remedies

When validation is weak or failing, prefer actions like:

- Run the package-level `test` / `check` script for the owning package only.
- Narrow with the tool's filter (file, name, project) when the repo supports it.
- Re-run a single failing test once to separate flake from real failure.
- Replace an invented command with the script CI already uses for that path.
- Widen scope only when a shared contract or root package clearly requires it.
- State a missing proof as an explicit blocker with one concrete user action.

Do not be satisfied with "everything is green somewhere" when the changed
behavior was never exercised. Do not be satisfied with a long list of weak checks
if a shorter decisive set was available.
