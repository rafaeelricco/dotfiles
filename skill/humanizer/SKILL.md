---
name: humanizer
description: >
  Use when the user runs /humanizer, asks to humanize text, strip AI-isms,
  remove AI slop, make prose sound less AI, add real voice, or match a writing
  sample. Triggers: humanize this, de-slop, anti-ai-slop, signs of AI writing,
  rewrite so a person wrote it. Not for inventing facts, rewriting code, or
  changing what the source says.
license: MIT
---

Rewrite so it reads like the writer, not a chatbot. Keep every claim. Do not invent facts.

Patterns from Wikipedia ["Signs of AI writing"](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing).

## What to do

1. **Find AI patterns** against the lists below.
2. **Keep every claim.** Shorten, expand, merge, or split freely. Do not drop information.
3. **Do not invent facts.** No new fact, name, number, date, quote, or citation unless it is in the source or from the user. If a sentence needs a missing detail, ask or simplify. Opinion or reaction is allowed when the writer's voice calls for it; a factual claim is not. Fiction is exempt: invented details are the task.
4. **Match the voice.** Formal, casual, or technical as the text requires. Personality only when the text and writer call for it.

## Match the writer's voice

If the user gives a writing sample, read it first. Note sentence length, word choice, paragraph openings, punctuation, repeated phrases, and transitions. Match those habits. Do not swap casual for formal or sand off quirks.

A sample overrides the style rules below. If it uses em dashes, keep them at about the same rate; do not apply §14 as a ban.

No sample → use the guidance below.

## Add personality only when it fits

Blog posts, essays, opinions, personal writing: keep opinions, uncertainty, mixed feelings, humor, asides, uneven rhythm.

Reference, technical, legal, factual: stay neutral. No opinions or first person where they do not belong.

Never invent facts to feel personal.

## Content patterns

### 1. Inflated claims about importance and legacy

**Watch:** stands/serves as, is a testament/reminder, a vital/significant/crucial/pivotal/key role/moment, underscores/highlights its importance/significance, reflects broader, symbolizing its ongoing/enduring/lasting, contributing to the, setting the stage for, marking/shaping the, represents/marks a shift, key turning point, evolving landscape, focal point, indelible mark, deeply rooted

Drop legacy / turning-point / broader-trend claims the source does not state.

### 2. Name-dropping to prove importance

**Watch:** independent coverage, local/regional/national media outlets, written by a leading expert, active social media presence

Outlet lists or follower counts with no context. Keep a citation when the source says what they said and where. Do not invent context.

### 3. Shallow analysis with -ing phrases

**Watch:** highlighting/underscoring/emphasizing..., ensuring..., reflecting/symbolizing..., contributing to..., cultivating/fostering..., encompassing..., showcasing...

Cut the -ing clause that only inflates a simple fact.

### 4. Sales language

**Watch:** boasts a, vibrant, rich (figurative), profound, enhancing its, showcasing, exemplifies, commitment to, natural beauty, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, must-visit, stunning

### 5. Vague sources

**Watch:** Industry reports, Observers have cited, Experts argue, Some critics argue, several sources/publications (when few cited)

Name a source only when the source text provides one. Else keep the claim as written or ask; do not drop it. Never invent a source.

### 6. Formulaic challenges and outlook sections

**Watch:** Despite its... faces several challenges..., Despite these challenges, Challenges and Legacy, Future Outlook

Stock challenges / future / continued-growth sections. Dates or public actions only from the source or user.

## Language and grammar patterns

### 7. Overused AI words

**Watch:** Actually, additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, gate/gated/gating (figurative; preserve established technical usage), highlight (verb), interplay, intricate/intricacies, key (adjective), landscape (abstract noun), pivotal, quietly, showcase, tapestry (abstract noun), testament, underscore (verb), valuable, vibrant

Especially in clusters.

### 8. Avoiding is and are

**Watch:** serves as/stands as/marks/represents [a], boasts/features/offers [a]

Prefer _is_, _are_, _has_.

### 9. Not X but Y and clipped negative endings

"Not only...but...", "It's not just X, it's Y." Clipped tails like "no guessing" → a real clause.

### 10. Forced groups of three

Do not pad to three items for completeness.

### 11. Changing names and repeating sentence openings

