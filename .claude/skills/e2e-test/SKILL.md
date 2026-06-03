---
name: e2e-test
description: >-
  Run a guided end-to-end test of a running web app after a feature is finished
  or any time you need to validate real behavior in a browser. Use whenever the
  user finishes building or changing a feature, or asks to test the app E2E,
  smoke-test it, click through the UI, verify a flow works end-to-end, check the
  happy path, or confirm a change works in a real browser — even if they don't
  say "E2E". The skill first interviews for where the app is running, whether to
  drive it with Claude Preview or Claude in Chrome, the login credentials, and
  the goal to validate, then walks the app toward that goal and reports pass/fail
  with screenshots, console errors, and failed network calls.
---

# E2E Test

Drive a _running_ web app through a real user flow and report whether it works.
This is happy-path acceptance testing of live behavior — not writing an automated
test suite. Run it right after finishing a feature, or whenever asked to test an
app end-to-end.

## 1. Setup interview

Ask these before touching the app. Don't assume answers — wrong setup wastes the
whole run.

1. **Where is the app running?** Get the URL or `host:port` (e.g.
   `http://localhost:3000`). If it isn't running yet, offer to start it — use the
   `run` skill or the project's dev command — then continue once it's up.
2. **Claude Preview or Claude in Chrome?** Ask which engine to drive the app with
   (use `AskUserQuestion`). The two are interchangeable for clicking/typing/reading;
   the user's environment decides which is available and preferable.
3. **Credentials?** Ask what login or credentials the flow needs and have the user
   paste them. If the flow needs no auth, skip. Treat anything pasted as a secret:
   never echo it back, never write it to a file, never include it in a screenshot
   or the final summary, never commit it.
4. **Goal?** If a concrete goal isn't already clear from the conversation, ask what
   success looks like (e.g. "create a campaign and see it in the list"). If it is
   clear, restate it in one line and confirm before proceeding.

## 2. Load the engine reference

After the user picks the engine, read the matching cheat-sheet and use those tools:

- **Claude Preview** → `references/claude-preview.md`
- **Claude in Chrome** → `references/claude-in-chrome.md`

If an action you need isn't in the cheat-sheet, find the exact tool with
`ToolSearch` (these MCP tools are deferred in-session).

## 3. Run the pass

Open the URL, authenticate with the provided credentials, then drive toward the
goal in small steps. The loop for each step:

1. Take a DOM/a11y snapshot to find the real elements (don't guess selectors).
2. Perform one action (click, fill, submit).
3. Observe: screenshot the result, and check the console and network for errors.
4. Decide pass/fail for that step before moving on.

Keep steps small and observe before continuing — a flow that "looks" right but
logs a 500 or a console error has failed. If a step blocks you (element missing,
auth fails), stop and report rather than flailing.

## 4. Report inline

Summarize in chat (write nothing to the repo):

- Each step with ✅ / ❌ against the goal.
- Key screenshots of important states.
- Any console errors and any failed (4xx/5xx) network requests, with the request.
- A final verdict: **goal met**, **not met**, or **blocked**, with the reason.

Redact credentials from everything you show. If the app wasn't reachable or the
engine wasn't available, say so plainly instead of guessing the outcome.
