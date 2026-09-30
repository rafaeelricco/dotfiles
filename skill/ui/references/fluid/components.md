# Components

Check `../motion/libraries.md` first: a listed library for the component → use it,
then apply the spec below on top. Otherwise build on the project's primitives.
Each spec is behavior, not implementation.

Terms the entries share:

- Tiers, press, sizes, surfaces, type: `system.md`. Gliding hover, weight without
  reflow, icon swap, nested collapse: `patterns.md`. Reduced motion follows
  `../motion/laws.md`: movement snaps, fades stay.
- **Focus ring**: one ring that glides between rows on the fast tier, inset about
  2px, drawn only once the user has been navigating by keyboard.
- **Measured reveal**: a height reveal targets a measured pixel height, never
  `auto`. Auto is resolved from the visual, transformed size; inside a scaled
  ancestor the reveal would overshoot and then correct itself.
- **Image edge**: thumbnails, avatars and screenshots get a 1px inset outline (10%
  black in light, 10% white in dark). Pale edges keep their shape; the box doesn't
  change size.
- **Merged selection**: adjacent selected rows share one rounded background. Runs
  keep a stable identity between renders, so one that grows or shrinks morphs
  rather than leaving and re-entering.

## Accordion

- Label weight rises on open with no reflow. The chevron turns from right-facing to
  down-facing on the fast tier and thickens when open or hovered, as button icons
  do (`system.md` → Press).
- Opening runs fast with no bounce, landing in step with the chevron. Closing takes
  the quicker exit; nobody is waiting on a choice already made.
- Body opacity leads the height a little, so text dissolves before the edge reaches
  it instead of being cut off.
- Measured reveal. When content inside resizes (a nested accordion), the height
  snaps to it rather than chasing (`patterns.md` → Nested collapse).
- Highlight is either whole-item (open row and body tinted as one block) or
  trigger-only (fill on the row, on hover, sub-tree left plain, like a sidebar row).
  Hovering another closed trigger dims the open tint a little.
- A closed body leaves the accessibility tree only after its exit finishes. The
  focus ring travels between triggers.

## Ask-user questions

- A card that asks one or more questions (single choice, multiple choice, or free
  text) and steps through them.
- Digits 1–9 pick options without focus in the card; with several cards on the
  page, only the one holding focus (else the newest) answers. The free-text row's
  digit focuses its field, and digits are ignored while typing.
- ↑/↓ move the same gliding hover fill the pointer uses, so keyboard and mouse look
  alike; ← goes back, → skips. Inside the free-text field, ↑/↓ leave it only when
  the caret sits at the very start or end.
- ⌘+Enter (⌃+Enter off macOS) submits multiple choice and free text from anywhere in
  the card; in single choice, plain Enter submits the free text and Shift+Enter adds
  a line.
- Changing question animates the real height of the question area (slow tier,
  measured reveal), so border and footer travel with it; header and footer sit
  outside the clipped area.
- Merged selection. The focus ring shows only for keyboard focus, and never on the
  free-text row, which has its own field styling.
- The free-text field grows with its content and stays centered until it passes
  about one and a half lines; once it holds text it joins the merged selection.
- Rows are one tab stop (first selected, else first). After a question change,
  focus lands on the new first row only when the user was on the keyboard.
- Back and Skip show arrow-key hints on desktop only; per-row submit arrows stay on
  touch, since there they are tap targets.

## Badge

- Fill mixes 15% of the color into the page background, with foreground-colored
  text, so one color value works in light and dark. Gray uses the neutral accent
  fill instead.
- Dot variant: neutral outline and text; only the dot carries the color.
- Default 24px tall with 12px text, compact 20px with 11px; a compact region shrinks
  badges with no per-badge setting (`system.md` → Sizes).
- The label is trimmed to cap height and baseline where supported, so it sits
  optically centered in the fixed height.
- Corners follow the app's pill or rounded shape setting.

## Button

- Press, hover, icons: `system.md` → Press. Sizes: `system.md` → Sizes.
- Fills are opaque color mixes, not alpha, so fill and press ring never show a seam.
- Tertiary outline: outer 1px at rest, inner 1px while pressed, so it rides the
  surface inward as the surface shrinks.
- Icons sit 4px nearer the edge than text does, for optical balance.
- Loading keeps label and icons laid out but invisible, so width holds. A spinner
  sized to the button height covers them: a figure-eight trace whose dash length
  pulses on a slower loop than the trace.
- A button holding a menu open shows the pressed colors at full size; a physical
  press still layers on top.

## Card

- Transparent and borderless by default: it takes the surface behind it, and uses
  hairline dividers plus gliding hover in place of a frame.
- Only clickable cards join the glide. Lighting an informational card promises a
  click with nowhere to go.
