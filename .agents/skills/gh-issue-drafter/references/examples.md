# Examples

## Example 1: Add city filter

```md
Suggested title: Add city filter to the customer list

## Problem

The customer list does not support filtering by city, which makes it harder to locate customers
from a specific location quickly.

## Context

- Origin: feature gap identified while using the customer list.
- Evidence: the page currently supports filtering by name and status, but not by city.
- Impact: users must scan large result sets manually to find customers from a given city.
- Affected scope: customer list screen and the search/filter behavior behind it.

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

```md
Suggested title: Consolidate shared authentication and account-management model rules

## Problem

Authentication and account-management rules are duplicated across multiple portal models, which
creates inconsistencies and makes universal user needs appear role-specific.

## Context

- Origin: review comment raised on a portal-specific account-management model.
- Evidence: password rules and profile-management behavior are repeated independently across multiple models.
- Impact: duplicated documentation increases drift risk and weakens the shared source of truth.
- Affected scope: shared auth/account-management concepts and portal-specific mental models that currently restate them.

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
```

## Example 3: Rewrite a partial issue

If the user sends a mixed draft where `Problem`, `Acceptance Criteria`, and `Validation` are blended
together, separate them by asking:

- what is the current problem
- what must be true when the work is done
- how someone will verify that outcome

Then rewrite the issue without adding unsupported details.