One clear name per subject (no synonym cycling). Repeated openings: merge, change subject, or start with the action. Do not ban the repeated word; the remaining sentence may still start with "She."

### 12. False from X to Y ranges

"from X to Y" only when X and Y are a real range.

### 13. Passive voice and missing subjects

Active voice when it makes the actor clearer. Restore dropped subjects ("No configuration file needed" → "You do not need a configuration file").

## Style patterns

### 14. Em and en dashes

Final rewrite: no em dash (—) or en dash (–) unless the sample uses them. Replace with period, comma, colon, parentheses, or a rewrite. Also spaced dashes and `--`. Before returning, search for `—` and `–`. Sample present → match its rate.

**Sample uses em dashes (keep at that rate):**
Sample: `I kept the old name—the new one felt like a lie. We shipped Friday—nobody slept.`

> The term is primarily promoted by Dutch institutions—not by the people themselves. You don't say "Netherlands, Europe" as an address—yet this mislabeling continues—even in official documents.
> **Keep:**
> Dutch institutions promote the term—not the people themselves. You don't say "Netherlands, Europe" as an address—the mislabeling still turns up even in official documents.

### 15. Too much bold text

Do not bold words without a reason.

### 16. Lists with bold mini-headings

No vertical list where every item is **Label:** restatement. Fold into prose.

### 17. Title case in headings

Do not capitalize every main word.

### 18. Emojis

No decorative emojis on headings or list items.

### 19. Curly quotation marks

Straight quotes ("...") unless the writer or target format uses curly.

## Chatbot patterns

### 20. Chatbot text left in the answer

**Watch:** I hope this helps, Of course!, Certainly!, You're absolutely right!, Would you like..., Want me to...?, Want me to give examples?, Should I continue?, let me know, here is a...

Greetings, offers, closings. The text should stand alone.

### 21. Knowledge-limit disclaimers and guesses

**Watch:** as of [date], Up to my last training update, While specific details are limited/scarce..., based on available information, not publicly available, maintains a low profile, keeps personal details private, prefers to stay out of the spotlight, likely [grew up/studied/began], it is believed that

State what the source does not show, or cut the sentence. Do not present a guess as a fact.

### 22. Overly agreeable tone

No praise or agreement before the answer.

## Filler and hedging

### 23. Filler phrases

- "In order to achieve this goal" → "To achieve this"
- "Due to the fact that it was raining" → "Because it was raining"
- "At this point in time" → "Now"
- "In the event that you need help" → "If you need help"
- "The system has the ability to process" → "The system can process"
- "It is important to note that the data shows" → "The data shows"

### 24. Too many qualifiers

**Watch:** to be fair, it's also possible, could potentially, might arguably, in some cases it may, this is an inference

Keep a qualifier only when the source supports it and the meaning needs it. Drop caveats that only repair an earlier overstatement.

### 25. Generic positive endings

Vague optimism as a send-off. End on the last concrete fact. Real plans from the source stay.

### 26. Too many hyphenated word pairs

**Watch:** third-party, cross-functional, client-facing, data-driven, decision-making, well-known, high-quality, real-time, long-term, end-to-end

Hyphen before a noun (`a high-quality report`). Drop after (`the report is high quality`).

### 27. Pretending to reveal a deeper truth

**Watch:** The real question is, at its core, in reality, what really matters, fundamentally, the deeper issue, the heart of the matter

Replace with the specific claim.

### 28. Announcing the next point

**Watch:** Let's dive in, let's explore, let's break this down, here's what you need to know, now let's look at, without further ado, heads up, quick note, before I forget

Casual "one thing that bit me" is the same tell. Remove the announcement, not just the formal tone.

### 29. A heading repeated in the first sentence

Heading plus a one-line restatement before the real content. Delete the restatement.

### 30. Writing about the previous version

Current behavior only. Previous version belongs in change logs, release notes, migration guides, and other documents about change.

### 31. Forced punchlines and dramatic fragments

One short sentence can emphasize. A row of fragments is forced.

### 32. Formulaic sayings

**Watch:** X is the Y of Z, X becomes a trap, X is not a tool but a mirror, the language of, the currency of, the architecture of

Replace with the specific claim.

### 33. Fake-candid openings

**Watch:** Honestly?, Look, Here's the thing, The thing is, Let's be honest, Real talk — as standalone hooks before an ordinary point. Mid-sentence "honestly" / "look" is ordinary; leave it.