- Grids resolve the nearest card in two dimensions; a gap click reaches the lit card
  only within 16px, because grid gutters are wide.
- Dividers touching a lit or selected card vanish so the fill reads clean. Where two
  hairlines cross, the vertical one stops 1px early, since overlapping translucent
  lines would look brighter.
- Title weight rises for persistent selection only; hover is previewed by the fill.
  Truncated titles still show an ellipsis.
- A clickable card is a stretched overlay link or button, with footer actions and
  dismiss stacked above it, so nothing interactive nests inside another. A disabled
  card removes the overlay so the keyboard can't reach it.
- The dismiss ✕ shows on hover; while hidden it must not catch taps. Over an image
  it sits on a blurred translucent chip for legibility, and an inline header
  reserves room for it only while it shows.
- Inline card with an image: text and actions form a centered column beside it,
  footer under the text. Image radius stays small in every layout (banner when
  stacked, square inline). Image edge.

## Carousel dots

- Each dot is a 6px mark in a button padded 6px per side: an 18px round target.
  Buttons touch, so one horizontal glide crosses them without breaking.
- The active dot stretches into a 24px pill (width eases on the moderate tier);
  inactive dots stay in the pale track color.
- Autoplay: the fill grows with elapsed time, then advances the index once and waits
  for the index to change before refilling. Any index change (click, clock, parent)
  restarts it. Pause freezes it; a stalled frame (hidden tab) is skipped, not
  counted.
- Under reduced motion there is no autoplay: nothing turns the page on the reader's
  behalf.
- Progress is a pill as wide as the track, translated sideways behind the track's
  clip; scaling would squash its rounded end. At 0% it already shows as a complete
  dot.
- A caller may drive progress directly, overriding autoplay; values that change every
  frame write the transform without re-rendering.
- Track and fill are 15% and 40% mixes of the foreground color, so light and dark
  themes come free. Every dot is a labeled button, with the active one marked as
  current.

## Chat message

- Entrance on the moderate tier: opacity 0, 8px low, scale 0.96 → rest. Growth
  origin is the corner nearest the sender: bottom-right for the user's messages,
  bottom-left for the assistant's.
- Appending a message slides the earlier ones up (position-only layout animation).
- User bubble: right-aligned, accent softened ~45% toward the page color. Assistant:
  plain text flush left, no fill.
- `text-wrap: pretty` on user bubbles only; assistant replies opt out (`system.md` →
  Type). On streamed text
  they would re-wrap earlier lines with every token; default wrapping only appends.
- The meta row (timestamp, icon actions) always reserves its height so bubble
  spacing never shifts. It fades in on hover or focus-within (fast tier) and is
  permanent on touch.
- Timestamp: user messages only, tabular numerals. Assistant messages show actions
  alone.
- Max width 80%. Attachments are square thumbnails (64px) above the bubble on the
  message's side; an attachment-only message has no bubble. Image edge.

## Checkbox group

- Merged selection. Ticking a row that joins two runs: the two facing edges glide to
  that row's midpoint while their corners square off, then a single block silently
  replaces the pair. This beats one block swelling across the whole span. Unticking
  a middle row plays it backward.
- Edge travel is moderate with no overshoot, so edges meet exactly; inner corners
  stay round slightly longer.
- The check draws in (fast) and retracts on the quicker exit. Rows checked at first
  render skip the drawing.
- Checked: the box border disappears and the check alone signals state; hover
  darkens an unchecked border. Label goes muted → foreground and heavier. Rows are
  fixed height.
- Pressing the box must not leave focus on the hidden native control; return it to
  the row, or arrow navigation stalls.
- Arrows wrap; Home and End jump. Focus ring.

## Color picker

- Switching format (HEX, RGB, HSL, OKLCH) re-emits the current color in that format
  at once; the color itself is untouched.
- The eyedropper button exists only where the browser provides one (Chromium).
  Cancelling is silent.
- Saturation square: system cursor hidden. A faint ring follows hover (not during a
  drag). Its 18px thumb takes the live color, with a white border and a dark outer
  ring, and stays glued to the pointer. Arrows nudge 0.01, Shift 0.1. Thumb radius
  is the panel radius minus padding, keeping the top corners concentric.
- Hue and alpha rails are compact slider tracks with the fill hidden and the thumb in
  the current color. The alpha gradient starts from the same hue at zero alpha, so
  it stays chromatically consistent and is fully opaque at 100% with no gap at the
  end, over a small checkerboard.
- State is HSV; hue survives saturation or value reaching 0. OKLCH keeps its own
  remembered hue, so lightness and chroma edits don't drift and grays don't reset
  hue to 0.
