# Mental Model Auditor — Approval Plan Template
Use this formatting reference for the first substantial response.
Behavioral rules live in `SKILL.md`.
```md
# Mental Model Audit Plan — [Scope Title]
## Context
[2-3 short paragraphs describing what changed, why these models are being audited, and what evidence was used to form the initial assessment.]
## Scope
- **Models to audit:** [list of model files or directory]
- **Prototype:** [URL or "not yet provided"]
- **Prototype source:** [repo path or key source path]
- **Conventions:** [style guide path or "inferred from existing models"]
- **Explicit boundaries:** [anything intentionally out of scope]
## Summary of Findings
| # | Model File | Feature / Element | Status | Confidence | Action Needed |
|---|------------|-------------------|--------|------------|---------------|
| 1 | [file] | [feature] | [status] | [confidence] | [change] |
## Execution Plan
### Phase 1 — Verify Live Prototype
[Describe Playwright/browser verification work, roles, and pages to inspect.]
### Phase 2 — Draft Updates to Existing Models
[Describe how diffs or before/after edits will be prepared.]
### Phase 3 — Draft New Model(s)
[Include only if `NEW_MODEL` is likely.]
### Phase 4 — Present Proposal
[Describe the final deliverable after approval.]
## Key Files
- `[path]`
## Verification
Approve this plan or tell me what to change before I continue.
```
