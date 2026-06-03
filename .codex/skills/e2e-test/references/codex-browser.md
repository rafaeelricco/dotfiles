# Codex Browser - E2E cheat sheet

Use the in-app Browser plugin for local and in-app targets such as
`localhost`, `127.0.0.1`, `::1`, `file://`, or a page already shown inside
Codex.

Before browser work, read and follow the Browser skill
(`browser:control-in-app-browser`) when it is available. If the required tools
are not visible, use `tool_search` for `node_repl js` and Browser control.

## Workflow

- Connect to the in-app Browser through the Browser plugin's Node REPL
  browser-client setup.
- Name the browser session for the task, then open or select the target tab.
- Use DOM snapshots before interaction; act on real accessible names and visible
  controls, not guessed selectors.
- Prefer Playwright locators where possible. Use screenshots when visual state
  matters.
- After navigation, form submission, modal open/close, menu changes, or failed
  locators, take a fresh DOM snapshot before the next action.
- After each meaningful action, check the page state plus console and network
  signals when available.

## What to capture

- Screenshots of important states, especially the final success or failure state.
- Relevant console errors, warnings, and failed 4xx/5xx requests.
- The observed URL and visible confirmation, toast, row, card, modal, or state
  that proves whether the goal was met.

Keep the browser hidden unless the user asked to watch, open, or keep the page in
front of them.
