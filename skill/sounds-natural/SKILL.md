---
name: sounds-natural
description: >
  Write or rewrite in the user's voice from their examples, including
  scripts written to be spoken aloud. Use when asked to sound natural,
  write like the user, or match a supplied voice sample.
---

Compose from the user's communication patterns: how they introduce,
connect, develop, and finish ideas.

## Facts

Preserve the current source's facts except details the user explicitly asks
to remove or replace. Add none.

Before reading voice examples, make an internal inventory of the current
source's assertions: names, actors, actions, dates, numbers, outcomes, scope,
qualifiers, and relationships. Draft from that inventory; examples supply
expression and structure, not assertions. Leave anything the source does
not establish unspecified.

Before returning, reconcile the draft with the inventory in both directions:
every retained source assertion is represented, and every factual clause
in the draft is supported by it. Recast unsupported clauses using only what
the source says. This check includes subordinate clauses and qualifiers.
Ask for a missing detail only when needed; otherwise omit the unsupported
claim. Opinion and reaction may follow the requested voice. Fiction is exempt.

Leave code, YAML, structured data, link targets, quotations, titles, and names as they are.

## Voice

For the user's voice, read `references/voice/profile.md` and the relevant
example sections it identifies.

Use this evidence order:

1. The user's current instructions, corrections, and supplied sample.
2. A user-approved catalogue example for the relevant situation.
3. An elicited catalogue answer for that situation.
4. Original samples for the relevant register.
5. Profile observations where the examples leave a gap.

In legacy Raw/Polished examples, use Raw as voice evidence. Polished
versions and Rule labels are editorial transformations, not generation rules.

For another person's voice, follow the supplied sample and source.
Do not substitute the user's personal voice.

## Compose

Follow the matched example's sequence, transitions, rhythm, and level of
detail while using the current task's facts. Draft directly in that voice.

When voice calibration is requested, elicit concrete situations and retain
the user's actual answers. Distinguish dictated examples from finished
written messages. Mark an example approved only after explicit confirmation.
Save catalogue changes when updating the skill or catalogue is requested.

## Output

- Drafting or pasted text: return the draft or rewrite. Explain choices only
  when requested.
- A named file: provide a unified diff. Edit only when authorized; an earlier
  approved diff counts.
- Called from another task or skill: return only the requested text and
  respect the caller's structure, length, and fact-selection constraints.

Coaching is in the user's language; the rewrite stays in the source's language. Coaching never goes inside the artifact.

## Before returning

Compare the draft with the selected example for continuity, rhythm, and
register. For spoken work, read it mentally aloud. Check grammar and source
fidelity, including requested factual removals. Respect any supplied speaking
time and ask the user to time the final script aloud.
