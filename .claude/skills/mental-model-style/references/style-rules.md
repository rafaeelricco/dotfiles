# Mental Model Style Rules

These rules define the writing style for all YAML mental model files in this project.
Apply them during creation (`mental-model-yml`) and enforcement (`mental-model-style`).

Use the selected reference set for the current task as the baseline for
acceptable text length, information density, and phrasing. Preserve a similar
level of specificity when the text is still easy to scan. Rewrite when the
target file is materially denser, more repetitive, or less structured than
that reference set.

---

## `context` block

- **Goal:** State the user need and intended outcome directly.
- **Length:** Prefer a compact multi-line block roughly in line with the selected reference set; trim only when it becomes noticeably harder to scan.
- **Content:** Keep the objective and relevant framing. Do not force a single sentence pattern.
- **Violation signals:** Constraint-first framing, repeated detail already covered later, or prose that is materially longer/denser than the selected reference set without adding meaning.

---

## `core_content` bullet points

### Label policy

- Preserve labels by default.
- Do not flag a label merely because it is uncommon or domain-specific.
- Normalize a label only when an obvious equivalent improves consistency without losing meaning.
- The list below is permissive, not exhaustive. Labels matching these patterns are explicitly valid.

Valid observed labels:

- `Elements:`, `Functionality:`, `Design principle:`, `Entry Point:`
- `Frontend:`, `Backend:`, `Architecture:`, `Validation:`
- `Assumption:`, `Actions:`, `Note:`, `Implementation note:`, `Trigger:`, `Transition:`, `Edge Case:`
- `Step 1:`, `Step 2:`, `Step 3:`, `Step 4:`, `Step 5:`, `Step 6:`
- `Status:`, `Unassigned:`, `Live:`, `Finalized:`
- `Visual lifecycle stepper:`, `Event type badge:`, `Status badge colors:`
- `Per-educator assignment card:`, `Per-educator actions:`
- `Branch 1 — Educator Cancellation:`, `Branch 2 — Event Cancellation:`
- `Footer actions:`, `Drawer header:`, `Helper text:`
- `Current prototype behavior:`, `Planned behavior:`, `Process:`, `Placement:`, `Rationale:`, `Summary:`, `Version:`, `Push behaviour:`
- `Three connection-state banners serve as indicators:`, `The three-phase progression of an event:`
- `Phase 1 — Editable Configuration (Draft/Scheduled):`, `Phase 2 — Live Data Feed (Active):`, `Phase 3 — Locked Final Report (Completed):`
- `Profile Card:`, `Organizations Section:`, `Help & Support Section:`, `Permissions Section:`, `Your Performance Section:`
- `Scope filter controls:`, `Campaign header stats rows:`, `Add Organization wizard (3-step:`, `Easter egg:`, `Log Out:`
- Transition-specific composite labels currently present in the corpus:
  `Transition: [New] → Unassigned. Trigger:`,
  `Transition: Unassigned → Assigned (Pending). Trigger:`,
  `Transition: Assigned (Pending) → Confirmed. Trigger:`,
  `Transition: Assigned (Pending) → Unassigned. Trigger:`,
  `Transition: Assigned (Pending) → Withdrawn. Trigger:`,
  `Transition: Confirmed → Live. Trigger:`,
  `Transition: Live → Live (Alert). Trigger:`,
  `Transition: Live → Completed. Trigger:`,
  `Transition: Completed → Finalized. Trigger:`

### Length and structure

- **Target:** Match the selected reference set density: concise, specific, and easy to scan.
- **One primary idea per bullet.** Split a bullet when it merges trigger, state, behavior, rationale, and side effect unnecessarily.
- **Prefer 1–2 lines per bullet.** Longer bullets are acceptable when the density still matches the selected reference set.
- **Remove repetition before removing meaning.** Trim redundant modifiers, duplicate examples, or repeated qualifiers first.

### What to preserve

- Preserve detail when it carries behavior, state, navigation, or reviewable product meaning.
- Do not automatically remove any of the following:
  - icon names
  - hex color codes
  - exact UI text, titles, labels, or placeholders
  - URL paths, query params, or route details
  - badge names or status labels
  - counts, examples, and concrete options
  - button names, toggle names, modal names, banner names, drawer names
- Only trim these details when they are clearly decorative, repetitive, or materially reduce scanability compared with the selected reference set.

### Rewrite triggers

Treat a bullet as a style issue when one or more of the following are true:

- It is materially denser or less scannable than comparable bullets in the selected reference set.
- It combines multiple unrelated ideas that should be split.
- It repeats detail already stated nearby.
- It buries the main point under too much subordinate phrasing.
- It mixes label semantics in a way that obscures the primary point.

---

## `assumptions`

- **Format:** Prefer short declarative statements.
- **Precision:** Keep necessary constraints when removing them would weaken the product meaning.
- **Scope:** Keep assumptions that shape core behavior or constrain the design.
- **Violation signals:** Repeated rationale, excessive throat-clearing, or prose that is materially denser than needed to state the assumption clearly.

---

## `implications`

- **Grouped by concern:** Use `Frontend:`, `Backend:`, or `Architecture:` as the prefix for each implication.
- **State what needs to exist, not how to implement it.**
- **Specificity:** Concrete details are allowed when they clarify the required capability.
- **Violation signals:** Implementation trivia that distracts from the requirement, repeated detail already captured elsewhere, or implications that are materially denser than the selected reference set without adding clarity.

---

## Sections never touched by style enforcement

The following sections should not be rewritten unless an explicit violation is found:

- `id`, `title`, `status` — metadata, not content
- `dependencies` — structural graph, not prose
- `scope` — already uses bullet format; only fix if bullets are compound sentences
- `key_concepts` — definitions are intentionally precise; do not condense them
