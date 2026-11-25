# Design review evaluations

Use small synthetic fixtures in isolated temporary workspaces. For each case,
run fresh Default-mode sessions on byte-identical starting files with the same
model, tools, request, and accepted constraints. Give one session the skill
and its guide, and omit both in the baseline. Keep this file, the expected
results, and the other session's output out of both contexts.

Capture the tool trace and the plan or final diff. For each pair, record
material design decisions changed, scenarios added with expected results,
false positives or unnecessary findings, and whether delegation occurred.
Check the count, context isolation, contents of the brief, reviewer writes,
and the order of the review, plan, and first affected edit. Grade observable
decisions and evidence. Report unreachable checks or substituted runtimes as
gaps.

For plan-only cases, require no file writes and observe whether the challenge
precedes the first presentation of the plan. For implementation cases, grant
edit authorization in the initial request. Check whether the design is
challenged before the first affected edit without an extra approval round.
Use `verify` on the final result through the affected interface in at least
one implementation case. Case F exercises the deliberate bypass.

## A. Prevou history and selection

- Fixture. A reducer and consumer expose `loadedHistory: Loading | Loaded`
  alongside `syncState: syncing | synced`. The initial state pairs `Loading`
  with `synced`. Selection ID and messages are set separately, and a streaming
  callback reads the current selection when a token arrives.
- Request. “Propose the API and state model for switching conversations while
  history loads and tokens stream. The selected conversation must display
  correctly and each token belongs to its originating conversation. Plan
  only.”
- Expect. A concrete invalid combination or mixed-selection counterexample,
  a model or API change that rules it out, and an A→B scenario that delivers
  a delayed token from A. Check the expected B preview and A persistence.
- Repeat with delegation disabled. Expect a requirements-and-source pass
  separate from the draft, a disclosed primary-agent review, and the same
  material design and scenario checks.

## B. Overlapping calls to one tool

- Fixture. A dispatcher and its consumer can start two calls to one tool.
  Success carries a call ID and error is a generic event with no identity.
- Request. “Plan how to show the outcome of each in-flight tool call in its
  own row, including when calls complete out of order. Plan only.”
- Expect. Correlation of results and errors to the originating invocation,
  with one success and one failure for the same tool and an observable
  assertion for each row.

## C. Read after sending a message

- Fixture. A callable `sendMessage` commits to a write store and returns a
  conversation read from a projection whose update can be held and released.
- Request. “Implement a send response that includes the message just
  accepted, even when the conversation view has pending updates. Edits and
  local verification are authorized.”
- Expect. A commit→stale read sequence, a source with a sufficient freshness
  guarantee, and an interface test that holds the projection behind while
  asserting that the response includes the accepted message.

## D. Nod indexer migration

- Fixture. An indexer skips symlinks. A proposed replacement traversal API
  lists entries, but the provided interface leaves symlink behavior
  unspecified. Supply temporary directories containing ordinary entries and
  a link to an entry outside the root.
- Request. “Migrate the indexer to the proposed file API while preserving
  which entries it indexes. Edits and local verification are authorized.”
- Expect. Focused evidence for the symlink contract, such as documentation
  or an interface check on the proposed traversal. If that evidence cannot
  settle the decision, surface it before editing the affected traversal.

## E. Nod notch geometry

- Fixture. A synthetic AppKit startup path calls into WebKit, which samples
  width before AppKit resizes. Hover triggers a later geometry refresh.
- Request. “Plan the fix for the notch's initial width on launch. Preserve
  hover behavior. Plan only.”
- Expect. A review of which runtime owns the geometry and when the width
  becomes valid. The acceptance scenario checks the first rendered frame
  on a cold launch of a release build with no hover. A synthetic event trace
  can test ordering but cannot establish the actual release rendering.

## F. Local formatting bug

- Fixture. A CLI command prints a label with doubled spacing because of one
  string literal. The display text has no shared contract or affected
  boundary.
- Request. “Fix the extra space in the printed label. Edits and local
  verification are authorized.”
- Expect. The focused correction and a check of the command's actual output,
  with no design subagent.

## G. Readability of a result derived from overlapping activity

- Fixture. Put this code in `panel.ts`. Keep the rest of this case outside
  the evaluating sessions.

  ```ts
  type Source = {
    streaming: boolean;
    firstTextAt?: number;
    tools: readonly { status: "running" | "done" }[];
  };

  type Prep = { type: "none" } | { type: "reading" } | { type: "refining" } | { type: "refined"; at: number };

  function panel(source: Source, waiting: "reading" | "refining" | undefined, refinedAt: number | undefined) {
    const toolRunning =
      (source.streaming || waiting === "refining") && source.tools.some(tool => tool.status === "running");
    if (toolRunning) return { type: "tool" };
    if (waiting !== undefined) return { type: waiting };
    if (source.streaming && source.firstTextAt === undefined) return { type: "thinking" };
    return { type: "summary", refinedAt };
  }

  function render(source: Source, prep: Prep) {
    return panel(
      source,
      prep.type === "reading" || prep.type === "refining" ? prep.type : undefined,
      prep.type === "refined" ? prep.at : undefined,
    );
  }
  ```

- Request. “This panel is hard to follow. Propose the smallest refactor
  that makes its possible results clear while preserving its behavior.
  Show the proposed code. Plan only.”
- Expect. Trace `render` into `panel` and show that the current panel signature
  permits waiting and a refinement timestamp together, though the caller
  cannot produce that combination. Keep stream progress and tool activity able
  to coexist. Show concrete types and explicit branch outcomes.
- Expect observable scenarios: first text → tool starts → tool ends during
  the same stream gives summary → tool → summary; refinement with a running
  tool and the original stream stopped gives the tool; completed refinement
  passes its timestamp into the summary. Check that review precedes the final
  proposal and that the fixture stays unchanged.
- For this smoke test, also compare the skill at the base commit with the candidate.
  Use a fresh session and the same fixture, prompt, model, and tool access for
  each version. Apply the same rubric to both.
