# Vocabulary

Map a loose description of a motion or effect to its exact term.

## Quick Start

The user describes an effect vaguely. Reply with the matching term(s) in this format:

```
**Stagger** — Items animate in succession, each offset by a short delay, producing a cascade.
```

Several plausible terms → best match first, then 1–2 alternates, each with a one-line note on how it differs.

## Instructions

Quote the glossary entry word for word; it is the authority. Competing terms
(_Clip-path_ vs _Mask_, _Pop in_ vs _Bounce_) get contrasted so the user can pick.
No exact match → name the closest term and mark it as an approximation, or describe
the effect using glossary vocabulary.

## Examples

**Example: disambiguating**
User: "That effect where a picture changes into a different picture."
Output:

```
**Morph** — One form fluidly becomes another, like the Dynamic Island.

Close alternates:
- **Crossfade** — if one simply fades over the other in place.
- **Shared element transition** — if an element moves and reshapes from one position to another.
```

## Glossary

### Entrances & Exits

- **Fade in / Fade out** — Opacity changes to bring an element in or take it out.
- **Slide in** — Element moves in from past a screen edge — left, right, above, or below.
- **Scale in** — Starts smaller and grows to full size on arrival, usually alongside a fade.
- **Pop in** — Arrives with a slight overshoot, as if bouncing into place.
- **Reveal** — Content shows progressively as a clip-path or mask animates open.
- **Enter / Exit** — What plays when an element is mounted onto or unmounted from the screen.

### Sequencing & Timing

- **Keyframes** — Waypoints in an animation (0%, 50%, 100%); the browser computes everything between them.
- **Interpolation / Tween** — Computing each frame lying between a start value and an end value, keeping motion continuous.
- **Stagger** — Items animate in succession, each offset by a short delay, producing a cascade.
- **Orchestration** — Timing several animations on purpose so they read as one coordinated move.
- **Delay** — The wait before an animation begins.
- **Duration** — The length of time an animation runs.
- **Fill mode** — Whether the element holds its first-frame styles before the animation starts, or its last-frame styles after it ends (e.g. forwards).
- **Stepped animation** — Motion broken into discrete jumps instead of a smooth run, like a countdown timer.

### Movement & Transforms

- **Translate** — Shift an element along X or Y.
- **Scale** — Resize an element larger or smaller.
- **Rotate** — Turn an element about a point.
- **Skew** — Shear an element along X or Y so its rectangle leans into a parallelogram.
- **3D tilt / Flip** — Rotation in 3D space (rotateX / rotateY) that adds depth.
- **Perspective** — Sets how strong the 3D effect looks; a smaller value exaggerates depth, as if the viewer were nearer.
- **Transform origin** — Fixed point that a scale or rotation expands or pivots about.
- **Origin-aware animation** — Motion that starts at the element's trigger, e.g. a popover unfolding from the button that opened it, not from its own center (the CSS default).

### Transitions Between States

- **Crossfade** — One element fades out while another fades in at the same spot.
- **Continuity transition** — A change that links before and after visually so the user stays oriented, e.g. one rectangle growing and shrinking.
- **Morph** — One form fluidly becomes another, like the Dynamic Island.
- **Shared element transition** — An element moves and reshapes from one position to another, as when a thumbnail becomes a card.
- **Layout animation** — A size or position change plays out as a glide to the new spot, not a jump.
- **Accordion / Collapse** — A section grows or shrinks in height to show or hide its content.
- **Direction-aware transition** — Content moves opposite ways for forward and back, so navigation has a direction.

### Scroll

- **Scroll reveal** — Elements fade or slide into position as they scroll into view.
- **Scroll-driven animation** — Animation progress is bound directly to scroll position.
- **Parallax** — Background and foreground scroll at different speeds, producing depth.
- **Page transition** — Animation played when navigating between pages or routes.
- **View transition** — A browser-run morph between two states or pages that connects the elements they share.

### Feedback & Interaction

- **Hover effect** — The element changes appearance while the cursor is over it.
- **Press / Tap feedback** — A slight shrink on click or tap that makes the element feel physical.
- **Hold to confirm** — A progress fill that advances while the user keeps a button held down.
- **Drag** — Grabbing and moving an element, often with momentum on release.
- **Drag to reorder** — Dragging list items into a new order while the rest shift aside.
- **Swipe to dismiss** — Flinging or dragging an element past the viewport edge to close it, as with a drawer or toast.
- **Rubber-banding** — Growing resistance, then snap-back, when dragging past a limit (as in iOS overscroll).
- **Shake / Wiggle** — A brief horizontal jitter that flags an error or refused input.
- **Ripple** — A circle spreading from the tap point to confirm the press.

