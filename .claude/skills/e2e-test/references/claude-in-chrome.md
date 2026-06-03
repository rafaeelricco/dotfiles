# Claude in Chrome — E2E cheat-sheet

Drive the app with the `mcp__Claude_in_Chrome__*` tools.

| Need to…                     | Tool                                |
| ---------------------------- | ----------------------------------- |
| Check a browser is connected | `list_connected_browsers`           |
| Pick / switch browser        | `select_browser` / `switch_browser` |
| Open a tab / go to URL       | `tabs_create_mcp` / `navigate`      |
| Read the page                | `read_page` / `get_page_text`       |
| Find an element/text         | `find`                              |
| Click / type / screenshot    | `computer`                          |
| Fill form fields             | `form_input`                        |
| Upload a file                | `file_upload` / `upload_image`      |
| Read console output          | `read_console_messages`             |
| Inspect network calls        | `read_network_requests`             |

Tips:

- Confirm a browser is connected (`list_connected_browsers`) before navigating.
- Prefer `find` / `read_page` to locate elements over blind `computer` coordinates.
- After each action, check `read_console_messages` and `read_network_requests`
  for errors a screenshot won't show.
