# Laws

Limits for motion in any medium. Project tokens and `../fluid/system.md` live
inside them, never above. _(interactive)_ marks a rule that needs a viewer who
triggers or can interrupt the motion; linear work (video, a reel) is exempt,
because nobody is waiting on it.

## Gate

_(interactive)_ The more often something is seen, the less it may move:

100+/day → none · tens/day → near-zero or none · occasional → standard ·
rare / first-time → delight allowed.

Keyboard-initiated actions sit in the 100+/day tier. A surface opened or closed
from the keyboard (a ⌘K palette, a menu opened by a key) appears and leaves with
no motion: these repeat constantly, so any animation reads as delay. An indicator
that follows keyboard position (focus ring, arrow-key highlight) may move on the
fast tier: the short glide shows where focus jumped, which is feedback, not decoration.

In any medium, every animation must answer to one purpose: feedback, spatial consistency,
state indication, preventing a jarring change, delight (rare tier only), or
explanation (marketing only). No purpose → don't animate. Data the user reads or
acts on doesn't move for style, since motion there costs comprehension.

## Easing

Entering / leaving → decelerating curve. Moving on screen → ease-in-out.
Color / hover → ease. Loops, progress → linear.

- (interactive) Never ease-in on anything the user triggered, exits included:
  the slow start reads as lag right after the input.
- Linear work may ease-in an object leaving the frame.
- The stock `ease-out` keyword is too weak for deliberate motion; use the
  decelerating token instead.
- Take curves from `../fluid/system.md` or easing.dev / easings.co; never
  invent one, and reuse the project's existing curves before adding a parallel set.

## Timing

- (interactive) UI motion ≤300ms.
- Larger moving things take longer; small ones stay quick.
- Exits are a plain tween, one tier quicker than the entrance.
- Press feedback lands ≤100ms; release settles ≤200ms.
- A deliberate hold is the reverse: the fill runs slow (user deciding), snaps
  back on release (system answering) — hold-to-confirm 2s linear / 200ms.
- Named exceptions: toast 400ms `ease`; after the first tooltip in a group, 0ms;
  ambient loops (a status indicator) keep their own slow period; rare-tier
  delight, marketing and linear work may run longer.
- Occasional group entrances (a list or grid appearing together) stagger 30–80ms per item and never block input.

Web tiers that satisfy these limits: `../fluid/system.md`.

## Physicality

- A surface entering starts at scale ≥0.95 with opacity 0 — never from 0.
  Nothing real appears from zero size.
- A glyph swapping inside a fixed-size slot may shrink to 0.6 (a light blur smooths a crossfade): its
  position is already known, so it can't "come from nowhere".
- Scale from the source (the trigger); things with no source (modals) stay centered.
- Leave along the path you entered.
- Travel that spans the element (a sheet, a toast sliding off) is a share of its
  own size, not fixed pixels, so it holds when the size changes. A nudge of a few
  pixels on entry may stay fixed.

## Springs

For gestures, interruptible motion, decorative tracking. A spring keeps the
velocity of whatever it replaces, which is why gestures use them.

Bounce 0 by default. ≤0.15 for a large surface entering (dialog, side panel).
0.2–0.3 only after a momentum gesture — a flick, throw, or drag release.

Two ways to specify one: duration plus bounce, or mass / stiffness / damping
when finer control is needed. Web durations: the tiers in `../fluid/system.md`.

## Gestures (interactive)

Track 1:1 from where the user grabbed. Start from the on-screen value, not the
target. Carry the release velocity into the settle. Decide commit vs cancel by
the projected rest point, or velocity > 0.11 px/ms. Resist past edges instead of
stopping. Techniques: `recipes.md` → Gesture physics.

## Reduced motion

Gentler, not zero: keep opacity and color, drop movement. Some viewers need the
travel gone but still need to see that the state changed.

## Judging feel

Replay at 2–5× duration or frame by frame; look again the next day; judge
gestures on real hardware.
