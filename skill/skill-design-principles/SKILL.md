---
name: skill-design-principles
description: Concise, high-signal principles for writing and editing skills well. Use whenever authoring or editing a skill.
---

# Skill design principles

Apply these when writing a skill and when editing one. Before responding, search the skill files for each fact, value, or list you touched and confirm the edit did not add a second copy. Refactors the user did not ask for stay out of the diff: complete the request, then name the opportunity.

- **One home per fact.** Keep each rule, value, or list in a single authoritative place others point to, because copies drift apart. An existing duplicate you did not create is reported, not refactored.

- **Avoid No-Op Statements / Sprawl.** Remove a statement that neither changes what the skill does nor gives the reason for a rule that stays. Reasons are not sprawl: a rule stripped of its reason gets applied where it does not fit.

- **Solve the class, not the instance.** Fix a bad output where the fact is owned so it cannot be produced, rather than adding a downstream check that catches one symptom; prefer a general mechanism over a new hard-coded case that must then be enumerated everywhere. Generalize only as far as the evidence supports: a crash on `.csv` because delimited files are unsupported is a rule about delimited files, not about `.csv`.
