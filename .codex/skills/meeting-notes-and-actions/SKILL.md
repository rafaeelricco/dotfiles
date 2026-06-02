---
name: meeting-notes-and-actions
description: Turn raw meeting transcripts, call notes, or long meeting chats into quick share-ready notes with decisions, risks, and owner-tagged action items. Use this lightweight skill for transcript-to-notes cleanup, Slack/email-ready recaps, and concise follow-up lists; use summarize-meeting for formal meeting records, templates, scoring, tracking scripts, or fuller meeting operations.
metadata:
  short-description: Meeting transcript to notes and actions
---

# Meeting Notes & Actions

Process transcripts, rough notes, and long meeting chats into structured notes and action items.

## Use this vs. `summarize-meeting`
- Use this skill for quick transcript-to-notes cleanup, lightweight follow-up summaries, and Slack/email-ready recaps.
- Use `summarize-meeting` for formal meeting records, reusable templates, scoring, tracking scripts, and richer meeting operations.

## Inputs to ask for
- Source: pasted transcript/text or file path; meeting title/date; attendees and their handles.
- Output style: terse bullets vs. narrative, action-item format, due date/owner tags, redaction rules if any.

## Workflow
1. Normalize text: strip timestamps/speaker labels if noisy; lightly clean filler words; keep quoted statements intact.
2. Extract essentials: agenda topics, key decisions, open questions, risks/blocked items.
3. Action items: who/what/when. Convert vague asks into concrete tasks; propose due dates if missing.
4. Produce output:
   - Header with meeting title, date, attendees.
   - Sections: `Summary`, `Decisions`, `Open Questions/Risks`, `Action Items` (checkboxes with owner + due).
5. Quality checks: ensure names are consistent; no hallucinated facts; flag ambiguities as clarifying questions.

## Optional extras
- Include timeline of major moments if timestamps exist.
- Provide short Slack/Email-ready blurb (2-3 sentences) plus the full notes.