- Channel fields scrub by dragging (pointer locked, virtual cursor). A click without
  a drag enters edit mode (focus, select all). Typed text commits on blur; nudges,
  wheel and scrub commit immediately; Escape reverts. Steps: 1 (Shift 10); chroma
  0.01 (Shift 0.1).
- Hue-like fields wrap around rather than clamp: 361 becomes 1, −1 becomes 359, and
  the exact max is kept.
- Swatches match on normalized hex. Named CSS colors are resolved by the browser
  after mount, never during render; the hex field accepts names too.

## Combobox

- The input never loses focus; the row highlight is virtual. Pressing a row must not
  blur the field.
- Arrow keys cycle including the field itself: stepping off the last row clears the
  highlight (the field is a stop), and the following press returns to row one.
  Enter picks the lit row. Down or Up on a closed field opens it, lighting the first
  or last row.
- Whatever opens the list, row one starts lit, and each keystroke re-lights it;
  Enter never lacks a target. If the opener already chose a row (Up picks the last),
  that choice stays.
- Keyboard and automatic highlights scroll their row into view (nearest edge) and
  persist when the pointer leaves. A pointer highlight only sets Enter's target and
  clears on mouse leave.
- Field text and filter are decoupled. Open with a selection: its label shows but
  everything is listed until typing starts. Close without picking: label restored,
  query cleared.
- Create row: shown when the trimmed query equals no label exactly, and placed last,
  so any real match wins Enter. Its value can't collide with real values.
- Multiple mode: chips pop in and out (fast tier) and slide into their new slots. A
  chip that is leaving drops out of the layout immediately, so the field reflows
  without waiting. Only chips move; the text input itself snaps, as a sliding input
  looked like a placeholder sweeping in once the final chip was gone. Backspace in
  an empty field deletes the last chip.
- With no filter typed, a pick toggles the item and the popup stays for the next one;
  with a filter typed, a pick closes the popup and resets the query.
- Single mode: one marker glides between rows (moderate). Multiple mode: merged
  selection, recomputed against the filtered list.

## Command menu

- The input holds focus and the highlight is virtual; pressing a row doesn't blur the
  field. The modal shell is the dialog.
- The highlight is the gliding fill and nothing else: no ring in the list, same as
  dropdown and combobox. Pointer and keyboard move the same fill; Enter runs what it
  rests on.
- Panel height follows its rows on the moderate tier (measured reveal), capped; the
  list scrolls past the cap.
- As a dialog it uses the top-anchored placement (Dialog) at the full cap,
  min(440px, 76% of viewport height), and its top edge stays fixed while rows filter
  away beneath the field. It closes on Escape or a pick, so there's no ✕.
- Opened by ⌘K it appears and closes with no motion (`../motion/laws.md` → Gate);
  the highlight inside still glides.
- Keyboard scroll is computed at the moment of the move. The target row goes to the
  viewport center as far as the ends permit, with scroll and fill riding the same
  fast tier, so they stay together. Reaching the first row, or resetting the query,
  snaps to the top, heading included. Scroll by offset, never `scrollIntoView` (it
  moves the page too).
- Arrows wrap around at both ends, skipping disabled rows; unlike the combobox there
  is no stop on the field. Whenever the visible rows change, the first enabled one
  relights, keeping Enter armed as the query narrows. If the pointer exits the list,
  the highlight stays where it was.
- When tabs are present, ← and → cycle them (wrapping) in place of moving the caret.
  Any modifier (Shift, Alt, Ctrl, Meta) restores normal editing, so Shift+Arrow keeps
  extending a selection. Mid-composition IME keys are not intercepted. Escape closes
  the dialog variant; in the inline variant it clears the query.
- The shortcut "mod+k" resolves to ⌘K on a Mac and Ctrl+K on other systems. It falls
  back to the physical key when the typed character isn't a Latin letter or digit,
  or Option is held, so a Dvorak "t" is never read as K. A bare key is ignored in
  editable fields. With several dialogs on one combo, an already-open one answers
  (and closes); otherwise the latest mounted one whose scope has focus.
- The footer's Enter hint names what Enter does on the lit row ("Open Showcase"),
  not a generic "Run". It sits trailing so width changes don't shift the other
  hints (tabs add ← →, a dialog adds Esc).
- While the query is empty, suggested rows appear first under a heading of their own
  and are pulled out of their usual group, so none is listed twice. Filtering needs
  every query word to match the label, description or keywords, and never reorders
  results: rows hold their place beneath the cursor as the query lengthens.

## Copy input

- Icon swap (`patterns.md` → Icon swap): copy icon out, check (or error ×) in, then
  the glyph draws itself on the fast tier.
- The success or error glyph re-keys per copy, so pressing Copy again while
  "copied" shows replays the draw.
