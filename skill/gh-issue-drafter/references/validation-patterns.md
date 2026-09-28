# Validation Patterns

## Filter or search features

- When filter `X` is applied, only matching results must be shown.
- When filter `X` changes from value `A` to value `B`, previous results must be replaced by the new matching set.
- When filter `X` is combined with filter `Y`, results must satisfy both filters.
- When filter `X` is cleared, the list must return to the unfiltered state.
- When no result matches filter `X`, the expected empty state must appear.

## Form or field changes

- When a valid value is entered, the new value must be saved and shown correctly.
- When an invalid value is entered, the expected validation message must appear.
- When the form is submitted with unchanged values, no unintended change must occur.

## State or workflow changes

- When the user completes step `X`, the system must transition to state `Y`.
- When precondition `X` is not met, the expected blocking or error state must appear.
- When the workflow is resumed, previously saved progress must remain consistent.

## Structural or documentation refactors

- When the affected documents are searched for a shared rule, it must appear in one canonical location only.
- When a portal- or role-specific document is read, every rule it keeps must be a local deviation.
- When a document relies on a shared rule, it must link to the canonical source instead of restating it.
- When the affected documents are compared, each concept must use the same term everywhere.
