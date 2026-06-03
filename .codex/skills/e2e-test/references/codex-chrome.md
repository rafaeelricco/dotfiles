# Codex @chrome - E2E cheat sheet

Use [@chrome](plugin://chrome@openai-bundled) when the test needs the user's
Chrome browser: existing tabs, logged-in profile, cookies, extensions, or remote
authenticated apps.

Before Chrome work, read and follow the Chrome skill (`Chrome:control-chrome`)
when it is available. If the required tools are not visible, use `tool_search`
for Chrome control and `node_repl js`.

## Workflow

- Connect through the Chrome plugin's Node REPL browser-client setup.
- Run the plugin's lightweight Chrome connection check before navigation.
- For an already-open user tab, list open tabs and claim only a tab returned by
  that listing. Do not guess tab IDs.
- For a new flow, open a tab at the target URL and authenticate only as needed.
- Use DOM snapshots and Playwright locators where possible. Use screenshots when
  visual state matters.
- After each meaningful action, check page state plus console messages and
  network requests for relevant errors or 4xx/5xx failures.

## Safety

- Do not inspect cookies, local storage, browser profiles, passwords, or session
  stores.
- Treat credentials and auth artifacts as secrets. Do not echo, persist,
  screenshot, or commit them.
- If Chrome, the extension, or native host connection is unavailable, report that
  clearly and follow the Chrome skill's recovery rules.

## Cleanup

Before ending a turn after Chrome work, finalize tabs according to the Chrome
skill. Keep only a deliverable or handoff tab that the user needs; otherwise let
the plugin close or release intermediate tabs.
