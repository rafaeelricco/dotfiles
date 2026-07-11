# Validation Patterns

Use these patterns to turn broad requests into objective validation scenarios.

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

- Shared rules must appear in one canonical location only.
- Portal- or role-specific documents must retain only their local deviations.
- Cross-references must point to the shared source of truth where applicable.
- Terminology must remain consistent across all affected artifacts.
