---
name: linkedin
description: >
  Rewrite and audit LinkedIn profile sections: positioning, headline, About,
  experience, keywords, cover image, and SSI score. Use when the user wants to write
  or improve a LinkedIn headline, About/summary, experience descriptions, profile
  keywords, or banner, or asks why recruiters are not responding — including
  "optimize my LinkedIn", "improve my profile", "rewrite my about section", "help me
  write a better title", "my headline is generic". Do NOT use for post or content
  strategy, connection requests, InMail replies, recommendations, endorsements, or
  resume/CV writing.
---

# LinkedIn Profile

A recruiter has 5 seconds to read three things off a profile: the area, the target role, and the
seniority level. Every area below serves that. Output is en-US.

## Routing

Match the user's free text against this table.

| Signal                                     | Area          | Where                      |
| ------------------------------------------ | ------------- | -------------------------- |
| title, headline, tagline                   | `headline`    | `references/headline.md`   |
| about, summary, bio                        | `about`       | `references/about.md`      |
| experience, role, job description, bullets | `experience`  | `references/experience.md` |
| keywords, SEO, search, discoverability     | `keywords`    | inline                     |
| banner, cover, header image                | `cover`       | inline                     |
| positioning, focus, niche, target role     | `positioning` | inline                     |
| SSI, score, social selling index           | `ssi`         | inline                     |
| full profile, everything, whole thing      | `all`         | every area, in table order |

1. Exactly one row matches → run that area. Do not offer the others.
2. Two or more rows match, zero rows match, or no argument at all → one `AskUserQuestion` listing the
   areas, most likely first with `(Recommended)`. This is the only place a menu appears.
3. Named area is outside this table → say so plainly and stop. Do not improvise doctrine.

## Source

Facts needed before writing: target role and adjacent titles; the 5 keywords; current profile text;
past roles with what was done and what came of it.

Lookup order:

1. Already stated in this conversation.
2. A path given in the invocation ("use `<path>` as source"). List it, then read only files that
   plausibly carry those facts — structured data (`*.yaml`, `*.json`), a resume (`*.tex`, `*.md`,
   `*.pdf`), a LinkedIn export, achievement notes. Never assume filenames. Read-only: never write
   into the source.
3. Ask, once, batched — only for what steps 1-2 left missing. Do not re-ask a fact already found.

No path given and nothing in conversation → skip to step 3.

Source files may be in any language. Extract the facts, write the output in en-US.

## Interview

Ask this verbatim, as a message, and wait:

```text
What role do you want this profile to attract, and what is the one problem you solve for an employer? A couple of sentences is enough.
```

Never an option list — the answer is the user's own prose, and it feeds every area.

Then one `AskUserQuestion`, at most four questions, only for facts still missing after Source:

- **Keywords** — the 5 terms recruiters search, pre-filled from the source when found.
- **Seniority framing** — how the target level should read.
- **Target market** — where the roles are, since role naming differs by region.
- Area-specific slot named by the reference file.

Recommended option first, `(Recommended)` appended to its label.

## Output

**Generative areas** (`headline`, `about`, `experience`) → exactly 3 labeled variants, each in its own
fenced block. Paste blocks are full prose, never the session's shorthand. LinkedIn caps the headline at
220 characters and About at 2600; check before emitting.

**Advisory areas** (`positioning`, `keywords`, `cover`, `ssi`) → current-state read, then exactly 3
prioritized fixes, each with a ready-to-use example.

Close with a short list of what changed, and a question list for anything the source left blank.

## Writing rules

Apply to every area:

- No generic or subjective phrases.
- Direct and scannable.
- Market language, no buzzwords.
- Never invent information. A missing fact is a question at the end, not a guess in the copy.
- Do not exceed what each block needs.
- Impact, not tasks. Results without numbers still count.

## Positioning

One focus, chosen in three steps:

1. **Trajectory** — where the experience already is, where the most value is generated, where the
   market recognizes it fastest.
2. **Market** — where the demand is, what recruiters search for most, where returns already arrive.
3. **Pick one** role, one area, one seniority level. Not two.

The 5-second test: open the profile cold and name the area, the target role, and the seniority. Any
one of the three unreadable → the positioning failed, whatever else is good.

Raises perceived value: clear positioning, objective language, the right keywords, a coherent
history, demonstrated impact. Signals reliability: an organized profile, a consistent message, a
clear focus, professionalism throughout.

Six errors:

- Confusing profile — several areas at once
- Generic or inflated headline
- Long, empty text
- Excessive focus on tasks
- Internal company language the market does not parse
- A profile trying to please everyone

## Keywords

Pick 5. The **same** 5 appear in the headline, in the About section, and across the experience
descriptions — repetition is what makes the profile findable.

The recruiter is not the only reader. The ranking algorithm needs the same signals, which is why the
terms have to be literal and repeated rather than implied once.

Relevance over volume. A keyword that does not describe real work hurts both ranking and
credibility, so drop it rather than pad the list.

Draw candidates from the target role's job ads, not from the current job title.

## Cover

Errors:

- Generic phrases
- Random images
- Motivational quotes
- A cover with no relation to the profile
- Too much information, or none

What attracts: a clean cover, short text, market language, immediate clarity, a professional visual.
Less text, more clarity, one direct message.

This area returns a written brief for the image, not the image itself.

## SSI

The Social Selling Index is LinkedIn's own 0-100 score of how strategically the account is used, not
how much it is used. Four pillars, 25 points each. **Ideal: above 60.**

| Pillar                              | Measures                                                                          | Most common error                              |
| ----------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1 Establish your professional brand | Profile clarity, structure, keyword use, completeness, recommendations, authority | Generic profile, pasted resume, vague headline |
| 2 Find the right people             | Who is connected, whether the network serves the goal, connection quality         | Connecting with no one, or with anyone         |
| 3 Engage with insights              | Activity, likes, comments, relevant interactions                                  | A dead profile that never reacts to anything   |
| 4 Build relationships               | Quality of interactions, real exchanges, inbox conversations                      | Sending the invite and never interacting again |

Pillar 2 counts a network that serves the goal: recruiters, people already in the target area, and
hiring managers. A random network scores the same as no network.

Pillar 1 is the only one this skill's other areas move directly. For 2-4, the fixes are behavioral —
say so, and give three concrete weekly actions rather than profile copy.

The user reads their own score at `linkedin.com/sales/ssi`. Never estimate it for them.

## When NOT to use

- Post or content strategy, engagement, commenting
- Connection requests, InMail, outreach, referral asks
- Recommendations, endorsements, Skills section ordering
- Resume or CV writing — this is LinkedIn copy only

## Reference files

Read only the one the routed area names. Do not load more than one.

| File                       | Read when                                   |
| -------------------------- | ------------------------------------------- |
| `references/headline.md`   | Writing or auditing the headline            |
| `references/about.md`      | Writing or auditing the About section       |
| `references/experience.md` | Writing or auditing experience descriptions |

## Source material

Transcribed from a LinkedIn profile course (30 slides) and three prompt templates. Where the course
is silent, say so rather than improvising.