- Status reverts to idle after 2s. Copied and error share one slot on the button.
- Icon variant's tooltip: remember at press whether it was showing. After the copy,
  show "Copied" in it only if it was; otherwise it stays hidden. Once the pointer
  leaves the row it is muted, and coming back restores the usual open delay.
- Button variant: a hidden "Copied" label shares the cell with Copy, Copied and
  Failed, holding the row's width steady.
- The whole row is one button. Hover tints the mono value with a soft blue mark
  (#6B97FF at 20%) and thickens the icon, so the value reads as the click target.
- Accessible name tracks state (Copy, Copied, Copy failed); with a field label it
  reads "Copy <label>".

## Dialog

- Entrance and exit: `../motion/recipes.md` → Modal (slow tier; the exit is the
  quicker tween, so closing reads as final, not the entrance reversed).
- It stays mounted through the exit, with a fallback timer a little longer than the
  exit: a stalled background tab must not strand an invisible overlay or a scroll
  lock.
- Surface is 4 levels above what it opens over, capped at 8 (`system.md` →
  Surfaces); menus inside climb further on their own.
- Widths: sm 400, lg 540, xl 880px. Compact regions drop each a notch (360, 480,
  800); padding is unchanged. xl hosts composed layouts (a sidebar beside a panel),
  typically with zero padding and a fixed height.
- Top-anchored option: about 12% down rather than centered, so content-driven
  heights (a command menu) keep their top edge fixed.
- Contained option: scoped to a positioned, overflow-hidden region instead of the
  viewport, usually non-modal (embedded previews).
- Corner ✕: ghost icon button, omitted when the content already provides an exit
  (Escape, or picking an item).

## Dropdown

- Two forms. The popup is the menu. The inline, permanently rendered panel is a
  labelled plain group; only the popup announces itself as a menu, so a hand-built
  trigger around the inline panel doesn't claim a popup that isn't there.
- Entrance and exit: `../motion/recipes.md` → Dropdown. The origin follows the side it ended up on after a collision flip, so a popup that
  flips upward grows from its bottom edge.
- Inside the popup, keyboard navigation moves only the hover fill, since a lit row
  already shows where focus is; the inline panel, by contrast, draws the focus ring.
- Selected background: a separate overlay sliding between rows (moderate) with a
  quick fade. The hover glide starts at the checked row's rectangle, so hover seems
  to sprout from the selection.
- Checkable items keep the menu open on toggle. Merged selection.
- Opens ready to act: a couple of frames after the primitive's own autofocus, focus
  moves to the first enabled row, unless there is a search field, which takes focus
  itself.
- Search: typing while a row has focus is redirected into the field (character
  appended; Backspace too; Space excluded, since it activates a row). With the field
  focused, row one carries the hover fill, meaning Enter's target, updated as the
  filter changes. ↓ and ↑ jump to the first and last row; Enter clicks the first.
- The search field stays pinned at the top, bleeding across the popup padding so its
  divider spans the full width and rows scroll beneath. The popup omits its
  scroll-edge fade while a field is pinned, and the query clears on close.
- In pill-shaped apps the popup keeps the smaller rounded radius (heavy rounding
  skews apparent padding and gives uneven corner shadows). Surface is two levels
  over its substrate; its shadow is fixed at level 3 (`system.md` → Surfaces), so it
  looks identical over the page or in a dialog. Min width is the trigger's; max
  height is min(480px, available space).

## Input group

- A field lights up when it's the nearest hover target or has focus: the leading
  icon goes muted → foreground and thickens like a button icon.
- Chrome by precedence, first match wins. Disabled: no fill, ring in the border
  color. Error: transparent at rest, destructive tint on hover, card surface when
  focused, destructive ring only while focused or hovered. Focused: card surface and
  ring. Hovered: faint muted tint. Rest: transparent with an invisible ring.
- Label inset is a notch smaller than the control padding: with the ring invisible
  at rest, more inset would look like empty space.
- Label weight rises with no reflow.
- Pressing anywhere on the container (icon, padding) focuses the input. Presses on
  the input itself pass through, so caret placement isn't disturbed.
- Height is fixed on the size steps, not padding around a line box.
- Form wiring: the label is bound to the input; the error message describes it and
  marks it invalid, staying visible while the error stands. An inline field with a
  hidden label keeps an accessible name.

## Message composer

- The textarea autosizes between a minimum and maximum row count (from measured line
  height, cached) and scrolls only past the maximum. Width changes trigger a
  re-measure, because mounting while nearly zero-wide wraps the placeholder text over
  many lines and locks the height at its cap.
- Enter sends; Shift+Enter breaks the line; keystrokes that commit IME input never
  send.
- The edge is a 1px hairline ring recolored in place, by precedence: drag-over (blue),
  focus (20% foreground), hover (border color). Contrast rises without the stroke
  looking thicker, and the soft drop layer stays so the lift doesn't flicker.
- Drop: only drags carrying files react (text and HTML drags are ignored). Copy
  cursor; placeholder becomes "Drop files here to add to chat"; dragging over
  children doesn't flicker it. Files are filtered by accepted type and deduplicated
  by name, size and modified time.
- Attachment thumbnails: image edge; radius is the composer radius minus its 8px
  padding.
- The attachment, queue and suggestion regions are measured reveals. Suggestions
  exit by height only, with no fade; fading as well looked like a glitch in the
  height.
- The action button changes with state: Stop when streaming with an empty draft,
  otherwise an arrow. Send and Queue deliberately share the arrow glyph, so only
  switching to or from Stop animates. Submitting during a stream queues the draft
  along with a snapshot of its attached files; once streaming ends, the oldest
  queued item goes out automatically, and a polite live region says "Message sent.
  N still queued."
- Every queued row is operable by keyboard: Enter or F2 pulls it back into the
  composer, Delete or Backspace removes it, Alt+↑/↓ reorders (drag works too). The ×
  appears on hover for pointers and is permanent on touch.
- History recall works like a shell: plain ↑ only from the first line, ↓ only from the
  last, so multi-line editing is safe. The draft in progress is kept aside and
  restored beyond the newest entry; real typing leaves history mode.
- The suggested prompt is drawn as a real overlay instead of the browser's own
  placeholder, letting a Tab keycap sit inline right after it. Its type metrics match the textarea, so it
  begins exactly where typing would. A long suggestion truncates on a single line,
  keeping the keycap intact, and a screen-reader hint accompanies it. Tab accepts it
  without sending; Shift+Tab still moves focus backward.
- The suggestions listbox never takes focus: ↓ enters and descends, ↑ climbs and exits,
  Enter or click fills. Its highlight shares the gliding hover with the pointer. With
  nothing lit, the first row shows a ↓ keycap where the lit row shows ↵.

## Radio group

- One selected fill slides row to row on the moderate tier, instead of fading per
  row.
- The dot pops from scale 0.6 and transparent (the in-slot glyph floor,
  `../motion/laws.md` → Physicality) on the fast tier and shrinks out on the
  quicker exit; pre-selected items skip the entrance.
- When selected, the circle's border disappears and the dot alone signals state; hover
  deepens the unselected border. Circle 16px (14 compact), dot 8px (7).
- Label gets heavier on selection only; its color goes muted → foreground on
  selection or hover.
- All four arrows move and select together, wrapping; Home and End jump and select.
- Roving tab stop: the selected item, or the first item when nothing is selected
  (otherwise the group is unreachable by keyboard). Focus ring.

## Select

- Picking holds the popup open ~300ms so the check drawing in and the selected
  background moving to the row are seen; Escape, outside click, and the trigger
  still close at once.
- The check slot has fixed width, so a check appearing never resizes the popup.
- The check draws on the fast tier and erases on the quicker exit.
- The selected background moves (moderate tier) from the previous pick to the new pick. A
  value change while open doesn't re-measure: the rows haven't moved.
- The focus ring shows only after keyboard navigation, never for the pointer. Nav
  keys inside the popup earn it (arrows, Home/End, PageUp/PageDown, Tab); it also
  carries over when the trigger had keyboard focus at open.
- The trigger shows the selected label and typeahead works on the closed trigger, so
  the options must exist while closed.
- The trigger follows the app-wide pill or rounded shape, while the popup stays on
  the smaller rounded corners regardless. It opens on the fast tier from its
  anchored side, is as wide as the trigger, and its height is capped at min(300px,
  available space).

## Sidebar

- The rail handle: dragging resizes (160–360px). Dragging ~56px beyond the minimum
  previews a collapse, the fling-it-off-the-edge move from native apps; dragging back
  re-expands, and nothing commits until release. A press that stays under 4px of
  movement is the collapse click.
- Toggle key: bare `[` on a left sidebar, `]` on a right one. Bare so browser history
  shortcuts survive; ignored with modifiers or while typing. Only one sidebar
  answers: the innermost with focus, else the outermost.
- Peek: a 12px strip marks the collapsed edge and its hairline brightens under the
  pointer. In hover mode the peek opens after a ~150ms hover-intent delay and closes
  ~250ms after the pointer leaves; a single timer serves strip, collapsed toggle and
  peeked card, so moving among them cancels a dismissal already scheduled. Escape or
  pressing outside also closes it. A peek never pins the sidebar or stores anything.
- The dismiss test is whether the pointer is geometrically inside the card, not
  enter and leave events: a tooltip or menu above the card takes the hit test and
  fires a leave though the cursor never left.
- Motion: open and close use the slow tier (a whole column is the biggest mover
  here); the mobile sheet and the peek use moderate. Resize drag follows the pointer
  unsmoothed; mid-drag collapse and re-expand flips use moderate.
- Desktop open state persists across visits (about a week), readable on the server
  for a flicker-free first paint. The mobile drawer never persists. Below 768px the
  sidebar is a modal drawer, and crossing that breakpoint fades the rail out instead
  of snapping it.
- Sub-menus: `patterns.md` → Nested collapse.
- One glide scope per menu tree: hover, active and focus fills glide across all
  visible rows, sub-rows too. Hit-test the row's button, not its list item (an
  expanded sub-tree would give its gaps to the parent), and clamp fill height to the
  button.
