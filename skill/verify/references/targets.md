# Non-local targets

Read when the invocation carries `--branch` or `--pr`. Local mode does not need
this file.

```
/verify [--local | --branch <name> | --pr <number-or-url>]
```

## `--branch <name>`

Use an explicitly supplied comparison base; otherwise resolve the remote
default as `refs/remotes/origin/HEAD`, then `origin/main`, then `origin/master`.
If none resolves, ask for the comparison base. Pin both revisions and compute
merge-base(base, branch)…branch tip.

**Materialize the target:** create a temporary `git worktree` at the branch's
exact tip SHA, run discovery and all validation commands inside that worktree,
then remove the worktree. Never switch the user's primary checkout as a side
effect; never run branch-mode checks only against the active working tree.

Discovery and checks run at the target revision, not as a file-list over the
user's current tree.

## `--pr <number-or-url>`

Resolve the PR's actual base and head through an available GitHub integration
or authenticated `gh`. Pin those revisions and inspect their merge-base diff.
Report unavailable metadata or checkout access as an unresolved prerequisite.

**Before executing any PR-discovered install/test/make/CI-local command:** decide
trust using existing authorization. Execute untrusted code only with explicit
trust or in suitable isolation without developer credentials. A worktree alone
is not execution isolation; a trusted runner can still execute untrusted code.

Materialize the exact PR head in a temporary worktree or equivalent checkout,
and run checks there. Preserve useful added tests and evidence as artifacts
before cleanup; do not switch or modify the user's primary checkout.
