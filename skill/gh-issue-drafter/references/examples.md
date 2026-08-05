# Examples

## Example 1: Add city filter

```md
Title: Add city filter to the customer list

Body:

## Situation

The customer list does not support filtering by city, which makes it harder to locate customers
from a specific location quickly.

## Direction

Ship city filtering on the customer list that matches the behavior of existing name and status
filters: combinable, independently clearable, and showing the current empty state when nothing
matches. Prefer the product’s existing filter patterns over a one-off control.

## Acceptance Criteria

- [ ] The customer list supports filtering by city.
- [ ] The city filter works together with existing filters.
- [ ] Clearing the city filter returns the list to the default eligible results.

## Validation

- [ ] When city filter `São Paulo` is applied, only customers in São Paulo are shown.
- [ ] When city filter changes from `São Paulo` to `Recife`, previous results are replaced by Recife matches.
- [ ] When city `São Paulo` is combined with status `Active`, results satisfy both filters.
- [ ] When the city filter is cleared, the list returns to the unfiltered eligible set.
- [ ] When no customer matches city `Nowhere`, the current empty state appears.
```

## Example 2: Standardize duplicated model content

````md
Title: Consolidate shared authentication and account-management model rules

Body:

## Situation

Authentication and account-management rules are duplicated across multiple portal models, which
creates inconsistencies and makes universal user needs appear role-specific.

## Direction

Move shared rules into one canonical model and leave only portal-specific deviations in each
portal model.

Current shape:

```md
Customer portal auth model

- Password rules
- Profile management

Operator portal auth model

- Password rules
- Profile management
```

Desired shape:

```md
Shared auth model

- Password rules
- Profile management

Portal models

- Role- or platform-specific deviations only
```

## Acceptance Criteria

- [ ] Shared authentication rules are documented in a single canonical model.
- [ ] Shared account-management rules are documented in a single canonical model.
- [ ] Portal-specific models retain only role- or platform-specific deviations.
- [ ] Universal profile and password-management needs are no longer described as exclusive to one role.

## Validation

- [ ] Shared authentication rules appear in exactly one canonical model document.
- [ ] Shared account-management rules appear in exactly one canonical model document.
- [ ] Each portal model retains only role- or platform-specific deviations (no duplicated password/profile rules).
- [ ] Cross-references from portal models point to the shared source of truth where applicable.
- [ ] Terminology for password and profile management is consistent across the shared model and portals.
````
