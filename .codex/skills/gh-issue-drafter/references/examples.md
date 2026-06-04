# Examples

## Example 1: Add city filter

```md
Title: Add city filter to the customer list

Body:

## Situation

The customer list does not support filtering by city, which makes it harder to locate customers
from a specific location quickly.

## Direction

Add city as a first-class filter that behaves consistently with the existing name and status
filters. It should combine with existing filters, clear independently, and use the current empty
state when no customers match.

## Acceptance Criteria

- [ ] The customer list supports filtering by city.
- [ ] The city filter works together with existing filters.
- [ ] Clearing the city filter returns the list to the default eligible results.

## Validation

- [ ] When city = `Sao Paulo`, the list must show only customers whose city is `Sao Paulo`.
- [ ] When city = `Campinas`, the list must show only customers whose city is `Campinas`.
- [ ] When city = `Sao Paulo` and status = `Active`, the list must show only customers that match both filters.
- [ ] When the city filter is cleared, the list must return to the unfiltered result set.
- [ ] When no customer matches the selected city, the expected empty state must appear.
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

- [ ] Shared password-policy rules must appear in one canonical model instead of being restated independently across portals.
- [ ] Portal-specific models must reference the shared source for common auth and account-management behavior.
- [ ] Portal-specific models must preserve only deviations that are unique to that portal or platform.
- [ ] Terminology for profile and password-management behavior must remain consistent across all affected models.
````