- Give active backgrounds one identity per nesting level, so a selection glides to
  its new spot instead of being recreated. A rectangle change on the same row (a
  sibling collapsing) snaps. Hover tracking freezes across scopes while a
  sidebar-anchored popup is open.
- No icon rail: collapsed means gone. Rails make each destination cost a hover, a beat
  and a tooltip, and squash section labels to dividers. Hover-peek floats the real
  sidebar, labels intact.
- Avatars: image edge. At 20px it decides whether a pale portrait reads as a circle.

## Slider

- Two steps of one component: default is the pips or scrubber design, compact is the
  dense one. Any compact-only feature (multiple thumbs, discrete steps, value
  readout, track or fill styling, thumb colors) selects the compact engine whatever
  the size, so no capability is lost.
- While dragging, the compact thumb sticks to the step grid the whole way; a track
  click moves it to the snapped spot on the moderate tier; release settles on the
  quantized value.
- The compact readout is click-to-edit: it becomes an auto-selected number field.
  Enter or blur commits (clamped, then snapped to a step or the nearest listed one),
  Escape cancels. An invisible copy of the widest value holds the width.
- Hovering the track previews the outcome: a 40% accent bar spans from the closest
  thumb's center to the hovered value (snapped to steps), reaching the track's very
  end at min and max so no gap remains, rounded only on its leading end. A tooltip
  follows after ~100ms and hides during a press.
