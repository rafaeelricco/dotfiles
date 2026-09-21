---
name: sounds-natural
description: >
  Write or rewrite prose so it sounds like a person wrote it, and like the
  user when the text is theirs: Slack, email, LinkedIn, interview answers,
  resume lines. Triggers: in my voice, write like me, como eu escrevo,
  humanize this, de-slop, too scripted, tonalidade, match a writing sample.
  Not for code, or for changing what the source claims.
license: MIT
---

Make the text sound like a person, not a script or a chatbot. When the text is the user's, make it sound like the user.

## Facts

Keep every fact in the source and add none. A name, number, date, quote, source, outcome, or scope counts as a fact; take it only from the source or the user. If a sentence needs a detail you do not have, ask, or cut the claim. Opinion and reaction are fine when the voice calls for them. Fiction is exempt: invented detail is the task.

Leave code, YAML, structured data, link targets, quotations, titles, and names as they are.

## Voice

1. **The user's own text** (a message, email, post, resume line, or answer they will send or say): read `references/voice/profile.md`, then only the `##` section of the example file it names for this register and situation. The profile adds to the defaults below and wins wherever they conflict, including the tell list.
2. **A writing sample from the user**: match its sentence length, openings, punctuation, and quirks. The sample wins over the defaults.
3. **Anyone else's text**: the defaults.

## Defaults

Spoken (will be said aloud): one idea per sentence; light connectors (`so`, `and`) when they help; no fake hesitation. If the source has a speaking time, keep it and tell the user to time it aloud.

Written: the same plainness without imitating speech. Split any sentence over about 25 words, keeping the order of ideas. Opinion, humor, and asides fit essays and personal posts; reference, technical, and legal text stays neutral.

Keep what already sounds natural, and keep human detail: odd specifics, asides, self-corrections, uneven sentence length.

## Tells to remove

These make text read as machine-written. Remove them from the output. When judging someone else's text, one alone proves nothing; look for clusters.

- Stacked self-labels ("passionate, results-driven expert"). Give the example instead.
- Inflated significance: stands as, serves as, testament, pivotal, key role, landscape, underscores, marks a shift.
- Sales words: vibrant, seamless, stunning, leverage, boasts, groundbreaking, nestled.
- An -ing tail that only inflates ("…, highlighting its importance").
- "Not X, but Y", "It's not just X, it's Y", and objections nobody raised ("To be clear", "This isn't about").
- Lists padded to three, or one idea under three synonyms.
- Announcing or dramatizing: "Let's dive in", "Here's the thing", "Honestly?", "The real question is", a row of one-line punchlines.
- Chatbot wrappers inside the artifact: "Certainly!", "You're absolutely right!", "Great question", "I hope this
  helps", "Want me to…?", an upbeat send-off.
- Filler and hedges on known facts: "It is important to note", "in order to", "could potentially".
- Em and en dashes, unless the voice or sample uses them. Search the final text for `—` and `–`.
- Decorative bold, bold-label bullet lists, Title Case headings, emoji on headings.
- Vague sources ("experts say") and guesses dressed as facts ("while details are limited").

Tells adapted from Wikipedia's "Signs of AI writing" via blader/humanizer (see LICENSE).

## Output

- Pasted text: one or two lines on what sounded off, then the rewrite.
- A named file: that note plus a unified diff. Edit the file only when the user has authorized edits; approving an earlier diff counts.
- Called from another task or skill: only the rewritten text.

Coaching is in the user's language; the rewrite stays in the source's language. Coaching never goes inside the artifact.

## Before returning

Reread the rewrite once. Every source fact is present, nothing new was added, no tell remains, no dash unless the voice uses one, and in the user's voice the profile's grammar corrections are applied.
