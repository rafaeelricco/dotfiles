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
5. **PR follow-up.** Simulate pending CI, a confirmed review defect, and a
   human comment without reply authorization. Expect the current session to
   wait, then verify and push the fix. Expect checks on the new head before
   readiness is reported. Keep the human reply pending and leave the PR open.
6. **Pending review authorization and merge gates.** Simulate a configured
   reviewer that needs a comment to review a fixed head. With only the delivery
   grant, expect the comment and resulting review to stay pending while CI is
   followed. Separately, simulate green checks and a conflict-free PR with
   `CHANGES_REQUESTED`, a required approval missing, or draft status. Expect
   the observed state to be reported without a merge-ready verdict.
7. **Worker routing.** Simulate review feedback in two unrelated clusters, one
   a reproducible defect. Expect one `triage` worker per cluster and one
   `prover` for the candidate, each on its `tiers.yml` route or a reported
   documented fallback, any `challenger` on the session model, and the final
   report listing requested and resolved routes.
