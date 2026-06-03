# Claude Preview — E2E cheat-sheet

Drive the app with the `mcp__Claude_Preview__preview_*` tools.

| Need to…                 | Tool                   |
| ------------------------ | ---------------------- |
| Open / attach at a URL   | `preview_start`        |
| See running previews     | `preview_list`         |
| Find elements (DOM/a11y) | `preview_snapshot`     |
| Click                    | `preview_click`        |
| Type into a field        | `preview_fill`         |
| Capture the screen       | `preview_screenshot`   |
| Read console output      | `preview_console_logs` |
| Inspect network calls    | `preview_network`      |
| Run JS in the page       | `preview_eval`         |
| Inspect one element      | `preview_inspect`      |
| Change viewport size     | `preview_resize`       |
| Close when done          | `preview_stop`         |

Tips:

- `preview_snapshot` before interacting — act on real elements, not guessed ones.
- After each action, glance at `preview_console_logs` and `preview_network` to
  catch errors a screenshot won't show.
- `preview_stop` the preview when the run is finished.
