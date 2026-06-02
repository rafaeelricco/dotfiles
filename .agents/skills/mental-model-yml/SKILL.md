---
name: mental-model-yml
description: "Converts source documents (transcripts, briefs, specs, flow descriptions) into structured YAML mental model files. Use this skill whenever the user wants to create a mental model, convert a document into a .yml mental model, generate a business or UX/UI model from source material, or mentions 'mental model', 'yml model', 'YAML model', or asks to structure project knowledge into models. Also trigger when the user provides a transcript or brief and asks to 'extract a model', 'structure this', or 'turn this into a mental model'. Covers both business-domain models (how a business works, operational flows, strategy) and UI/UX models (screens, features, interaction flows)."
---

# Mental Model YAML Converter

Converts source documents into structured `.yml` mental model files following standardized templates.

## How This Skill Works

This skill takes source material (meeting transcripts, briefs, specs, flow descriptions) and produces `.yml` files that follow one of two templates: **business model** or **UI/UX model**. The templates live in `references/` — always read the relevant template before generating.

The skill operates in three phases: **Gather → Plan → Generate**.

---

## Phase 1: Gather

Collect all required inputs before doing any work. Ask the user these questions — do not proceed until all required inputs are provided.

### Required Inputs

**1. Source Material**
Ask: _"What source material should I use? Attach transcripts, briefs, specs, or any relevant documents."_

This is non-negotiable. Without source material, the skill cannot produce an evidence-based model. If the user tries to proceed without attaching anything, respond:

> "I need at least one source document (transcript, brief, spec, etc.) to generate a mental model. The value of a mental model comes from being traceable to evidence — without sources, I'd be inventing content. Please attach the relevant documents."

**2. Model Type**
Ask: _"Is this a **business** model or a **UI/UX** model?"_

| Type     | Use when describing...                                             | Template                                 |
| -------- | ------------------------------------------------------------------ | ---------------------------------------- |
| Business | How a business works, operational flows, strategy, market dynamics | `references/business_model_template.yml` |
| UI/UX    | Screens, features, interaction flows, user experiences             | `references/ui_model_template.yml`       |

If the user is unsure, help them decide: "If your model is about _how something works in the real world_ (business processes, revenue, teams), it's a business model. If it's about _how someone uses a screen or feature_, it's UI/UX."

**3. Title**
Ask: _"What is the title of this mental model?"_

Examples: `Business Environment`, `Login Workflow`, `Campaign & Event Lifecycle`, `Educator Mobile Experience`

### Optional Inputs

**4. Guiding Questions**
Ask: _"What questions should this model answer? (leave blank to let me infer from the source material)"_

If provided, these questions shape the `core_content` sections. Each question becomes a section or is answered within one. If left blank, infer key questions from the source material and include them in the plan for user validation.

**5. Model ID**
Ask: _"What ID should this model have? (e.g., MM-003 or MM-UI-AUTH). Leave blank if unknown."_

Convention: business models use `MM-XX`, UI models use `MM-UI-XX`.

**6. Language**
Ask: _"Language? (default: en-us)"_

---

## Phase 2: Plan

After gathering inputs, read the relevant template from `references/` and present a plan to the user. Do NOT generate any files yet.

### Read the Template

```
Business model → read references/business_model_template.yml
UI/UX model   → read references/ui_model_template.yml
```

### Present the Plan

Show the user exactly what you intend to create. The plan must include:

1. **File name:** e.g., `MM-003-campaign-event-lifecycle.yml`
2. **Scope preview:** 2-3 sentences of what's in scope and what's out
3. **Core content sections:** List each `section_title` you plan to create, with a one-line summary of what it covers
4. **Gaps identified:** Topics the guiding questions ask about but the source material doesn't cover (these will become `open_questions` or `assumptions`)

Format the plan like this:

