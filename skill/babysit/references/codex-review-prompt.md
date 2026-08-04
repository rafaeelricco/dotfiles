# High-signal Codex re-request

Post with `gh pr comment`. Its job is preventing review-noise ping-pong.

```text
@codex review

Review this PR at HEAD (`<sha>` and later if pushed).

Majors only (P0/P1): correctness bugs, security issues, data loss, broken
contracts or installs, clear regressions. Confirm whether any remain after the
latest commits.

Ignore completely: P3, nits, style, formatting, wording, optional refactors.
P2 only if it is clearly a real correctness or safety risk — if unsure, skip it.

Since last review:
- `<sha>` — <one line>

If you find no major issues, say so in a clear line
(e.g. "Didn't find any major issues").
```