- The compact readout goes normal → medium weight on hover or press, in tabular
  numerals: interaction shows without layout shift. The comfortable design moves its
  value color muted → foreground on the fast tier instead.
- Range: pressing grabs whichever thumb is closest, and thumbs can't pass each other,
  each staying half a thumb width (10px for a 20px thumb) clear of its neighbor.
- Step dots vanish under the filled part of the track, with a 2px soft edge that
  follows the thumb, and swell 1.25x on hover. Keyboard and screen-reader semantics
  come from an invisible native slider; uneven steps run on indices so arrows walk
  the list, and the formatted value is what gets announced.
- Comfortable design: the handle is a 2px line; it gets 2px taller and steps from 25%
  to 50% to full foreground over rest, hover and focus. At the minimum an offset
  keeps it visible. Scrubber drag sets the fill directly, glued to the pointer; pips
  spring per snap. Both add an 8px hit area beyond each edge.

## Switch

- The thumb drags as well as clicks. A 2px dead zone separates drag from click; the
  thumb follows the pointer, clamped to the track; release toggles past the midpoint,
  otherwise it springs back.
- A drag never double-toggles: the click after pointer-up is swallowed, and a
  system-cancelled gesture snaps back untoggled.
- Hover stretches the thumb into a pill (+2px). Press stretches it +4px and squashes
  it 4px shorter, recentered. Compact: same hover, press softened to +3 and −3.
- When checked, the stretch grows leftward so the thumb's outer edge stays on the
  track end.
- The thumb moves on the moderate tier; first render places it instantly, so a
  pre-checked switch doesn't animate on load.
- Track colors: on is #6B97FF, deepening to #5C89F2 under hover; off is the accent,
  taking a 10% overlay mix under hover. Default 34×20 track and 16px thumb; compact
  28×16 and 12px; 2px inset.
- The hover pill applies to mouse only, so touch never sticks in it.
- The whole row is the target (touch gestures off on it so scrolling doesn't fight the
  drag). The label goes muted → foreground when on; text trimming re-centers it
  against the taller track and leaves layout alone.

## Table

- Row hover is one gliding highlight behind the entire table; body rows join by index,
  header rows don't.
- While a row is lit, its bottom border and the border above it go transparent,
  leaving the highlight a clean pill; when the first row is lit the header's border
  hides too. Borders fade on the fast tier, never pop.
