---
name: linkedin
description: >
  Draft and audit LinkedIn profile copy and growth plans: positioning, headline, About,
  experience, below-the-fold sections, visuals, SSI, posts, recruiter outreach, and a
  21-day plan. Drafts only. Never post, message, or connect on the user's behalf. Not for
  resumes, interview prep, SSI score estimates, or cover image generation.
---

# LinkedIn

A recruiter spends 5 seconds and must leave with three facts: the area, the target role, the
seniority. Every area below serves that.

**Turn order** (per area, including each step of `all`): select area → Source → if Audit,
require the current state → Interview only if gated → load the area reference → Output
mode → draft → Close.

## Area selection

Match the user's request against this table.

| Signal                                                                             | Area          | Read                        |
| ---------------------------------------------------------------------------------- | ------------- | --------------------------- |
| positioning, focus, niche, target role, keywords, SEO, discoverability             | `positioning` | `references/positioning.md` |
| title, headline, tagline                                                           | `headline`    | `references/headline.md`    |
| about, summary, bio                                                                | `about`       | `references/about.md`       |
| experience, job description, bullets, responsibilities                             | `experience`  | `references/experience.md`  |
| skills, languages, education, courses, recommendations, URL, open to work, premium | `sections`    | `references/sections.md`    |
| photo, headshot, banner, cover, header image                                       | `visuals`     | `references/visuals.md`     |
| SSI, score, social selling index, connections, network                             | `ssi`         | `references/ssi.md`         |
| post, content, what to publish, comments, engagement                               | `content`     | `references/content.md`     |
| connection request, DM, message, InMail, approach a recruiter                      | `outreach`    | `references/outreach.md`    |
| plan, routine, where do I start, 21 days, optimize everything, grow my LinkedIn    | `plan`        | `references/plan.md`        |
| full profile, whole profile, rewrite my profile                                    | `all`         | profile areas, in order     |

Select the area with the rules below. Career transition, career change, pivot, first job,
first LinkedIn, internship, or no experience yet never match the table and never create an
area ID — after selection, apply that area’s transition / first-job guidance from its
reference when it has any.

Before the table, in this order:

