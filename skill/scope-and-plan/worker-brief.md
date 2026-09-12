# Worker brief

Step 1 readers and the step 4 skeptic are read-only. A worker that edits while
siblings are reading invalidates every other worker's snapshot. Writers belong
to `implement`, which starts after every reader has returned.

Brief each reader with:

    Objective:  <the one question this worker answers>
    Boundaries: <paths in scope; paths explicitly out of scope>
    Model:      one below — readers gather facts; judgment stays on the session model
    Return:     one claim per line as `path:line — <fact>`; then `Gaps:` with one line each; nothing else
    Do not:     edit files, run builds, answer another worker's question

Overlapping scopes return the same file twice at double cost. If two briefs name
the same path, merge them into one worker.

The step 4 skeptic is a reader with Objective `refute each Fact below`, every
Fact pasted in with its anchor, and Return one line per Fact:
`<fact> — holds` or `<fact> — refuted: path:line — <why>`. Its Model is
`session`: refuting is judgment.
