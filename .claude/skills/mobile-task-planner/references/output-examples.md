# Mobile Task Planner Output Examples

Use these examples only when they match the current task shape. Do not copy paths, component names,
state names, or constraints unless they come from the user request or inspected files.

## Example 1 — Event Card Refactor with ASCII Layout and Variants

Use this pattern when the user asks for an event card/list item refactor, visual parity with an
attached image, explicit variants, or an ASCII layout before the plan.

```md
Task: Plan a refactor of the event card component at @app/mobile/src/app/(tabs)/events/index.tsx:212-360 (OfferCard). Do not implement yet — gather context,
produce an ASCII layout, then propose a plan for review.

Goal: Match the design in the attached image exactly, while supporting variants for different event states.

Step 1 — Read for context:
1. Current component: @app/mobile/src/app/(tabs)/events/index.tsx:212-360
2. Data shape: @app/mobile/src/lib/mock-events.ts (and @app/mobile/src/types/event.ts if referenced)
3. The attached image — analyze spacing, hierarchy, typography, pills, icons, colors, and any state indicators.

Step 2 — Produce an ASCII layout visualization:
Using a real event from mock-events.ts, draw a precise ASCII mock of the new card showing:
- Vertical/horizontal structure and gaps
- Pill placement (location, date/time, compensation, distance, status)
- Where the variant indicator appears
- Anchored to actual field values from the mock data so the proportions are realistic

Step 3 — Variants:
The user identified two variants:
- regular
- expired

Inspect mock-events.ts and the current card logic — if other states are implied by the data (e.g. accepted, declined, pending, live, completed, cancelled),
propose the full variant set with a one-line rationale per variant. Flag which states actually need a distinct visual treatment vs. which can share styling.

Step 4 — Constraints to follow (from existing patterns):
- Spacing: gap-* only, no margins.
- Animations: keep the FadeInDown.delay(index * 60) stagger pattern already in place.
- Styling: Tailwind / NativeWind tokens (bg-card, text-foreground, etc.) — no raw hex.
- Maybe types: preserve the event.expiresAt.maybe(...) / totalPay.maybe(...) pattern.

Step 5 — Deliverable:
1. ASCII layout (Step 2)
2. Variant list with rationale (Step 3)
3. Plan: files to touch, prop/type changes, variant strategy (single component with variant prop vs. composition), open questions.

Wait for plan approval before coding.
```

## Example 2 — Prototype-Driven Post-Event Detail Refactor

Use this pattern when the user asks for a detail page to mirror an external prototype while using
local mock data and existing mobile patterns.

```md
Task: Plan a refactor of @app/mobile/src/app/(tabs)/events/[eventId]/post-event.tsx. Do not implement yet — gather context first, then propose a plan for review.

Goal: The post-event page should be a wide overview of everything that happened during the event, matching the layout of the prototype but powered by our own
data.

Step 1 — Read for context (in this order):
1. Prototype to mirror: /Users/rafaelricco/Projects/ambar/Educatormobileapp/src/app/components/post-event-details.tsx
2. Current target: @app/mobile/src/app/(tabs)/events/[eventId]/post-event.tsx
3. Data source: @app/mobile/src/lib/mock-events.ts
4. Pattern references:
  - @app/mobile/src/app/(tabs)/events/index.tsx
  - @app/mobile/src/app/(tabs)/events/[eventId]/offer.tsx (especially the animation pattern at line 361: FadeInDown + LinearTransition)

Step 2 — Constraints to follow:
- Layout: match the prototype visually.
- Data: use mock-events.ts. If fields are missing for prototype parity, propose new fields in the plan (don't add them yet).
- Spacing: use gap-* (flex/grid gap), not margins.
- Animations: use the same FadeInDown + LinearTransition pattern from offer.tsx:361 for smooth section transitions.
- Component tree: mirror the structure used in offer.tsx, adapted for post-event content:

PostEventDetailScreen (default export)
└── findEventById → maybe
    ├── NotFoundView
    └── PostEventDetailContent
        ├── Header
        │   ├── HeaderPill (location)
        │   ├── HeaderPill (date/time)
        │   ├── HeaderPill (compensation)
        │   └── ExpirationPill
        ├── Sections
        │   └── Accordion
        │       ├── SectionItem "products"     → ProductsBody
        │       ├── SectionItem "instructions" → ParagraphBody
        │       ├── SectionItem "materials"    → MaterialsBody
        │       ├── SectionItem "goals"        → ParagraphBody
        │       └── SectionItem "compensation" → CompensationBody
        │                                          └── CompensationRow (×N)
        └── (post-event equivalent of OfferDecision — propose what fits)

Step 3 — Deliverable:
A short plan covering: files to touch, new/changed types in mock-events.ts and event.ts (if any), the component tree adapted from the prototype, and the
spacing/animation conventions to apply. List any open questions before I approve the plan.
```
