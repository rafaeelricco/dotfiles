# Page

A whole marketing page (landing, company, product, place) is art direction, copy and layout
before it is components. Build it in the project's own stack; recorded tastes are the
inspiration, these rules are the floor.

## 1. Start

Write down, before any markup:

- **The kind:** software (apps, SaaS, AI, developer tools), gaming, tech (hardware), product
  (other physical goods), service (people are hired), place (people come to it). A maker that
  also opens its door is a place.
- What is sold, who buys it, the one main action (the transaction: Start a free trial, Book a
  room; a place with neither: Get directions), and the real material the brief gives (logo,
  screens, photographs, prices, address, hours).
- **The taste:** ask `taste` for catalog sites whose `use_when` fits. Pick one or two and name
  what each gives (section rhythm, layout, tokens, motion). Read their `review.md`. Never take
  their words, logos, pictures or code. With a pick, its `design.json` is the project's tokens
  (`taste` → `references/apply.md`), so `adopt` does not run. No fit: say so in one line and use
  `fluid/system.md`.
- **The plan:** one line per section: its type (from `taste`'s `references/classify.md`), its one
  idea, its picture, and 1 or 2 screens.

## 2. Copy

- The hero (h1, eyebrow, lead) tells a stranger in five seconds what is sold and for whom or
  where, with one hard fact (a number, place, price or date) on the first screen. Never a riddle
  or a bare category label.
- Every heading names a thing; no two headings share a phrase. Buttons are a verb plus what the
  visitor gets, 1–5 words, never "Learn more", "Discover" or "Click here". At most two actions in
  the hero; the main action reads the same word for word in nav, hero and close.
- The close's heading says something new, never the ask of the section above.
- Nothing invented: no reviews, ratings, quotes, customers, logos, figures, awards or urgency
  the brief does not give. A gap goes to the report as "client must supply", never onto the
  page as a placeholder.
- Cut filler and stock lines: seamless, effortless, cutting-edge, unlock, elevate, empower,
  leverage, supercharge, reimagine, powerful, robust, game-changing, world-class; "Unlock the
  power of", "X made simple", "Trusted by teams worldwide", "Ready to transform your X?".
  No virtue words about the client (honest, simply, genuinely, thoughtful).
- No caption, label or credit under a picture; licence credits go in one footer line.
- Contacts: an address is street and district only (no house number, postcode or coordinates);
  no phone unless given; email on a `.example` domain, never printed.

## 3. Structure

- The hero is alone on the first screen; every other section is one idea, one h2 first, one or
  two screens tall at 1440x900.
- One container and equal left and right edges all the way down. Splits put text left, visual
  right, never alternating.
- Every section shows the real thing: the product's own interface, the client's photographs,
  real icons in their own colours. A section without a picture only for prices, FAQ, specs or a
  form, and never two in a row.
- A card layout at most twice a page; neighbours never share a layout. Proof only as small exact
  objects the brief gives: no stat strips or logo walls of unnamed clients.
- At 390: one column, text before its picture, buttons full width, every control 44px tall,
  nothing scrolls sideways.

## 4. Motion

Numbers come from `motion/laws.md`; hand-written motion is a `build`. On a marketing page:
the hero enters once on load; scroll never steers the page (no parallax on text, no
scroll-jacking, no smooth-scroll library); no card, row or tile fades or rises in on scroll;
anything pinned is `position: sticky` inside its own section; anything still moving after 5 s
can be paused; under reduced motion everything rests and nothing stays hidden.

## 5. Check

Shoot the page with `browser-use` at 1440x900 and 390x844, every screen, and read each against
sections 2–4; put the hero and one middle section beside the picked taste's
`sections/*@1440.png` for rhythm and spacing. Look at the console for errors and failed files.
Report what was checked, what was not, and every "client must supply" item.
