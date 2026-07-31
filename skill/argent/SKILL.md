---
name: argent
description: >
  Entry router for Software Mansion Argent (iOS/Android/TV/Chromium control via MCP).
  Use when the user invokes /argent, asks to test or QA a mobile/web app UI with Argent,
  drive a simulator/emulator, profile RN, or interact with a device through Argent tools.
---

# Argent router

Argent ships **many** skills (`argent-*`) plus MCP tools (`mcp__argent__*` / Argent server tools). This skill only routes.

## Prerequisites

1. MCP server `argent` registered (`argent mcp`). If tools missing, run:
   `scripts/mcp/install-mcp.ps1 -Mcp argent` (Windows) or `scripts/mcp/install-mcp.sh --mcp argent` (Unix).
2. Official pack under skill roots (same installer). If `/argent-test-ui-flow` unknown, re-run installer or:
   `npx --force skills add software-mansion/argent/packages/skills/skills#v$(argent --version) --skill '*' -y -g -a grok`

## Route (load the matching skill, then follow it)

| User intent                         | Skill to load                      |
| ----------------------------------- | ---------------------------------- |
| Test / QA / E2E UI / "test X"       | `argent-test-ui-flow`              |
| Tap / swipe / type / screenshot     | `argent-device-interact`           |
| Boot iOS sim                        | `argent-ios-simulator-setup`       |
| Boot Android emu                    | `argent-android-emulator-setup`    |
| Permissions grant/deny              | `argent-settings-permissions`      |
| TV / Fire TV / D-pad                | `argent-tv-interact`               |
| RN build / Metro / run              | `argent-react-native-app-workflow` |
| RN JS debug / component tree        | `argent-metro-debugger`            |
| RN profiler                         | `argent-react-native-profiler`     |
| Native profiler                     | `argent-native-profiler`           |
| Perf optimize                       | `argent-react-native-optimization` |
| Visual regression / screenshot diff | `argent-screenshot-diff`           |
| Screen recording                    | `argent-screen-recording`          |
| Record/replay flow                  | `argent-create-flow`               |
| Design variants (flag)              | `argent-lens`                      |

Default when user says **"/argent … test …"** without more detail → **`argent-test-ui-flow`**.

## Hard rules (do not skip)

- Never tap from screenshot pixels alone — always discovery first (`describe` / `debugger-component-tree`).
- Prefer running devices from `list-devices`.
- On session end: `stop-all-simulator-servers` when appropriate.

## Slash equivalents

- `/argent` → this router
- `/argent-test-ui-flow`, `/argent-device-interact`, … → official skills by name
