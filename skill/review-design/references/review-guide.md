# Design review guide

Read public types and operations first, then trace relevant callers and runtime
paths. Use questions that could change the design. Report only material findings.
For each, name the premise or invariant, cite code or a contract, give the
smallest counterexample, and name evidence that would settle it. If there are
none, list the premises challenged and the checks attempted.

## Operation and state

- Can callers identify the target from the name, inputs, outputs, and errors?
  When work outlives a selection, where is the target ID captured? Trace
  preview and persistence separately across the selection change.
- What outcomes are observable and what selects them? If consumers reconstruct
  a decision from several fields, could the boundary return one explicit result?
- Trace producers and event sequences to establish what can coexist. Group
  values that must change together. For exclusive states, require each variant's
  data and name absence when it matters to consumers. Check validation of
  external inputs and transitions. Check actual callers and exported contracts
  before keeping a signature that admits invalid combinations for compatibility.
- Make each branch's rule and result visible. Qualify field access when the
  source matters, use locals that explain decisions or calculations, and spell
  out result fields when spreads or indirection would hide behavior.
- Keep integer domain values integral and infer types from schemas when
  supported. Use distinct tags and name unions for what their variants represent.
- Can callers correlate every result and error with its call when calls overlap?

## Ownership and reads

- Put reusable mechanics in the wrapper, domain policy in the feature, and
  coordination in the operation. Let callers choose policies that can vary.
- If a decision needs the latest write, trace the read for lag from a projection
  or cache.
- Distinguish durable snapshots needed for reopening or replay from transient
  fragments. Name a consumer for each new field or step.
- Record the observable behavior a timer or workaround protects and the ordering
  it relies on.

## Runtime boundaries and evidence

- Who observes errors, cancels work, releases resources, and flushes output?
  Trace pending work under backpressure, cancellation, and shutdown.
- Which failures permit retry, what repeats, and what bounds it? Which effects
  can repeat, and what happens when processes act concurrently?
- What input or event order through the real interface would expose a wrong
  premise, and what result would be observable?
