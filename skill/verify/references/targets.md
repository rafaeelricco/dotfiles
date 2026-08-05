# Non-local targets

Read when the invocation carries `--branch` or `--pr`. Local mode does not need
this file.

```
/verify [--local | --branch <name> | --pr <number-or-url>]
```

## `--branch <name>`

Resolve the remote default base as `refs/remotes/origin/HEAD` (fallback
`origin/main`, then `origin/master`). Compute the change set as
merge-base(base, branch)…branch tip.

**Materialize the target:** create a temporary `git worktree` at the branch's
exact tip SHA, run discovery and all validation commands inside that worktree,
then remove the worktree. Never switch the user's primary checkout as a side
effect; never run branch-mode checks only against the active working tree.

Discovery and checks run at the target revision, not as a file-list over the
user's current tree.

## `--pr <number-or-url>`

Validate the PR diff via `gh`. If `gh` is missing or unauthenticated, stop with
instructions to run `gh auth login`.

**Before executing any PR-discovered install/test/make/CI-local command:** decide
trust. If the PR is from an external fork, unknown author, or otherwise untrusted
source, do not run untrusted tree scripts on the developer machine. Require an
explicit user trust decision, or run only in an isolated environment, or restrict
command and script discovery to the trusted base revision. Without that gate,
mark BLOCKED — not PASS.

Prefer materializing the PR head in a temporary worktree (or equivalent
isolation) the same way as `--branch` when execution is approved.
