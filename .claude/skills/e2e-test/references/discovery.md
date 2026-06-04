# Discovery — map the real mechanics before planning clicks

Goal: replace assumptions about the user flow with how the app actually works, read
straight from the code (and the conversation about what just changed). These findings
drive the walkthrough, so they must be concrete: real routes, exact control labels,
real preconditions.

## How to run it

1. Seed from context: the feature under test, the goal, and the changed files.
2. Spawn read-only Explore sub-agents in parallel — one distinct question each. Scale
   to scope: ~2 for a small, familiar feature; up to ~10 for a large or unfamiliar
   one. Don't spawn 10 by default — match the count to the open questions.
3. Synthesize the returns into one grounded picture, then draft the walkthrough.

## Question checklist (adapt to the app — skip what's irrelevant)

- **Routing / entry point** — what URL or navigation actually reaches the feature?
  Is it a page, a modal, a step in a wizard, or a nested tab?
- **Auth & roles/permissions** — how do you become the role the flow needs? Is there
  an in-app switcher (a role/org widget), or does it require seeded data or a
  different login? This is the most common wrong assumption.
- **Preconditions & data** — what must exist first (an org, a parent record, a
  feature flag, a seed, a prior setup flow)? How is it normally created?
- **The feature's real behavior** — read the feature's own code: the actual fields,
  steps, validations, loading states, and success/empty states. What does "it
  worked" look like on screen?
- **Exact controls** — the real labels, button text, field names, menu items, and
  links to act on, so the walkthrough targets what's actually rendered.
- **Gotchas** — async/projection delays, confirmation dialogs, redirects, disabled
  states, background jobs — anything that trips up a naive click-through.

## Sub-agent prompt template

> You are exploring a codebase read-only to support an end-to-end test.
> Context: <feature under test, goal, changed files>.
> Answer ONE question: <the specific question>.
> Return concrete, actionable findings — exact routes/URLs, exact UI control labels,
> required preconditions, and gotchas — each with the file path you found it in.
> Do not propose a test plan; just report how this part actually works.

Keep each agent's scope tight; overlapping agents waste budget and muddy the
synthesis.