```
## Plan: MM-003 Campaign & Event Lifecycle

**File:** MM-003-campaign-event-lifecycle.yml

**Scope:** How campaigns and events flow from client request through execution
and reporting. Excludes educator management and financial settlement.

**Sections:**
1. Campaign Structure — how campaigns relate to suppliers, budgets, and brands
2. Event Creation Flow — steps from request to published event
3. Event Execution — what happens on the ground during an event
4. Post-Event Reporting — data consolidation and client delivery
5. Cancellation & Exceptions — handling snowstorms, no-shows, mid-flight changes

**Gaps (will become assumptions or open questions):**
- No source material covers cancellation SLAs → Open Question
- Event pricing structure not detailed → Assumption
```

Wait for the user to approve, modify, or reject the plan before proceeding.

---

## Phase 3: Generate

Once the plan is approved, generate the `.yml` file following these rules.

### General Rules

1. **Follow the template structure exactly.** Do not add or remove top-level fields. The templates in `references/` define the schema.

2. **Every `points` entry must be a factual statement grounded in the source material.** If it's an inference rather than something the material states, move it to `assumptions`.

3. **Do not invent information.** If the source material doesn't cover something, it goes in `assumptions` (if you can make a reasonable inference) or becomes an open question in the plan summary. Never fabricate facts to fill sections.

4. **Be concise.** Points should be declarative statements, not paragraphs. Think bullet points, not essays. One idea per point.

5. **Do not insert cross-references to other models inside content fields** (e.g., `(see MM-UI-005)`, `(see models/ui/.../file.yml)`, `(this belongs in MM-X)`). Cross-model relationships belong only in the `dependencies` field. Content fields should read as self-contained statements.

6. **YAML formatting:**
   - Use 2-space indentation
   - Use `|` for multi-line strings (context field)
   - Use `-` for list items
   - Quote strings that contain colons, special characters, or could be misinterpreted

### Business Model Specific Rules

Read `references/business_model_template.yml` before generating.

- `core_content` sections should describe **how things work in the real world**, not how they should work in software
- Avoid UI/UX decisions — if a point is about a screen or button, it belongs in a UI model
- `implications` should focus on consequences for product/architecture decisions

### UI/UX Model Specific Rules

Read `references/ui_model_template.yml` before generating.

- `core_content` sections should be organized by **screen or interaction flow**
- Use these sub-patterns within points:
  - `"Elements: ..."` — what's visible on the screen
  - `"Functionality: ..."` — how it behaves
  - `"Assumption: ..."` — inline assumption about this specific screen
  - `"Design principle: ..."` — one-line design intent
- `context` should include the primary User Story
- `implications` should cover both frontend and backend consequences

### Dependencies — Leave for Manual Fill

Always generate the `dependencies` field with placeholder values:

```yaml
dependencies:
  depends_on:
    - "TBD — to be filled manually"
  feeds_into:
    - "TBD — to be filled manually"
```

The user fills this in because only they know the full graph of mental models.

### After Generation

1. Save the file to `/mnt/user-data/outputs/` with the naming convention: `MM-[ID]-[title-kebab-case].yml`
2. Present the file to the user
3. Summarize what was generated: number of sections, number of assumptions, number of gaps/open questions
4. Ask: _"Want me to adjust any sections, or is this ready for review?"_

---

## Quality Checklist

Before delivering, verify:

- [ ] Template structure followed exactly (no extra or missing top-level fields)
- [ ] Every `core_content` point is factual (inferences moved to `assumptions`)
- [ ] No information was invented beyond what the source material says
- [ ] No cross-references to other models inside content fields (e.g., `(see MM-X)`)
- [ ] `assumptions` is not empty (if it is, something is being hidden)
- [ ] `dependencies` has placeholder values for manual fill
- [ ] Points are concise and declarative (not paragraphs)
- [ ] `context` explains WHY, not WHAT
- [ ] `key_concepts` only includes genuinely ambiguous terms
- [ ] `implications` are actionable consequences, not restatements of content
- [ ] YAML is valid (proper indentation, quoted strings where needed)
- [ ] If guiding questions were provided, each is answered in `core_content` or flagged as a gap