- Cell text goes muted → foreground on the lit row, on the same timing.
- Header semibold, body regular, through the weight axis (no class swap).
- Row height lands on the size steps via padding plus line box. A table may pin every
  cell to one step; otherwise it follows its region.

## Tabs

- The active pill glides tab to tab on the moderate tier. Clicking updates the selection
  at once (optimistic) instead of after controlled state returns; a consumer click
  handler can't disturb it.
- The hover pill is born on the selected pill (transparent) and glides to the hovered
  tab at 40% opacity (fast). Leaving the list, it returns to the selected pill while
  fading rather than vanishing.
- Hovering an unselected tab dims the active pill to 85%, signalling divided
  attention.
- Active pill surface is substrate + 3, capped at 8: one above the muted track, two for
  lift. That gives 4 on the page and 8 in a dialog, not a clash at 4 (`system.md` →
  Surfaces).
- Label weight rises with no reflow; color and weight change together on the fast tier.
- Items get a fixed height from the size steps, not padding, so text trim can't shrink
  them; track padding plus item height equals the control height, aligning tabs with
  adjacent buttons, selects and inputs.
- Icons thicken and turn foreground on hover or selection.
- Keyboard focus draws the focus ring (2px outset) and also moves the hover pill. On
  blur the highlight is cleared unless the mouse is still over the list.

## Subtle tabs

- The same pill choreography as Tabs; the selected pill dims to 80% while another tab
  is hovered.
- Active-label mode: every unselected tab shrinks to its icon, and the label expands or
  collapses via a measured width (measured reveal).
- Before the first measurement, width stays plain auto; otherwise the selected tab
  pulses on arrival.
- Expanded label margin is 8px (6 compact). Default matches the size gap; compact is its
  own value, a little wider than its gap.
- Re-measure pills whenever any tab or label resizes; collapsed tabs keep an accessible
  name.
- Negative margin plus matching padding on the list lets the focus ring draw inside a
  horizontally scrolling container, and max width adds 8px because content-sized
  parents count the margin box.
- Manual activation: arrows move focus; Enter or Space selects.

## Thinking indicator

- The glyph is one SVG path cycling through five shapes (circle, infinity, circle drawn
  the other way, infinity, back to circle) in equal quarters, an endless slow loop.
  Ambient, so outside the tiers. The two circles wind opposite ways so the loop keeps
  flowing.
- Words rotate about every 4s: Thinking, Moonwalking, Planning, Refining. The new word
  rises in from 80% below (slow tier); the old one exits upward (moderate, so quicker);
  both ease out and overlap.
- A hidden copy of the longest word reserves width, so rotation never shifts layout.
- Shimmer: transparent text over a very wide gradient clipped to the glyphs, sweeping
  across. Per-theme color pairs make it invert correctly.
- Screen readers get one static "Thinking…" status; the animated text is hidden from
  them, so nothing is re-announced.
- Reduced motion drops both the morph and the rotation: a still infinity glyph and the
  first word say the same thing.

## Thinking steps

- Two-phase entrance: the wrapper opens its height first (slow tier, measured reveal),
  then the content fades in a beat later. Room first, then content.
- A pending step renders nothing; the list streams in as steps turn active or complete.
  The active step's label shimmers and ends with "…".
- Header: weight rises when open, color goes muted → foreground on hover or open, and
  the chevron thickens and turns right → down on the fast tier.
- The panel stays mounted through its exit and is hidden only once that ends; hiding it
  instantly would freeze the exit midway. Trigger and panel stay associated.
- A panel open at first render snaps to its measured height, no animation. Later opens
  have no overshoot: a pure height change reads better without.
- Each step's icon sits in a 14px-wide column; a 1px connector runs down from the icon to
  the step's bottom edge, and the last step has none, so the rail ends cleanly.
- Source badges enter with a 4px blur → sharp, scale 0.95 → 1 and a fade (moderate),
  staggered per badge (`../motion/laws.md` → Timing). Step images get the same blur-in
  minus the scale, and the image edge.

## Tooltip

- Entrance and exit: `../motion/recipes.md` → Tooltip. Offset from the trigger 8px.
- Open delay ~200ms. Within a group, a ~300ms skip window shows neighbors instantly. A
  standalone tooltip forms its own group only if none is ambient; otherwise each would
  wait the full delay again.
- Follow-cursor mode (tall or wide triggers such as the sidebar rail): it tracks the
  pointer on one axis and stays anchored on the other, without re-rendering per move. A
  tooltip opened by code sits centered until an actual pointer takes over.
- Bubble: inverted colors, caption size, medium weight. Text is trimmed to recenter; the
  padding bump applies only where trim is supported, keeping height about 26px either
  way.
- It stacks above other fixed layers by default and can be raised further.
- Code can pin it open or closed, overriding hover and focus.

