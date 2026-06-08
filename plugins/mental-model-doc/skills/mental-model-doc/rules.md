# Generation Rules

## Document Structure

Every mental model follows this exact structure. **No sections may be added or removed.**

```markdown
# Mental Model: [Title]

| Field   | Value           |
| ------- | --------------- |
| ID      | [MM-XXX or TBD] |
| Version | 0.1 (draft)     |
| Author  | [leave blank]   |
| Date    | [today]         |
| Status  | Draft           |

## 1. Scope

## 2. Dependencies

## 3. Context

## 4. Key Concepts

## 5. Core Content

## 6. Assumptions

## 7. Open Questions

## 8. Implications
```

---

## Section-by-Section Rules

### 1. Scope

- Write `In Scope` as 2-3 sentences maximum describing what this model covers.
- Write `Out of Scope` as a bullet list. Each item should reference another model by name if known, or describe the excluded topic if the model doesn't exist yet.
- **Test:** If the scope can't be explained in 2-3 sentences, the model is too broad. Flag this to the user.

### 2. Dependencies

**DO NOT GENERATE THIS SECTION.** Write exactly:

```markdown
### Depends on

- _[To be filled manually]_

### Feeds into

- _[To be filled manually]_
```

The user must fill this in manually because only the human knows the full graph of mental models and how they relate.

### 3. Context

- 2-3 sentences explaining **why** this model was created — what decision, problem, or understanding gap it addresses.
- This is NOT a summary of the content. It's the justification for the model's existence.
- **Test:** If someone asks "why did you write this?", the Context is the answer.

### 4. Key Concepts

- Only include terms that appear 3+ times in the Core Content AND could be interpreted ambiguously by someone outside the project.
- Format: `**Term:** Definition in the context of this project.`
- Do NOT include obvious terms. Do NOT pad this section.
- If there are no ambiguous terms, write: _No ambiguous terms identified for this model._

### 5. Core Content

This is the body. Structure depends on the model type:

**For business/process models (Standard or Detailed style):**

- Organize by aspect of the domain (e.g., 5.1 What the company does, 5.2 Who pays, 5.3 How the cycle works)
- Each sub-section: factual description with `**Source:** [document name, speaker, timestamp if available]`

**For UX/UI experience models (Concise style):**

- Organize by screen or flow (e.g., 5.1 Navigation, 5.2 Dashboard, 5.3 Campaign Creation)
- Each sub-section uses:
  - **Elements:** bullet list of what's on the screen
  - **Functionality:** bullet list of how it behaves
  - **Assumption:** inline assumptions about this specific screen (prefix with "Assumption:")
  - **Design principle:** one-line note on the design intent if relevant

**Critical rules for all styles:**

- Every factual claim must cite a source document, or be moved to Assumptions.
- Do NOT invent information. If the source material doesn't cover something, put it in Open Questions.
- Do NOT include aspirational statements in Core Content. If it's about what _should_ happen rather than what _is_ or what _the source material says_, it goes in Implications.
- If the user provided Guiding Questions, each question must be answered in the Core Content. If a question cannot be answered from the source material, move it to Open Questions with a note.

### 6. Assumptions

- Format: `**A1 — [Statement treated as true without direct evidence.]** [What breaks if wrong.]`
- Number sequentially (A1, A2, A3...).
- **Test:** If the Core Content has zero assumptions, something is being hidden. Flag this.
- Include assumptions about:
  - Things the source material implies but doesn't state explicitly
  - Industry norms treated as given
  - User behaviors assumed but not validated
  - Scope boundaries that could shift

### 7. Open Questions

- Format: `**Q1 — [Question]** *Ask: [person or source]*`
- Number sequentially (Q1, Q2, Q3...).
- Include:
  - Guiding Questions that couldn't be answered from source material
  - Gaps discovered while writing the Core Content
  - Things that need validation with the client or end users
- Every question must have a suggested person or source to ask.

### 8. Implications

- Format: `**I1 — [Concrete consequence for downstream work.]** [Brief explanation.]`
- Number sequentially (I1, I2, I3...).
- Each implication follows the pattern: "Because [fact from Core Content], therefore [consequence for the project]."
- Focus on implications that affect:
  - Architecture or data model decisions
  - UX priorities
  - What to build first
  - Risks to the project
- Do NOT repeat Core Content. Implications translate understanding into action.

---

## Writing Style Reference

| Style    | Core Content Format                                                          | When to use                           |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| Concise  | Bullets, elements/functionality lists, minimal prose. Like a practical spec. | UX/UI models, technical models, specs |
| Standard | Short paragraphs (2-4 sentences) with source citations. Balanced.            | Business models, process models       |
| Detailed | Full paragraphs with context, rationale, and extended source citations.      | Complex domains, onboarding documents |

---

## Guiding Questions Behavior

- If user provides guiding questions: use them to structure Core Content. Each question must be answered or explicitly moved to Open Questions.
- If user leaves blank: infer key questions from the source material and state them explicitly at the top of Core Content so the user can validate them.

---

## Quality Checklist

Before delivering, verify ALL items:

- [ ] Scope fits in 2-3 sentences
- [ ] Dependencies section is left blank for manual fill
- [ ] Context explains WHY, not WHAT
- [ ] Key Concepts only includes genuinely ambiguous terms
- [ ] Every Core Content claim has a source, or is in Assumptions
- [ ] No information was invented beyond what's in the source material
- [ ] Assumptions section is not empty
- [ ] Every Open Question has a suggested person/source to ask
- [ ] Implications are actionable, not restatements of Core Content
- [ ] If Guiding Questions were provided, each is answered or explicitly moved to Open Questions
- [ ] Document reads top-to-bottom without circular references
- [ ] Writing style matches what the user requested
