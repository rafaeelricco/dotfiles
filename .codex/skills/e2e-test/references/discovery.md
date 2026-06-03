# Discovery - map the real mechanics before planning clicks

Goal: replace assumptions about the user flow with how the app actually works,
read from the codebase and the conversation about what changed. Findings must be
concrete: real routes, exact control labels, real preconditions, and gotchas.

## How to run it

1. Seed from context: the feature under test, the goal, and the changed files.
2. Do read-only local discovery first. Inspect relevant routes, components,
   forms, API calls, fixtures, package scripts, and nearby tests.
3. Ask only when the missing detail is product intent or runtime information that
   the repo cannot answer.
4. Synthesize the findings into one grounded picture, then draft the walkthrough.

## Question checklist

Adapt the checklist to the app and skip what is irrelevant:

- **Routing / entry point** - what URL or navigation reaches the feature? Is it a
  page, modal, wizard step, or nested tab?
- **Auth & roles / permissions** - how does the tester become the role the flow
  needs? Is there an in-app role or org switcher, or does it require a different
  login?
- **Preconditions & data** - what must exist first, such as an org, parent
  record, feature flag, seed, or prior setup flow?
- **Feature behavior** - what are the real fields, steps, validations, loading
  states, success states, and empty states?
- **Exact controls** - what labels, button text, field names, menu items, and
  links should the walkthrough target?
- **Gotchas** - async delays, projection lag, confirmations, redirects, disabled
  states, background jobs, or network calls that can make a naive click-through
  look wrong.

## Optional explorer agents

Use `multi_agent_v1.spawn_agent` only when the user explicitly asks for
sub-agents, delegation, or parallel agent work. If authorized, spawn read-only
explorer agents in parallel with one distinct question each. Do not spawn agents
by default.

Prompt template:

> You are exploring a codebase read-only to support an end-to-end test.
> Context: <feature under test, goal, changed files>.
> Answer ONE question: <the specific question>.
> Return concrete, actionable findings: exact routes/URLs, exact UI control
> labels, required preconditions, and gotchas, each with the file path you found
> it in.
> Do not propose a test plan; just report how this part actually works.

Keep each agent's scope tight; overlapping agents waste budget and muddy the
synthesis.
