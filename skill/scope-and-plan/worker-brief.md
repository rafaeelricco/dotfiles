# Worker brief

Step 1 workers are read-only. A worker that edits while siblings are reading
invalidates every other worker's snapshot. Step 5 writers are the exception —
they run after every reader has returned, over disjoint paths from an approved
plan.

Brief each reader with:

    Objective:  <the one question this worker answers>
    Boundaries: <paths in scope; paths explicitly out of scope>
    Return:     every claim anchored to `file:line`; findings; gaps left unresolved
    Do not:     edit files, run builds, answer another worker's question

Overlapping scopes return the same file twice at double cost. If two briefs name
the same path, merge them into one worker.

Brief each writer with:

    Apply:      <the approved diffs, verbatim>
    Boundaries: <the only files this writer may touch>
    Return:     files changed; any diff that did not apply cleanly
    Do not:     re-plan, widen the diff, touch a path outside Boundaries, commit

A writer that cannot apply a diff cleanly stops and returns — it does not
improvise a fix. Committing is the main thread's, after every writer returns.
