# PR Body Template

Default order below. Respect a different order if the user chose one. Sections
marked optional appear only when the user opted in.

````markdown
## Motivation

{{ USER_MOTIVATION }}

<!-- optional -->

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

<!-- optional; architecture change only -->

## {{ SYSTEM_NAME }} Flow

```mermaid
{{ MERMAID_DIAGRAM }}
```

<!-- optional -->

## Changed Files

| File           | Change Type            | Summary           |
| -------------- | ---------------------- | ----------------- |
| `path/to/file` | Added/Modified/Deleted | Brief description |

<!-- only when the diff adds a dependency, service, or env var -->

## Additional for Run Locally

**{{ COMPONENT_NAME }}**

- Location/Access: `{{ COMMAND_OR_URL }}`
- Setup: {{ SETUP_INSTRUCTIONS }}
- Notes: {{ GOTCHAS_OR_CONFIGS }}

## Testing & Feedback

{{ TESTING_FOCUS_AREAS }}

If you find any bugs or have recommendations for improvements, please open an issue and assign it to me.
````