## Queued message stack

- At rest, the frontmost card shows with up to two peeking behind it. Each deeper card
  sits 12px higher and 0.05 smaller (origin bottom center); past the second peek it is
  transparent. Height is on the size steps (44px, 38px compact), and the transcript
  reserves exactly the collapsed height.
- Hover fans the stack out: the container grows to cards plus 8px gaps, cards move to
  their slots on the moderate tier, with no bounce. On touch, tapping expands the stack
  and pins it open; a chevron button collapses it; the pin clears once the queue is
  empty.
- When the pile already shows its maximum peeks, a newly added message arrives hidden,
  so every addition gives the stack a small nudge: a 7px upward snap, then settling back
  on the moderate tier with no bounce. No nudge while expanded or for the very first
  message.
- A corner-arrow icon occupies the 40px left gutter with an "N queued messages" tooltip.
  The count fades and scales in beside it only once there are more cards than visible
  peeks, placed so its arrival never displaces the arrow.
- Reordering is available only when expanded. Movement beyond a 4px dead zone starts a
  drag: the dragged card follows the pointer directly (scale 1.03, above its neighbors)
  while the rest shift into their slots. Listeners live on the window, so releasing
  anywhere works, and on touch the gesture claims vertical movement, reordering rather
  than scrolling the transcript.
- Sending can morph the card into its sent bubble (they share an identity): text-only
  cards only, since attachment layouts differ too much and those fade instead, and never
  mid-drag. The consumer clears the pairing ~450ms after dispatch so later reflows don't
  replay it.
- The edit (pencil; a double-click does the same) and remove controls stay hidden and out
  of layout until hover, so text gets the full card width; on touch they're permanent.
  Pressing either never starts a drag.
- Thumbnails and the +N tile take the card radius minus its 8px inset (~7px compact),
  keeping nested corners concentric in rounded and pill shapes.

## App shell

- During a peek the floating overlay hides the one control that could pin the sidebar,
  so a toggle replaces the workspace tile in place. It is a sibling layered over the
  row, not a button nested in the row's button. Toggle and tile cross-fade where they
  sit (opacity only, fast tier, no movement); constant row padding holds the workspace
  name on the text axis throughout.
- That toggle has no hover fill: its box doesn't line up with the tile slot, and a fill
  would read as a stray rectangle that isn't concentric. Its glyph stays at icon size.
  A container query drops the dropdown chevron when the row gets too narrow to show
  much of the name.
- Search keeps the row rhythm: its icon lies on the icon axis and its text starts on the
  text axis. It is grouped with the "New" action row as one block, reading as the
  list's first entry.
- Shortcut hints (⌘K in search, the New row's keycap) stay invisible at the trailing edge
  and fade in on hover or focus-within (fast tier), leaving the placeholder and label to
  the resting row.
- The user footer uses the same axes: a 20px avatar on the icon axis, the trailing glyph
  on the action axis. Its menu opens upward on the common popup grid, 10px wider than
  the trigger and offset to the row's edge so its labels sit directly over the trigger's
  labels.
- In an inset layout, the topbar toggle is hidden during a peek (the overlay would cover
  it), and after a pin it fades in a little late (~200ms delay), so it shows at its
  final position rather than travelling with the inset's slide.
- Collapsed means fully hidden, with no icon rail. Reaching the collapsed edge
  hover-peeks the actual sidebar, labels included, and pinning from a peek leaves the
  rows exactly where they were. Persistence works as in Sidebar.

## Settings dialog

- The xl dialog turns into a layout canvas: zero padding, flex, and a fixed height of
  min(640px, viewport − 4rem), which makes the panel scroll internally and stops the
  dialog resizing.
- Navigation on the left is the app shell's sidebar, framed to fit: no rail, drawer,
  persistence or shortcut; 13rem wide; a faint tint separates it from the panel.
- On narrow screens (below 640px) the sidebar hides, and a Select above
  the panel content, listing the same sections with the same icons, does the
  navigating, beneath a visible "Settings" heading.
- The dialog's single title sits in the sidebar header at regular weight: headings in
  this layout are labels, and a heavier title would drown out the nav below. A
  screen-reader-only description accompanies it. A title that is referenced still names
  the dialog when visually hidden, so the narrow layout only has to repeat it as a
  visible heading.
- The section list shows no focus ring; the rows are the entire surface, so keyboard
  focus shifts the highlight and nothing else.
- Each switch still needs an accessible name; the row already displays it, so the
  switch's own copy is hidden visually instead of appearing twice.
- Each setting is a row: label (body size) with a muted caption-size description on the
  left, control on the right, hairline separators. A row's Select uses the borderless
  trigger to stay unobtrusive.
