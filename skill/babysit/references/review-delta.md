# Review delta

Posted handoff of the review loop. Load when **Workflow** names this
step. Not Report. Not `visual-recap`. Post with `gh pr comment` from
`./gh-recipes.md`.

## When

After **Watch** (skip Watch when no checks are running), before
**Re-request**, once this cycle, when this cycle pushed at least one
commit **and** Gather has a trusted non-PENDING review submission.
Otherwise skip.

## Rounds

Reuse Gather's review submissions and issue comments. Skip empty or
boilerplate submissions per `./validate.md` Phase 0. For finding text
and inline replies, run the Unresolved review threads query in
`./gh-recipes.md` with the `isResolved==false` and
`isOutdated==false` conjuncts removed.
Keep an outdated thread that has a Fixed / Already-fixed / Disagree
reply; keep one with a Skip reply too. Skip unresolved outdated threads with no reply. That is the
one extra read. Count commits with
`git log --oneline <earliest-review-sha>..HEAD` on the PR branch.

Order review submissions by `submitted_at`. One section per submission
(`login` + `commit_id`). Attach each finding to the latest same-login
submission at or before its first comment time. If that login has no
submission, use a login-only section (no foreign `commit_id`).

Disposition per finding, from this cycle's Scope Gate and later
Fixed / Already-fixed / Disagree / Skip replies (`created_at` > source):

- **Fixed `<hash>`** — ADDRESS commit this cycle, or Already-fixed reply;
  omit `<hash>` when that reply had none
- **Skipped** — SKIP / Skip reply; resolved
- **Not applying** — SKIP / Disagree reply; leave open
- **Unanswered** — no such reply (includes UNSURE)

A later review that only restates an unanswered finding stays under
the original section.

## Shape

Fill slots; do not change structure. No "Round N". No diagrams. No
file inventory. No test-pass claims. Echo reviewer P-labels in the
header only when the review itself used them; ignore them for routing.
One bullet per finding: problem + action + how + outcome. Do not paste
the same sentence onto two findings. No **Now** line. Unanswered has
no action — problem + how it still fails + outcome. Hash at the end
in parens; omit it when unknown.

```text
Since this PR opened, <names> reviewed it <N> times and found <Y>
issues. We pushed <C> commits since.

**<login> on `<sha7>` — <k> findings**
- <problem>, so <action>; <how>, and <outcome> (`<hash>`).
- <problem>, so we skipped; <reason>, and the thread is resolved (`<path>`).
- <problem>, so we did not apply; <reason>, and the thread stays open (`<path>`).
- <problem>: <how it still fails>, so <outcome> (`<path>`).
```

Oldest section first. Omit an empty bullet group.

## Post

One `gh pr comment` (`--body-file` is fine). Then **Re-request**.
Never merge this body into `review-prompt.md` — that comment's first
line must stay `<mention-line>`.