### Easing

- **Easing** — How an animation's speed changes over its course.
- **Ease-out** — Fast start, slow finish. Default for most UI and for anything reacting to the user.
- **Ease-in** — Slow start, fast finish. Usually avoided; tends to feel sluggish.
- **Ease-in-out** — Slow, fast, slow. Fits elements that are already visible and travel from A to B.
- **Linear** — Even speed throughout. Avoid in UI; reserve for spinners and marquees.
- **Cubic-bezier** — A curve of your own design, for precise control of easing.
- **Asymmetric easing** — A curve whose acceleration and deceleration run at different rates; feels livelier than a symmetric one.

### Spring Animations

- **Spring** — Physics-driven motion (tension, mass, damping) instead of a fixed duration.
- **Stiffness / Tension** — Strength of the pull toward the target; higher is snappier.
- **Damping** — Rate at which the spring settles; less damping gives more bounce and swinging.
- **Mass** — Perceived weight of the element; heavier means slower and more sluggish.
- **Bounce** — A spring that overshoots, then settles, adding playfulness.
- **Perceptual duration** — Time until a spring looks finished, though it keeps micro-settling underneath.
- **Momentum** — Motion carrying velocity, especially after a drag or an interruption.
- **Velocity** — Speed and direction of a moving element. On interruption a spring hands it to the next animation, letting a flick keep its pace.
- **Interruptible animation** — One that can be smoothly redirected mid-flight rather than finishing first.

### Looping & Ambient Motion

- **Marquee** — Content or text that scrolls on and on, looping.
- **Loop** — Animation that repeats, either a fixed number of times or indefinitely.
- **Alternate (yoyo)** — Loop variant that plays forward, then in reverse, each cycle instead of snapping back to the start.
- **Orbit** — An element circling another along a continuous path.
- **Pulse** — A soft repeating scale or opacity change that draws the eye.
- **Float** — Slow, endless vertical drift that gives a static element a weightless, lively feel.
- **Idle animation** — Subtle motion while an element sits waiting for interaction.

### Polish & Effects

- **Blur** — A blur filter that softens an element or hides small flaws.
- **Clip-path** — Trimming an element to a shape; the basis of reveals, masks, and before/after sliders.
- **Mask** — Hides or shows portions of an element through a shape or gradient; unlike clip-path, its edges can be soft and fade.
- **Before / after slider** — Drag a divider to wipe between two layered images and compare them.
- **Line drawing** — An SVG path that appears stroke by stroke, as though an invisible pen were tracing it.
- **Text morph** — Text whose characters animate one by one when the value changes, pulling focus to the update.
- **Skeleton / Shimmer** — Loading placeholder with a sheen sweeping across it.
- **Number ticker** — Digits that roll or count up to a target value.
- **Tabular numbers** — Equal-width digits that keep numbers from shifting while they change; vital for tickers, timers, and counters.
- **Typewriter** — Characters arrive one by one, as though someone were typing.

### Performance

- **Frame rate (FPS)** — Number of frames rendered each second; 60fps is the smooth baseline, and newer displays reach 120fps.
- **Jank** — Visible stutter that appears when the browser falls behind and drops frames.
- **Dropped frame** — A frame the browser failed to draw before its deadline, causing a tiny hitch.
- **Compositing** — The GPU moves or fades an element on a layer of its own, skipping layout and paint.
- **will-change** — CSS hint telling the browser an element is about to animate, so it can pre-promote it to a separate layer.
- **Layout thrashing** — Animating width, height, top, or left forces layout to be recomputed on each frame, which causes jank.

### Principles to Know

- **Purposeful animation** — Every movement earns its place by orienting, giving feedback, or exposing relationships, never by decoration alone.
- **Anticipation** — A short backswing against the direction of a move, previewing what's coming.
- **Follow-through** — Secondary parts lag behind and settle after the main motion has stopped, lending weight.
- **Squash & stretch** — Distorting an element in motion to suggest its weight, speed, and flex.
- **Perceived performance** — Skillful animation can make an interface seem quicker without any real speedup.
- **Frequency of use** — Animation seen more often should be briefer and more understated.
- **Spatial consistency** — Animate so an element retains identity and location between states, and users always know where things ended up.
- **Hardware acceleration** — Restricting animation to transform and opacity lets the GPU handle the work and keep motion fluid.
- **Reduced motion** — Obeying the prefers-reduced-motion setting: soften motion or drop it.
