# Build a specification

## Establish the requirements

Read supplied material and any existing specification. Inspect repository
context to resolve factual questions before asking the user. Distinguish
required system behavior and delivery constraints from descriptions of the
current implementation and background process context.

Establish the goal, intended users, required behavior, constraints, exclusions,
and authoritative sources. Resolve material gaps and contradictions through
focused questions before writing. For an explicitly requested early draft,
label unresolved decisions.

Distinguish source requirements from proposed decisions. Preserve existing
contracts' authority; ask about conflicts rather than silently choosing a
winner. For idea-led work, derive requirements from confirmed user decisions.

## Document shape

Default to SPEC.md in the project root unless another destination is given.
Follow the project's language and terminology.

- Goal: intended outcome and links to authoritative sources, when available.
- Tracking: explain stable IDs and checked and unchecked items.
- Functional requirements: behavior-based groups labeled FR-1, FR-2, etc.,
  containing checkbox criteria labeled FR-1.1, FR-1.2, etc.
- Non-functional requirements: checkbox guarantees labeled NFR-1, NFR-2,
  etc.; reference the functional groups they support where useful.
- Constraints and exclusions: required boundaries and explicit non-goals.

Write observable acceptance criteria. Split independently verifiable
obligations without fragmenting one behavior unnecessarily. State measurable
quality targets only when supported by sources or confirmed decisions.
Keep each requirement in one authoritative location and link related items.

Include implementation details only as contractual constraints; keep
architecture proposals and implementation plans outside this document.

## Creation and revision

New requirements start unchecked; existing implementation is not proof of
verification. Explain that unchecked does not necessarily mean absent.

Preserve existing IDs and unchanged completion marks. Leave materially
changed criteria unchecked and explain resets. Record removed IDs in Tracking
so they are not reused.

Check coverage against sources and confirmed decisions; remove unsupported
additions and resolve contradictions before finalizing. Write only the
requested specification; report its location and any remaining explicitly
accepted assumptions.