- **Continuation.** A `continue` / `next` / `yes` reply while an `all` chain is active, or
  while an area is held from rule 2, skips this table: run the next area in the `all` order,
  or the held area, in the Output mode that chain or hold started in — `audit my full
  profile` stays an audit at every step. A new instruction in the same reply ("now rewrite
  it") replaces the mode.
- **Excluded deliverable.** A request for something under **When NOT to use** — the
  generated image itself, an SSI score estimate, a resume, interview prep, or sending on the
  user's behalf — is not covered; say so and stop, even when the wording carries a table
  signal (`cover`, `SSI`, `score`, `post`, `message`). The in-scope neighbour (cover brief,
  SSI guidance, post draft) runs only when the user asks for it.
- **Metrics read.** A request to read, interpret, or diagnose the profile's own search
  appearances or profile views — including "which job titles are finding me" and why a
  title appears there — routes to `ssi`, **Reading the metrics** only. The `title` signal
  does not win here. Post and engagement analytics are `content`, not this route. Asking how
  to raise those numbers is not a read: alone or alongside a read ("views dropped, how do I
  fix it"), it falls through to the table.

Then apply the rules below in order; the first that fits wins. Do not invent areas or rules.

1. One row matches → that area only.
2. Multiple rows match and one is clearly named (`rewrite my about`, `fix my headline`,
   `open to work`) → that area only this turn. Hold the rest for **Output → Close**.
3. Zero matches, no argument, or no clear lead, but still a LinkedIn deliverable this skill
   covers → staged area chooser, below.

### Staged area chooser

The only place a menu appears. Never more than four options per `AskUserQuestion` (tool schema
limit), so it runs in two calls. Most likely option first, `(Recommended)` appended to its
label. If `AskUserQuestion` is unavailable, ask the same choices as a short numbered list
in one message; never treat silence as approval.

**Call 1 — group:**

- Profile copy (`positioning` / `headline` / `about` / `experience`)
- Profile setup (`visuals` / `sections`)
- Off-profile growth (`ssi` / `content` / `outreach`)
- Full profile or 21-day plan (`all` / `plan`) — different products; Call 2 always picks

**Call 2 — the areas inside the chosen group.** Skip it when the group holds one area.
When the group is Full profile or 21-day plan, Call 2 options are exactly:

- Full profile (`all`) — section-by-section profile only `(Recommended)` when intent is vague
- 21-day plan (`plan`) — schedule including growth weeks

`all` means the profile, not everything this skill knows: `positioning` → `headline` →
`about` → `experience` → `sections` → `visuals`, in that order. Visuals last — the cover is
the least load-bearing artifact on the page. One area per turn; wait for continue before
the next. Never dump the full chain in one response. Content, SSI, and outreach belong to
`plan` (or a separate ask), not to `all`.

Use only the reference file named for the chosen area. One area → one file. `all` is the
only case that uses more than one file, in order. For `plan`, use `references/plan.md`
alone.

## Source

Use what is already known. Put the rest in `[brackets]` with a clear label (e.g.
`[target company]`) in the draft and list questions at the end. Same placeholder vocabulary
everywhere in this skill.
Interview is **not** always next — see **Interview** (area-gated). Audit/review needs the
current state first — see **Output**.

Lookup order:

1. Already stated in this conversation.
2. A path given in the invocation ("use `<path>` as source"). List it, then read only files
   that plausibly carry those facts — structured data (`*.yaml`, `*.json`), a resume
   (`*.tex`, `*.md`, `*.pdf`), a LinkedIn export, achievement notes. Never assume filenames.
   Read-only: never write into the source.
3. Continue to Interview **only if** that section’s gate says so. Do not re-ask a found fact.
   Do not run a full questionnaire for optional details before drafting.

No path given and nothing in conversation → step 3 (Interview gate may still skip).

## Interview

**May Interview:** `positioning`, `headline`, `about`, `experience`, `outreach`, and those
steps under `all` (once at the start of the profile chain is enough — do not re-interview
each step).

**Never Interview:** `visuals`, `sections`, `ssi`, `content`, `plan`, pure Audit mode, or
non-copy steps of `all`.

For gated areas only, after Source — ask only what is still missing:

- Target role **and** problem solved known → skip; draft.
- Neither known → ask this verbatim and wait:

```text
What role do you want this profile to attract, and what is the one problem you solve for an employer? A couple of sentences is enough.
```

- Role known, problem missing:
  - `positioning` or `about` → ask once for the problem only (one short message); wait.
  - `experience` or `outreach` → draft; put problem in `[brackets]`.
  - `headline` → draft; the format has no problem slot — only `[Keyword]`, per the
    reference.
- Problem known, role missing → ask once for the target role only; wait.

Never an option list for these answers. Never re-ask a found fact.

After any answer (or skip), **draft**. Keywords, employment status, seniority framing, and
target market: Source when present; else `[brackets]` and questions at the end.
`positioning` owns the ranked keyword list when that area runs; other areas use their own
counts from the reference.

One `AskUserQuestion` (≤4 options, recommended first) **only if** the user refuses
`[brackets]` and insists on filling facts before any draft — never as the default path.

## Output

Pick **one** mode for the turn:

1. **Audit** — user asked to review/audit only → the area's current state required (paste,
   image, or Source path): text for copy areas, the photo or cover for `visuals`, the
   existing routine for `plan`. For `ssi`, the readings the audited subtopic rests on and
   that subtopic's checklist items alone — a connections / network audit takes the
   connection count and target-field composition; a whole-`ssi` audit takes the score and
   the analytics readings. Missing → ask once for that artifact and wait; do not invent a
   checklist read. Then checklist + exactly 3 prioritized fixes. No Interview. References
   carry checklist items only.
2. **Paste, no write/audit verb** — profile/section paste without “rewrite” / “audit” /
   “review” → one turn: up to 3 prioritized fixes, then generative or advisory form for
   that area. Do not stop at audit-only unless the user said review-only.
3. **Write / rewrite / improve / fix** (with or without paste), other than a `plan` schedule
   request (mode 4) → generative or advisory form for the area. With paste, optional short
   fix list then the normal form — not audit-only.
4. **`plan` schedule** — user wants the 21-day routine → deliver the schedule from
   `references/plan.md`. Use advisory “3 fixes” only when reviewing an existing routine.
5. Otherwise by area class (below).

**Exception — metrics-only diagnosis** (overrides whichever mode was picked): any request
the **Metrics read** pre-rule sent to `Reading the metrics` needs the analytics readings
alone — never the SSI score — and returns just the fixes the data supports, zero to three,
with no SSI checklist and never padded to three.

**Variant labels:** `Variant 1 — <emphasis>`, `Variant 2 — <emphasis>`, `Variant 3 — <emphasis>`.
Each in its own fenced block. Paste blocks are full prose, never session shorthand.

**Generative areas** (`headline`, `about`, `experience`, `content`, `outreach`) → exactly 3
labeled variants. LinkedIn caps: headline 220 characters, About 2600; check before
emitting. Prefer shorter headlines — several surfaces truncate well before 220. Experience:
4–6 responsibilities and a Results block per role. Outreach: ~80 words. Content comments:
2–4 lines.

**Draft-first:** missing optional details appear as `[brackets]` in the paste blocks. Never
invent numbers, employers, or skills to fill a slot.

**Advisory areas** (`positioning`, `visuals`, `sections`, `ssi`; and `plan` only when not
delivering the schedule) → if current state is known, read it, then exactly 3 prioritized
fixes each with a ready-to-use example. If current state is unknown: say so (or ask once);
give 3 generic prioritized fixes — never invent “your profile currently…”.

**Close** (only after an area deliverable — variants, advisory fixes, audit-then-rewrite,
or a full `plan` schedule — not after a chooser or the Interview question alone):
(1) short list of what changed, (2) questions for blank source facts, (3) exactly one
next-step offer only if: other areas were held from selection rule 2, or this is `all` and
the next chain step remains, or the user already accepted a next-step. Do **not** upsell
content, SSI, or outreach by default.

## Writing rules

Apply to every area.

**Do**

- Direct, scannable, market wording — no buzzwords or generic/subjective filler.
- Prefer ownership, production delivery, and product outcomes over duty lists.
- Results without numbers still count when they name a recognizable outcome.
- Missing facts → `[brackets]` in the draft and questions at the end.

**Do not**

- Invent numbers, employers, skills, or other facts.
- Exceed what the block needs.
- Use vanity volume metrics: PR counts/%, commit share, LOC, files changed, ticket
  counts without outcome, or similar “how much I touched” stats. Prefer what was
  owned, shipped, or made possible.
- Soft/behavioral framing on experienced profiles (`passionate`, `proactive`,
  `team player`, `highly skilled`). Career transition / first job: at most 1–2
  credibility traits, only when hard proof is missing — never instead of keywords
  or results. LinkedIn screens skills; behavior is for the interview.

## When NOT to use

- Resume / CV writing
- Posting, messaging, or connecting on the user’s behalf (draft only; user sends)
- Generating the cover image (briefs only)
- Estimating SSI (user reads `linkedin.com/sales/ssi`)
- Interview preparation

## Source material

Rules live by deliverable under `references/`. Where the original course is silent, say so
rather than improvising. Where the course contradicts the live platform, the platform wins —
say so plainly. Product contracts in this file (turn order, area selection, Interview gate,
Output modes, draft-first, vanity ban, soft-skill seniority) override course silence.

Course outcome statistics ("21x more views", "9x more contacts") are motivation, not
evidence: keep the action, drop the number. Never present one as the reason for a
recommendation.

References are cut by deliverable, not by course module. Do not restore a 1:1 module mapping.