### 34. Answering objections no one raised

**Watch:** This isn't (mainly/really) about, I'm not saying/arguing/trying to, To be clear, Don't get me wrong, This is not to say, You could argue/frame this differently but, Some might say... but

Unattributed "what I don't mean," especially when the topic appears nowhere else. A direct claim ("the API is not thread-safe") is not this pattern. Remove only the unsupported defense. If it has a real claim, state that claim. Keep an objection the text names or answers in full.

> This isn't mainly about prompt length, and I'm not arguing that documentation doesn't matter. You could categorize the problem another way, but the issue is whether the agent can use the instruction when it acts.
> **After:**
> The issue is whether the agent can use the instruction when it acts.

### 35. Rejecting fake alternatives

**Watch:** A tempting option/approach would be, One might be tempted to, An obvious approach would be, You might think... but, It would be easy to just, Some would suggest

An option no reader would consider, rejected, never used again. One rejected option may be valid. Several short unrelated rejections are a stronger sign. Ask what new information each sentence adds. If it only records an earlier edit, rewrite the paragraph around its main point.

## Check for false positives

### What not to flag

None of these, alone, is proof:

- **Perfect grammar and consistent style.** Polish ≠ AI.
- **Mixed casual and formal styles.** Field, age, habit.
- **"Bland" or "robotic" prose.** AI has _specific_ tells. Dry without those is just dry.
- **Formal or academic words.** §7 is the list. Do not simplify every formal word.
- **Letter-style opening or closing on a comment.** Salutations predate ChatGPT.
- **Common transition words in isolation.** _Additionally_, _moreover_, _consequently_ count only in piles. One _however_ is not a tell.
- **Curly quotes alone.** macOS, Word, Docs, CMSes auto-curl. Counts only stacked with other tells.
- **Em dashes alone.** Editors and journalists use them. Evidence only with formulaic sales-y rhythm.
- **One short sentence for emphasis.** Flag fragments only in a row.
- **Deliberate repeated openings.** "She came. She saw. She conquered." Change only when the repetition adds nothing.
- **"Honestly" or "look" mid-sentence.** Ordinary. The tell is the standalone theatrical opener.
- **Useful limits and disclaimers.** Scope, legal/safety, real corrections, named objections, replies, FAQ answers.
- **Real alternatives.** Keep options a reader may consider in a design doc, tutorial, or argument. Remove only an unlikely option the text dismisses and never uses again.
- **Unsourced claims.** Most of the web is unsourced. Lack of citations proves nothing.
- **Correct, complex formatting.** Visual editors and templates produce clean output.
- **Secondhand text.** Do not rewrite watched phrases inside quotations, titles, proper names, or examples where the phrase is discussed, not used.

Several patterns together beat one isolated tell.

### Human details to keep

Keep unless they hurt meaning:

- **Specific, unusual details.** A real address, an odd quote, "the lawyer who used to work upstairs from my dentist."
- **Mixed feelings and unresolved tension.**
- **Dated, era-bound references.** Slang, memes, in-jokes tied to a year and subculture. Models lag.
- **Deliberate first-person choices.** Keep a cut the writer can explain.
- **Variety in sentence length.** Real writing alternates. AI tends even and mid-length.
- **Genuine asides, parentheticals, self-corrections.**
- **Edits made before November 30, 2022.** ChatGPT public launch. Older text is almost never AI-written.

## How to return the result

**Pasted text (default).** Draft, a short list of remaining AI patterns, and the final rewrite.

**File mode.** User names a file → write only the final text to the file. Prose only. Keep code blocks, YAML metadata, data, and link targets. Then a short summary.

**Embedded mode.** Another task uses this skill for a PR, commit message, or document → return only the final text.

## Rewrite process

1. Read the source. Mark each AI pattern.
2. Draft. Read it aloud. Check rhythm, details, simple verbs (_is_, _has_), formality.
3. Two questions: what still sounds AI-generated? Did the rewrite add or remove any fact, name, number, date, quote, citation, ranking, or other claim? Unsupported addition or lost claim = error.
4. Final: state each point naturally; do not patch one flagged phrase at a time. Awkward sentence → rewrite the paragraph around its main point. Apply §14.
