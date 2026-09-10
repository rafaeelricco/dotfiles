# Worker brief

Step 1 readers and the step 4 skeptic are read-only. A worker that edits while
siblings are reading invalidates every other worker's snapshot. Step 6 writers
are the exception — they run after every reader has returned, over disjoint
paths from an authorized plan.

Brief each reader with:

    Objective:  <the one question this worker answers>
    Boundaries: <paths in scope; paths explicitly out of scope>
    Model:      one tier below the session (sonnet on Claude Code) — readers gather facts; judgment stays on the session model
    Return:     one claim per line as `path:line — <fact>`; then `Gaps:` with one line each; nothing else
    Do not:     edit files, run builds, answer another worker's question

Overlapping scopes return the same file twice at double cost. If two briefs name
the same path, merge them into one worker.

The step 4 skeptic is a reader with Objective `refute each Fact below`, every
Fact pasted in with its anchor, and Return one line per Fact:
`<fact> — holds` or `<fact> — refuted: path:line — <why>`. It carries no Model
line: refuting is judgment, so it runs on the session model.

Brief each writer with:

    Apply:      <the authorized diffs, verbatim>
    Boundaries: <the only files this writer may touch>
    Return:     files changed; any diff that did not apply cleanly
    Do not:     re-plan, widen the diff, touch a path outside Boundaries, commit

A writer that cannot apply a diff cleanly stops and returns — it does not
improvise a fix. Committing is the main thread's, after every writer returns.
