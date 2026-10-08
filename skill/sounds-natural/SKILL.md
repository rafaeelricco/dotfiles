---
name: sounds-natural
description: >
  Write or rewrite text so it sounds human, and like the user when it's
  theirs. Use when asked to humanize or de-slop text, write in the user's
  voice, or match a writing sample.
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

Keep what already sounds natural, and keep human detail: odd specifics, asides, self-corrections, uneven sentence length. Don't add roughness to seem human: forced fragments, a short-long seesaw, or planted slips read as machine-made too.

## Tells to remove

These make text read as machine-written. Remove them from the output. When judging someone else's text, one alone proves nothing; look for clusters. Three or more in one paragraph mean the paragraph was generated: rewrite it from its facts instead of swapping words.

`scripts/detect.py` matches every quoted phrase below in English text; a single word also matches its longer forms (leverage, leveraging), and X, Y, Z, and … stand for any words. After editing this list, run `python3 -m unittest discover -s tests` from this folder: it checks that each phrase is caught and that the voice examples stay clean.

- Stacked self-labels (passionate, results-driven expert). Give the example instead.
- Inflated significance: "stands as", "serves as", "testament", "pivotal", "key role", "landscape", "underscore", "marks a shift".
- Sales and stock words: "vibrant", "seamless", "stunning", "leverage", "boast", "groundbreaking", "nestled", "game-changer", "delve", "tapestry", "realm", "intricate", "utilize", "foster", "streamline", "showcase", "garner", "bolster", "meticulous", "deep dive", "move the needle".
- An -ing tail that only inflates: ", highlighting X", ", underscoring X", ", showcasing X", ", emphasizing X".
- "Not X, but Y", "It's not just X, it's Y", "Stop X, start Y", and objections nobody raised: "To be clear", "This isn't about".
- Lists padded to three, or one idea under three synonyms.
- Announcing or dramatizing: "Let's dive in", "Here's the thing", "Here's what", "Here's why", "Here's how", "Honestly?", "Let me be honest", "Real talk", "Unpopular opinion", "The real question is", "The result?", "The catch?", "No X. No Y. Just Z.", "Let that sink in", a row of one-line punchlines.
- Stock openers and closers: "I'm excited to announce", "I'm excited to share", "thrilled to share", "In today's fast-paced world", "In conclusion", "In summary", "To summarize", "Looking ahead", "Thoughts?", "Agree or disagree?", "Let me know in the comments", "Tag someone".
- Chatbot wrappers inside the artifact: "Certainly!", "You're absolutely right", "Great question", "I hope this helps", "Want me to…?", an upbeat send-off.
- Filler and hedges on known facts: "It is important to note", "It's worth noting", "in order to", "could potentially".
- Em and en dashes, unless the voice or sample uses them.
- Decorative bold, bold-label bullet lists, Title Case headings, emoji on headings.
- Vague sources ("experts say", "studies show") and guesses dressed as facts ("while details are limited").
- Generation leftovers: "oaicite", "contentReference", "turn0search", "[Your Name]", "As of my last update", "As of my knowledge cutoff".

## Output

- Pasted text: one or two lines on what sounded off, then the rewrite.
- A named file: that note plus a unified diff. Edit the file only when the user has authorized edits; approving an earlier diff counts.
- Called from another task or skill: only the rewritten text.

Coaching is in the user's language; the rewrite stays in the source's language. Coaching never goes inside the artifact.

Never promise the text will pass an AI detector: detectors disagree with each other on the same text.

## Before returning

Pipe the rewrite through `python3 <skill-dir>/scripts/detect.py` (add `--allow-dashes` when the voice uses dashes) and fix each hit the voice or sample doesn't allow; hits inside names and quotations stay. Then reread it once: every source fact is present, nothing new was added, no tell remains, and in the user's voice the profile's grammar corrections are applied.
