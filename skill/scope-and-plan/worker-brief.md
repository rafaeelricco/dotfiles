# Worker brief

Step 1 readers and the step 4 skeptic are read-only. A worker that edits while
siblings are reading invalidates every other worker's snapshot. Step 6
writers start after the read-only stages finish.

Brief each reader with:

    Objective:  <the one question this worker answers>
    Boundaries: <paths in scope; paths explicitly out of scope>
    Role:       reader — readers gather facts; judgment stays on the session model
    Return:     one claim per line as `path:line — <fact>`; then `Gaps:` with one line each; nothing else
    Do not:     edit files, run builds, answer another worker's question

Overlapping scopes return the same file twice at double cost. If two briefs name
the same path, merge them into one worker.

The step 4 skeptic is a reader with Objective `refute each Fact below`, every
Fact pasted in with its anchor, and Return one line per Fact:
`<fact> — holds` or `<fact> — refuted: path:line — <why>`. Its Role is
`skeptic`: refuting is judgment.

Brief each step 6 writer with:

    Apply:      <approved plan path and owned hunks; no saved plan → paste those hunks>
    Boundaries: <editable paths; pinned tests are read-only>
    Role:       <copy or derive, selected by step 6>
    Return:     files changed; unfinished hunks and why; any stale context
    Do not:     edit outside Boundaries, widen the approved change, re-plan, run checks, commit
