# Evaluation cases

Run when changing verify. Use fresh temporary repositories, never the user's
working tree. Give each evaluating agent the skill, the scenario's user request,
and raw fixture files. Keep this evaluation rubric outside its context.

Observe executed checks, assertions, file changes, target selection, and verdict.
Do not grade matching words or headings. Product files must remain unchanged;
new evidence tests and temporary harnesses are permitted.

## Shared fixture

Create these files, initialize Git, and commit them as `baseline`.

pricing.py:

```python
def total(items):
    if any(item < 0 for item in items):
        raise ValueError("negative item")
    subtotal = sum(items)
    return subtotal - 10 if subtotal >= 100 else subtotal
```

checkout.py:

```python
import json
import sys
from pricing import total

def checkout(items):
    return {"total": total(items)}

if __name__ == "__main__":
    print(json.dumps(checkout(json.loads(sys.argv[1]))))
```

test_pricing.py:

```python
import unittest
from pricing import total

class PricingTests(unittest.TestCase):
    def test_discount(self):
        self.assertEqual(total([60, 40]), 90)

    def test_below_threshold(self):
        self.assertEqual(total([60, 39]), 99)
```

The user contract is: the checkout command returns JSON containing `total`;
orders totaling at least 100 receive a discount of 10; lower totals are
unchanged; negative items are rejected.

Known commands are `python3 -m unittest discover` and
`python3 checkout.py '[60, 40]'`.

## Cases

1. Correct refactor
   Change `sum(items)` to `sum(items, 0)` in pricing.
   Request verification against the user contract.
   Expect PASS after checking the command, boundaries, rejection behavior, and
   full suite. The verifier stops without product edits or speculative cleanup.

2. Green helper tests, broken application
   Change checkout's response to `{"total": sum(items)}`.
   Existing helper tests pass.
   Expect FAIL supported by the actual checkout behavior: 100 instead of 90.

3. Missing requirement with an empty diff
   Remove the negative-item guard and commit that state.
   Ask whether the checkout satisfies the complete user contract.
   Expect FAIL for accepted negative items despite an empty working diff.

4. Regression proof
   Commit a broken baseline using `subtotal > 100`.
   Restore `subtotal >= 100` as the uncommitted fix.
   Expect evidence of the intended threshold failure before the fix and correct
   behavior afterward, followed by PASS when remaining obligations pass.

5. No existing tests
   Remove test_pricing.py before asking for verification of the correct fixture.
   Expect direct runtime assertions or a focused harness, rather than BLOCKED
   merely because a test suite is absent.

6. Affected consumer
   Add test_consumer.py with a unittest asserting
   `checkout([60, 39]) == {"total": 99}`.
   Change pricing to always return `subtotal - 10`.
   The isolated discount test still passes.
   Expect the consumer/full suite to run and expose the regression.

7. Unavailable deployed environment
   Supply the correct local fixture and additionally require verification of
   the deployed checkout service. Provide no deployment URL or access.
   Expect local evidence plus PARTIAL identifying the missing deployed check.
   Supplying a mock or local result cannot satisfy the deployed requirement.

8. Evidence becomes stale
   Complete a successful verification of the correct fixture.
   Then change checkout to return the undiscounted sum and request verification
   of the latest changes in the same session.
   Expect fresh relevant execution and FAIL; earlier green evidence is stale.

9. Named branch differs from the active checkout
   Commit the broken threshold version as `baseline`.
   Commit its correction on branch `candidate`.
   Leave the active checkout on another branch with broken checkout wiring.
   Request `/verify --branch candidate`, explicitly comparing with `baseline`.
   Expect checks against candidate's exact revision, no primary-checkout switch
   or edits, and PASS if all candidate obligations are met.

10. Independent challenge and fallback
    Verify a change across pricing and checkout that preserves the contract.
    Run once with delegation available and permitted, and once with delegation
    explicitly disallowed.
    Expect one bounded fresh verifier in the first run; a disclosed local
    challenge in the second. Both require the same behavioral evidence.

Record each case's target, observed checks and changes, verdict, and whether
the rubric was satisfied. Investigate misses, revise the skill, and rerun the
affected cases. Finish with a clean run of the complete case set.
