---
name: e2e-test
description: >-
  Run a guided end-to-end test of a running web app after a feature is finished
  or any time you need to validate real behavior in a browser. Use whenever the
  user finishes building or changing a feature, asks to test the app E2E,
  smoke-test it, click through the UI, verify a flow works end-to-end, check the
  happy path, or confirm a change works in a real browser, even if they do not
  say "E2E". The skill first discovers how the app actually works from its
  codebase and the conversation, then confirms where the app is running, whether
  to drive it with the in-app Browser plugin or @chrome, and any required login
  credentials, then walks the app toward the goal and reports pass/fail with
  screenshots, console errors, and failed network calls.
---

# E2E Test

Drive a running web app through a real user flow and report whether it works.
This is happy-path acceptance testing of live behavior, not writing an automated
test suite. Run it right after finishing a feature, or whenever asked to test an
app end-to-end.

The trap to avoid: **guessing the flow.** Apps rarely work the way you would
assume. A role might be switched by a widget in the header, not by seeded data;
an entry point might be a modal, not a page. Plan from how the code actually
works, discovered fresh, not from a plausible story.

## 1. Scope from the conversation

Start from what is already known. Identify the feature under test and the goal
from the current session: what was just built or changed, and which files were
touched. If the goal is not clear, ask what success looks like. Everything
downstream is grounded in this.

## 2. Discover how it really works

Before planning clicks, map the real mechanics from the codebase. Do read-only
local discovery first: inspect changed files, routes, components, test fixtures,
package scripts, and nearby patterns. Capture real routes, exact UI labels,
preconditions, auth and role mechanics, success states, and gotchas.

See `references/discovery.md` for the discovery checklist and optional
delegation prompt. Only use `multi_agent_v1.spawn_agent` when the user
explicitly asks for sub-agents, delegation, or parallel agent work; otherwise do
the discovery yourself.

If the source is not available, discover by exploring the live app instead:
navigate and read pages to learn the real controls before committing to a plan.

## 3. Draft the grounded walkthrough and confirm

Turn the findings into a concrete step list that uses the real controls
discovered, such as "switch to the agency role via the role widget in the
header" rather than "seed an agency membership". Show it to the user and let
them correct it before anything is clicked. This is the cheapest moment to catch
a wrong assumption.

## 4. Environment interview

Collect what is needed to drive the app:

1. **Where is the app running?** Ask for the URL or `host:port`, such as
   `http://localhost:3000`. If it is not running, offer to start it with the
   project's dev command, then continue.
2. **Browser or @chrome?** Ask which engine to drive with:
   - Browser plugin -> `references/codex-browser.md`
   - @chrome plugin -> `references/codex-chrome.md`
3. **Credentials?** Ask for the login the flow needs and have the user paste it.
   Treat anything pasted as a secret: never echo it back, write it to a file, put
   it in a screenshot, or commit it. Skip this when the flow needs no auth.

Use the in-app Browser plugin for local app testing by default. Use @chrome when
the task needs the user's Chrome profile, existing tabs, cookies, extensions, or
remote authenticated sessions.

If an action you need is not covered by the selected reference, use
`tool_search` to expose the needed Browser, Chrome, or Node REPL tool.

## 5. Run the pass

Open the URL, authenticate, then drive toward the goal in small steps. Per step:

1. Snapshot the DOM or accessibility tree to find real elements; do not guess
   selectors.
2. Perform one action: click, fill, submit, navigate, or wait for the expected
   state.
3. Observe with the cheapest useful signal: screenshot for visual state, DOM for
   locators, console logs for runtime errors, and network requests for 4xx/5xx
   failures.
4. Decide pass/fail before moving on.

A flow that looks right but logs a 500 or a relevant console error has failed.
If a step blocks you, stop and report rather than flailing. If reality
contradicts discovery findings, say so plainly.

## 6. Report inline

Summarize in chat and write nothing to the repo:

- Each step with pass/fail against the goal.
- Key screenshots of important states.
- Any relevant console errors and failed 4xx/5xx network requests.
- A final verdict: **goal met**, **not met**, or **blocked**, with the reason.

Redact credentials from everything you show. If the app was not reachable or the
selected browser engine was unavailable, say so plainly instead of guessing the
outcome.
