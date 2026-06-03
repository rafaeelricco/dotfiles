---
name: e2e-test
description: >-
  Run a guided end-to-end test of a running web app after a feature is finished
  or any time you need to validate real behavior in a browser. Use whenever the
  user finishes building or changing a feature, or asks to test the app E2E,
  smoke-test it, click through the UI, verify a flow works end-to-end, check the
  happy path, or confirm a change works in a real browser — even if they don't
  say "E2E". The skill first discovers how the app actually works from its codebase
  and the conversation, then interviews for where the app is running, whether to
  drive it with Claude Preview or Claude in Chrome, and the login credentials, then
  walks the app toward the goal and reports pass/fail with screenshots, console
  errors, and failed network calls.
---

# E2E Test

Drive a _running_ web app through a real user flow and report whether it works.
This is happy-path acceptance testing of live behavior — not writing an automated
test suite. Run it right after finishing a feature, or whenever asked to test an
app end-to-end.

The trap to avoid: **guessing the flow.** Apps rarely work the way you'd assume —
a role might be switched by a widget in the header, not by seeding a membership; an
entry point might be a modal, not a page. Plan from how the code _actually_ works,
discovered fresh, not from a plausible-sounding story.

## 1. Scope from the conversation

Start from what's already known. Identify the feature under test and the goal from
the current session — what was just built or changed, and which files were touched
(check the diff and the conversation). If the goal isn't clear, ask what success
looks like. Everything downstream is grounded in this.

## 2. Discover how it really works

Before planning a single click, map the real mechanics from the codebase. Spawn
read-only Explore sub-agents in parallel — scale to scope: a couple for a small,
familiar feature; up to ~10 for a large or unfamiliar flow. Give each agent one
distinct question so they don't overlap, and have them return concrete findings
(real routes, exact UI control labels, preconditions, gotchas, file references).

See `references/discovery.md` for the question checklist and the sub-agent prompt
template. The point is to surface what you'd otherwise assume wrong — auth and
role/permission mechanics, the actual UI entry points, required setup or data, and
how each step is really performed.

If the source isn't available (a remote app with no repo), discover by exploring the
live app instead — navigate and read pages to learn the real controls before
committing to a plan.

## 3. Draft the grounded walkthrough and confirm

Turn the findings into a concrete step list that uses the real controls discovered
(e.g. "switch to the agency role via the role widget in the header" — not "seed an
agency membership"). Show it to the user and let them correct it before anything is
clicked. This is the cheapest moment to catch a wrong assumption.

## 4. Environment interview

Now collect what's needed to drive the app:

1. **Where is the app running?** URL or `host:port` (e.g. `http://localhost:3000`).
   If it isn't running, offer to start it (the `run` skill or the project's dev
   command), then continue.
2. **Claude Preview or Claude in Chrome?** Ask which engine to drive with
   (use `AskUserQuestion`), then read the matching cheat-sheet:
   - Claude Preview → `references/claude-preview.md`
   - Claude in Chrome → `references/claude-in-chrome.md`
3. **Credentials?** Ask for the login the flow needs and have the user paste it.
   Treat anything pasted as a secret: never echo it back, write it to a file, put it
   in a screenshot, or commit it. Skip if the flow needs no auth.

If an action you need isn't in the cheat-sheet, find the tool with `ToolSearch`
(these MCP tools are deferred in-session).

## 5. Run the pass

Open the URL, authenticate, then drive toward the goal in small steps. Per step:

1. Snapshot the DOM/a11y tree to find real elements (don't guess selectors).
2. Perform one action (click, fill, submit).
3. Observe: screenshot the result, check the console and network for errors.
4. Decide pass/fail before moving on.

A flow that "looks" right but logs a 500 or a console error has failed. If a step
blocks you, stop and report rather than flailing — and if reality contradicts the
discovery findings, say so plainly (discovery may have missed something).

## 6. Report inline

Summarize in chat (write nothing to the repo):

- Each step with ✅ / ❌ against the goal.
- Key screenshots of important states.
- Any console errors and any failed (4xx/5xx) network requests, with the request.
- A final verdict: **goal met**, **not met**, or **blocked**, with the reason.

Redact credentials from everything you show. If the app wasn't reachable or the
engine wasn't available, say so plainly instead of guessing the outcome.
