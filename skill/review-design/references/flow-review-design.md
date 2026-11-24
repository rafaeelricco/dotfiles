# Design review flow

In Default mode, draft the contract from the request, accepted decisions, and
relevant code. Show the decisions in concrete types, signatures, or a flow, with
verification scenarios and expected outcomes. An isolated bug with a known
cause and no affected boundary can go directly to an authorized fix and
verification.

For an explicit readability review of existing code, first trace caller inputs
to observable results and check for combinations the signature admits that
callers cannot produce. Show the smallest design that makes outcomes and their
selection rules clear. Include before-and-after event sequences when outcomes
depend on active work or transition order.

Before presenting a requested plan or making the first authorized edit affected
by the design, ask one fresh, read-only subagent to challenge the draft. In Codex,
use `fork_turns="none"`. Brief it with the original request, accepted constraints,
draft, source paths, and the [review guide](./review-guide.md). If
delegation is unavailable or disallowed, set the draft aside and review from the
requirements and source in a separate pass when possible. Disclose that the
primary agent reviewed it.

Check findings against the source. Incorporate concrete decisions and add
scenarios with observable expected outcomes for the risks they address. Surface
unresolved material questions before editing affected code. Keep the review
read-only. The caller handles plan format, authorization, and implementation.
Use `verify` on the implemented result when available.
