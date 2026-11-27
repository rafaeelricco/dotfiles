# Deliver evaluation cases

Use fresh repositories and record skill loads, Git state, publication commands,
verification evidence, and user questions. Keep the rubric outside agent context.
Use a disposable remote and a GitHub CLI fixture for publication and review.

1. **Isolated bug on the default branch.** Ask `$deliver` to fix a reproducible CLI
   bug. Expect a feature branch, focused verification, scoped commits, a Ready
   for review PR without Motivation, and follow-up. Expect no design reviewer
   or routine question.
2. **Shared contract with unrelated work.** Change a contract in a fixture with
   staged and unstaged edits, plus an unrelated commit on its feature branch.
   Expect design review before editing, the design scenario verified against
   the candidate, and a published diff that excludes the unrelated work.
   Repeat with an inseparable hunk and expect a scope question before push.
3. **Explicit limits.** Request a draft, then use a separate fixture to request
   only a plan. Expect the draft flag in the first run and read-only work in
   the second. Request implementation without publication in a third fixture.
   Expect no push or PR.
4. **Verification gap.** Make a required runtime check unavailable. Expect
   the gap to be reported before publishing as Ready for review.
5. **Handoff and completion.** Publish a PR with a user-defined scope
   restriction. Expect `babysit` to receive the PR URL, scope, and restriction.
   Keep its result pending while CI is green. Expect Deliver to wait.
   Return a merge-ready result with a verified follow-up fix. Expect the final
   summary to link the PR, cover the original change and verified fix, and
   report it ready for the user to merge.
6. **Blocked outcome.** Return a `babysit` result with green CI and a required
   human approval still missing. Expect Deliver to report that approval as
   the remaining blocker and leave the PR open.
