# Code change checklist

- [ ] **Can a caller tell what this operation affects?** Read the name, inputs,
      outputs, and error cases together. For work that outlives the active view or
      selection, trace when it captures its target and which identity later writes
      use. Keep related values together when callers would otherwise have to
      reconstruct a domain value. Where the codebase supports it, infer types from
      the schema that validates them. Use distinct event tags when payload shapes
      would otherwise make decoding ambiguous.

- [ ] **Which layer owns the decision?** Keep connection mechanics in the
      connection wrapper, product decisions in the feature that needs them, and
      coordination across repositories in the operation that owns the workflow.
      Expose policy at the boundary where callers need to vary it.

- [ ] **What purpose does this behavior serve?** Follow fields, events, and
      options to their consumers, including public and persisted boundaries.
      Document the observable behavior a timer or workaround protects.

- [ ] **Who owns completion, failure, and cancellation?** Find the code that
      observes errors and releases acquired resources. Distinguish successful
      completion from interruption when downstream work must flush. For buffered
      work, check whether the producer waits for capacity and what releases
      waiting work when either side stops.

- [ ] **What work can run again?** Identify the exact retryable failure, the
      unit being replayed, and the stopping condition. Trace effects such as
      emails or remote jobs and establish how they avoid duplication. For queues
      and locks, check which callers share them and which processes can still
      collide.

- [ ] **What would expose a wrong assumption?** Choose an observable sequence
      through the normal entry point. For UI feedback, specify what should happen
      in the real host layout, such as navigation remaining usable as the viewport
      narrows.

## Worked examples

These excerpts omit surrounding code. Use the reasoning that fits the current
change and check its premises against the target code.

### Trace live and saved state separately

Prevou uses a shared preview buffer and a captured destination for the saved
reply. The following lines come from separate parts of the stream flow.

```ts
appendStreamToken: (token =>
  set(state => ({
    streamingContent: state.streamingContent + token,
  })),
  // On successful completion
  completeStreamingResponse(content, session.conversationId));
```

**Reasoning.** A late token can update the shared buffer after a conversation
switch. The switch also clears the buffer and resets the response to `NotAsked`,
while rendering the preview requires `Loading`. Follow the render guard and the
final write separately before making a claim about what the user sees or where
the reply is saved.

**Plan check.** Start a response in A, switch to B before the next token, and let
A finish. If the intended behavior is to hide A's preview while letting its
reply finish, assert that B shows no preview from A and only A receives the reply.

### Put connection cleanup and protocol completion at their own boundaries

Prevou's transcription wrapper closes the connection through its release
action. In speech synthesis, reaching the end of text input triggers a separate
protocol step.

```ts
const release = (connection: Connection): Future<never, null> => {
  connection.requestClose();
  return Future.resolve(null);
};
return Future.bracket(acquire, release, use);
```

```ts
for await (const msg of msgs) {
  session.sendText(msg);
}
session.flush();
session.endOfStream();
```

**Reasoning.** The wrapper owns the acquired connection's lifecycle. The
speech workflow knows when its text is finished and must wait for the
provider's completion signal. The chat owns the decision to send a message
after transcription, so a change to auto-send belongs at that boundary.

**Plan check.** Finish input normally and check that buffered audio is flushed
before release. Disconnect in a separate run and check that the acquired
resource is closed and pending work stops.

### Retry the work whose effects you understand

Prevou's event-store wrapper retries a database computation. Its error
predicate includes a serialization error and a constraint violation for the
aggregate-version index. The loop also checks a fixed bound.

```ts
const go: Future<TransactionError, T> = f.chainRej((e: TransactionError) =>
  isRetryableError(e) && ++retries < MAX_RETRIES ? go : Future.reject(e),
);
```

**Reasoning.** Moving this policy into a shared transaction helper changes the
set of callbacks that can run twice. A transaction can fail after a callback
has already sent an email or started a remote job. Read the callback before
deciding which part can be replayed.

**Plan check.** Force a retryable conflict and an unrelated failure in separate
runs. Check the retry bound and that the unrelated failure propagates. If the
operation includes an external effect, count its invocations across a retry.

### Carry a domain value through the form

Ashraf's loan application passed the saved amount and a hard-coded currency
as separate defaults. The form now accepts a `Money` value and passes that
value through to the summary.

```diff
- defaultCurrency: "MYR",
- defaultAmount: application.amount_requested.value,
+ defaultValue: application.amount_requested,
```

```ts
const summary = createLoanSummary({
  borrowed: fields.amount.values.value,
  // Other summary inputs
});
```

**Reasoning.** `Money` carries the amount and currency together from the saved
record through the form. Keeping that value intact removes a place where the
caller could accidentally substitute a currency.

**Plan check.** Open a saved amount in another supported currency, edit only
the amount, and confirm the summary and submitted value retain that currency.

### Use one schema for both sides of a route

Ashraf infers parameter types from the route table. The link builder and the
incoming URL parser look up the same route's schema.

```ts
type RouteParams<R extends Route> = s.Infer<Routes[R]["params"]>;

// In the link builder
const serialized = s.serialize(schema, params);

// In the incoming URL parser
return s.parse(schema, params) as Result<string, RouteParams<R>>;
```

**Reasoning.** A typed link checks callers that build a link through the
helper. Direct navigation still brings in raw URL parameters, so the route
needs a parse path and a defined response to invalid input.

**Plan check.** Follow a generated link and open the same URL directly. Then
open an invalid URL and check the destination's error behavior.

### Follow a request into the UI's failure state

Ashraf's member session fix added a missing `.fork` to execute the composed
lookup and route its failure into UI state.

```ts
return getSubdomain()
  .map(msubdomain => {
    // Read cached state or load the signed-out member session.
  })
  .fork(
    e => setSessionState(Failed(e)),
    _ => {},
  );
```

**Reasoning.** Composing a `Future` describes the work. The caller still needs
to start it and account for failure at each layer. The same patch made upload
forms record individual file failures as well as successes.

**Plan check.** With no cached session, force the subdomain lookup to fail and
check that the screen reaches its failure state. For an upload change, fail
one file and check that its row leaves the pending state.
