---
name: linkedin
description: >
  Audit and rewrite a LinkedIn presence end to end: positioning, keywords, photo, cover,
  headline, About, experience, the sections below the fold, SSI score, post strategy,
  recruiter outreach, and a 21-day execution plan. Use when the user wants to write or
  improve any part of their LinkedIn profile, asks why recruiters are not responding, wants
  to know what to post, how to approach a recruiter, or how to raise their SSI — including
  "optimize my LinkedIn", "improve my profile", "rewrite my about section", "my headline is
  generic", "what should I post on LinkedIn", "how do I message a recruiter", "my SSI is
  low". Do NOT use for resume or CV writing, and never post, message, or connect on the
  user's behalf.
---

# LinkedIn

A recruiter spends 5 seconds and must leave with three facts: the area, the target role, the
seniority. Every area below serves that. Output is en-US.

## Routing

Match the user's free text against this table.

| Signal                                                                             | Area          | Read                        |
| ---------------------------------------------------------------------------------- | ------------- | --------------------------- |
| positioning, focus, niche, target role, keywords, SEO, discoverability             | `positioning` | `references/positioning.md` |
| title, headline, tagline                                                           | `headline`    | `references/headline.md`    |
| about, summary, bio                                                                | `about`       | `references/about.md`       |
| experience, role, job description, bullets                                         | `experience`  | `references/experience.md`  |
| skills, languages, education, courses, recommendations, URL, open to work, premium | `sections`    | `references/sections.md`    |
| photo, headshot, banner, cover, header image                                       | `visuals`     | `references/visuals.md`     |
| SSI, score, social selling index, connections, network                             | `ssi`         | `references/ssi.md`         |
| post, content, what to publish, comments, engagement                               | `content`     | `references/content.md`     |
| connection request, DM, message, InMail, approach a recruiter                      | `outreach`    | `references/outreach.md`    |
| plan, routine, where do I start, 21 days                                           | `plan`        | `references/plan.md`        |
| full profile, everything, whole thing                                              | `all`         | profile areas, in order     |

1. Exactly one row matches → run that area. Do not offer the others.
2. Two or more rows match, zero rows match, or no argument at all → staged area chooser, below.
3. Named area is outside this table → say so plainly and stop. Do not improvise doctrine.

### Staged area chooser

The only place a menu appears. Never more than four options per `AskUserQuestion` (tool schema
limit), so it runs in two calls. Most likely option first, `(Recommended)` appended to its label.

**Call 1 — group:**

- Profile copy (`positioning` / `headline` / `about` / `experience`)
- Profile setup (`visuals` / `sections`)
- Off-profile growth (`ssi` / `content` / `outreach`)
- Full program (`all` / `plan`)

**Call 2 — the areas inside the chosen group.** Skip it when the group holds one area.

`all` means the profile, not everything this skill knows: `positioning` → `headline` →
`about` → `experience` → `sections` → `visuals`, in that order. Visuals last — the cover is
the least load-bearing artifact on the page. Off-profile growth is `plan`'s job; say so
rather than silently widening.

Read only the reference the routed area names. One named area → one file. `all` is the sole
multi-file route. `plan` loads `references/plan.md` and nothing else.

## Source

Facts needed before writing: target role and adjacent titles; the ranked keyword list;
employment status; current profile text; past roles with what was done and what came of it.

Lookup order:

1. Already stated in this conversation.
2. A path given in the invocation ("use `<path>` as source"). List it, then read only files
   that plausibly carry those facts — structured data (`*.yaml`, `*.json`), a resume
   (`*.tex`, `*.md`, `*.pdf`), a LinkedIn export, achievement notes. Never assume filenames.
   Read-only: never write into the source.
3. Ask, once, batched — only for what steps 1-2 left missing. Do not re-ask a found fact.

No path given and nothing in conversation → skip to step 3.

Source files may be in any language. Extract the facts, write the output in en-US.

## Interview

Skip this whole section when Source already yielded both the target role and the problem solved.
`## Source` forbids re-asking a found fact, and that rule wins here: a user who opened with their
target role and keywords wants copy back, not the questionnaire.

Otherwise ask this verbatim, as a message, and wait:

```text
What role do you want this profile to attract, and what is the one problem you solve for an employer? A couple of sentences is enough.
```

Never an option list — the answer is the user's own prose, and it feeds every area.

Then one `AskUserQuestion`, at most four questions, only for facts still missing after Source:

- **Keywords** — the terms recruiters search, ranked, pre-filled from the source when found.
  `positioning` owns the list; each consuming area owns its own count.
- **Employment status** — currently employed or not. Gates About block 5 and Open to Work,
  and is asked here so no reference asks it twice.
- **Seniority framing** — how the target level should read.
- **Target market** — where the roles are, since role naming differs by region.

Recommended option first, `(Recommended)` appended to its label.

## Output

**Generative areas** (`headline`, `about`, `experience`, `content`, `outreach`) → exactly 3
labeled variants, each in its own fenced block. Paste blocks are full prose, never the
session's shorthand. LinkedIn caps the headline at 220 characters and About at 2600; check
before emitting.

**Advisory areas** (`positioning`, `visuals`, `sections`, `ssi`, `plan`) → current-state
read, then exactly 3 prioritized fixes, each with a ready-to-use example.

**Audit mode** — any area, when asked to review rather than write: read the current state
against that reference's checklist, then the same 3 prioritized fixes. References carry
checklist items only; they do not restate this contract.

Close with a short list of what changed, and a question list for anything the source left
blank.

## Writing rules

Apply to every area:

- No generic or subjective phrases.
- Direct and scannable.
- Market language, no buzzwords.
- Never invent information. A missing fact is a question at the end, not a guess in the copy.
- Do not exceed what each block needs.
- Impact, not tasks. Results without numbers still count.
- Technical over behavioral. LinkedIn is technical screening; behavior is assessed in the
  interview.

## When NOT to use

- Resume or CV writing — this is LinkedIn copy only
- Posting, messaging, or connecting on the user's behalf — this skill drafts, the user sends
- Generating the cover image itself — briefs only
- Estimating an SSI score — the user reads it at `linkedin.com/sales/ssi`
- Interview preparation

## Source material

Transcribed from a LinkedIn course, 31 lessons. Where the course is silent, say so rather
than improvising. Where the course contradicts the live platform, the platform wins — say
that out loud.

Course outcome statistics ("21x more views", "9x more contacts") are motivation, not
evidence: keep the action, drop the number. Never present one as the reason for a
recommendation.

References are cut by deliverable, not by course module. Do not restore a 1:1 module mapping.
