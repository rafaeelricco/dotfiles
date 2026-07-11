---
name: meeting-notes-and-actions
description: Turn raw meeting transcripts, call notes, long meeting chats, product demo notes, or client implementation discussions into quick share-ready notes, build-guide style recaps, decisions, risks, and owner-tagged action items. Use for transcript cleanup, Slack/email-ready recaps, actionable build guides, priority briefs, and concise follow-up lists; use summarize-meeting for formal meeting records, templates, scoring, tracking scripts, or fuller meeting operations.
---

# Meeting Notes & Actions

Process transcripts, rough notes, long meeting chats, and product demo notes
into concise recaps, build guides, and action items.

## Use This vs. `summarize-meeting`

- Use this skill for quick transcript cleanup, lightweight follow-up summaries,
  share-ready recaps, and implementation-oriented build guides.
- Use `summarize-meeting` for formal meeting records, reusable templates,
  scoring, tracking scripts, strict metadata tables, and fuller meeting
  operations.
- If the user asks for a formal meeting record, metadata table, action-item
  table, storage or distribution guidance, do not handle it in this skill.
  Respond that it is a `summarize-meeting` task and switch to that skill when
  available.

## Inputs

Use what the user already provided before asking for more. Ask only for missing
details that materially change the output:

- Source: pasted transcript, rough notes, chat log, or file path.
- Meeting context: title, date, attendees, and handles.
- Output style: terse bullets, narrative recap, action-item format, due dates,
  owner tags, build-guide format, and redaction rules.

## Output Modes

- Quick recap: use for Slack/email summaries and lightweight follow-ups.
- Build guide: use for product demos, prototype reviews, workflow corrections,
  roadmap discussions, implementation priorities, or client build direction.

Build guide outputs should include only supported sections:

- Header context: title, `Source`, `Scope`, and `Timeline note` when known.
- Target model or core correction: include a step/actor/output table when useful.
- Actionable edits: group by product area and use checkboxes.
- Priority briefs: use `What`, `Why`, `Scope`, and `Done when`.
- Dependencies and sequencing: list owners, gates, and follow-ups when supplied.

## Workflow

1. Normalize text: strip noisy timestamps or repeated speaker labels when they
   distract, lightly clean filler words, and keep quoted statements intact.
2. Extract essentials: agenda topics, key decisions, open questions, risks, and
   blocked items.
3. Draft action items: capture who, what, and when. Convert vague asks into
   concrete tasks, but do not invent owners, dates, or completion status.
4. Produce the notes in the selected output mode. Quick recap mode uses:
   - `Summary`
   - `Decisions`
   - `Open Questions/Risks`
   - `Action Items`
5. Build guide mode uses the structure in `Output Modes`.
6. Run quality checks: keep names consistent, avoid hallucinated facts, and flag
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
- In build guide mode, use `[x]` only for work explicitly done, validated, or
  already working in the source. Use `[ ]` for pending work and follow-ups.
- Do not invent architecture, owners, deadlines, dependencies, issue numbers, or
  completion status. Do not turn relative timing into exact dates unless the
  source states the exact date. Mark unsupported details as `TBD` or open
  questions.

## Optional Extras

- Include a timeline of major moments if useful timestamps exist.
- Include a two- or three-sentence Slack/email blurb before the full notes.
- Separate risks from open questions when the meeting has enough material to
  make that split useful.
