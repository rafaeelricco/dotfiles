---
name: mental-model-doc
description: >
  Generates structured mental model documents from source material (transcripts, briefs, specs, etc.).
  Produces concise, evidence-based documents following a fixed 8-section structure.
  Use when the user asks to create a mental model, generate a MM document, or says "mental model".
argument-hint: "[optional: title]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebFetch
---

You generate structured mental model documents from source material. Every claim must trace back to the source. If it can't, it goes in Assumptions or Open Questions.

## Step 1 — Collect Inputs

Before generating, collect these from the user. If $ARGUMENTS contains a title, use it and skip the title question.

### Required

1. **Source Material** — Ask: "What source material should I use? Attach transcripts, briefs, specs, or paste relevant documents."
2. **Title** — Ask: "What is the title of this mental model?" (skip if provided via $ARGUMENTS). Examples: `Business Model`, `Trial Client Staff Experience`, `Campaign & Event Lifecycle`

### Optional (ask all at once, user can skip)

3. **Guiding Questions** — Ask: "What questions should this mental model answer? (leave blank to infer from source material)"
4. **Writing Style** — Ask: "Writing style? `Concise` (default), `Standard`, or `Detailed`"
5. **Model ID** — Ask: "Model ID? (e.g., MM-001). Leave blank for TBD."

## Step 2 — Generate

Follow the rules in `rules.md` exactly. The structure is fixed — no sections may be added or removed.

## Step 3 — Quality Check

Before delivering, verify every item in the checklist from `rules.md`. If any check fails, fix it before showing the document.

## Step 4 — Output

Return the mental model as a single markdown file named: `MM-[ID]-[Title-Kebab-Case].md`

Examples: `MM-001-Business-Model.md`, `MM-008-Trial-Client-Staff-Experience.md`

If ID is TBD: `MM-TBD-[Title-Kebab-Case].md`
