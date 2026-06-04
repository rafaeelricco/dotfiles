---
name: meeting-notes-and-actions
description: Turn raw meeting transcripts, call notes, or long meeting chats into quick share-ready notes with decisions, risks, and owner-tagged action items. Use this lightweight skill for transcript-to-notes cleanup, Slack/email-ready recaps, and concise follow-up lists; use summarize-meeting for formal meeting records, templates, scoring, tracking scripts, or fuller meeting operations.
---

# Meeting Notes & Actions

Process transcripts, rough notes, and long meeting chats into concise notes and
action items that can be shared in Slack, email, or a follow-up message.

## Use This vs. `$summarize-meeting`

- Use this skill for quick transcript cleanup, lightweight follow-up summaries,
  and share-ready recaps.
- Use `$summarize-meeting` for formal meeting records, reusable templates,
  scoring, tracking scripts, strict metadata tables, and fuller meeting
  operations.

## Inputs

Use what the user already provided before asking for more. Ask only for missing
details that materially change the output:

- Source: pasted transcript, rough notes, chat log, or file path.
- Meeting context: title, date, attendees, and handles.
- Output style: terse bullets, narrative recap, action-item format, due dates,
  owner tags, and redaction rules.

## Workflow

1. Normalize text: strip noisy timestamps or repeated speaker labels when they
   distract, lightly clean filler words, and keep quoted statements intact.
2. Extract essentials: agenda topics, key decisions, open questions, risks, and
   blocked items.
3. Draft action items: capture who, what, and when. Convert vague asks into
   concrete tasks, but do not invent owners or dates.
4. Produce the notes with a compact header and these sections:
   - `Summary`
   - `Decisions`
   - `Open Questions/Risks`
   - `Action Items`
5. Run quality checks: keep names consistent, avoid hallucinated facts, and flag
   ambiguities as clarifying questions or `TBD` fields.

## Output Rules

- Keep the default output concise enough to paste into Slack or email.
- Use checkbox action items with owner and due date when known:
  `- [ ] @owner - action text (Due: YYYY-MM-DD or TBD)`.
- If no decisions were made, say `No decisions captured`.
- If no action items were assigned, say `No action items captured`.
- Preserve sensitive redactions requested by the user.
- Include a short Slack/email blurb only when the user asks for a recap or when
  the source is long enough that a shareable lead-in would help.

## Optional Extras

- Include a timeline of major moments if useful timestamps exist.
- Include a two- or three-sentence Slack/email blurb before the full notes.
- Separate risks from open questions when the meeting has enough material to
  make that split useful.
