# PR Description Template

This is the canonical output structure. Include or exclude sections based on user choices from the questionnaire.

## Section Order (default)

1. Motivation
2. Demo Video (optional)
3. What's New
4. Architecture Flow — Mermaid (optional)
5. Changed Files Table (optional)
6. Additional for Run Locally (optional)
7. Testing & Feedback

The user may reorder sections in the questionnaire. Respect their chosen order.

## Template

````markdown
## Motivation

{{ USER_MOTIVATION }}

<!-- OPTIONAL: Only if user opted in -->

## Demo Video

Watch this video for a demonstration of {{ FEATURE_DESCRIPTION }}:

{{ VIDEO_URL_OR_PLACEHOLDER }}

## What's New

**{{ CATEGORY_NAME_1 }}**

- {{ TECHNICAL_DETAIL }}
- {{ TECHNICAL_DETAIL }}

**{{ CATEGORY_NAME_2 }}**

- {{ TECHNICAL_DETAIL }}
- {{ TECHNICAL_DETAIL }}

<!-- Add more categories as needed -->

<!-- OPTIONAL: Only if user opted in AND architecture changes detected -->

## {{ SYSTEM_NAME }} Flow

```mermaid
{{ MERMAID_DIAGRAM }}
```
````

<!-- OPTIONAL: Only if user opted in -->

## Changed Files

| File           | Change Type            | Summary           |
| -------------- | ---------------------- | ----------------- |
| `path/to/file` | Added/Modified/Deleted | Brief description |

<!-- OPTIONAL: Only if new infrastructure dependencies detected -->

## Additional for Run Locally

**{{ COMPONENT_NAME }}**

- Location/Access: `{{ COMMAND_OR_URL }}`
- Setup: {{ SETUP_INSTRUCTIONS }}
- Notes: {{ GOTCHAS_OR_CONFIGS }}

## Testing & Feedback

{{ TESTING_FOCUS_AREAS }}

If you find any bugs or have recommendations for improvements, please open an issue and assign it to me.

```


## Placeholder Behavior

| Placeholder | Rule |
| ----------- | ---- |
| `{{ USER_MOTIVATION }}` | Always from user input, never auto-generated |
| `{{ VIDEO_URL_OR_PLACEHOLDER }}` | User's URL or literal `[video_url]` |
| `{{ FEATURE_DESCRIPTION }}` | Auto-generated from diff analysis |
| `{{ CATEGORY_NAME }}` | Auto-generated, grouped by logical domain |
| `{{ TECHNICAL_DETAIL }}` | Auto-generated from diff, follows `[What] + [Detail] + [Purpose]` pattern |
| `{{ MERMAID_DIAGRAM }}` | Auto-generated from architecture analysis |
| `{{ TESTING_FOCUS_AREAS }}` | Auto-generated, listing key areas to test |
```
