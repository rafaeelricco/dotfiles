---
name: apple-design
description: Apply Apple's human-interface design principles to web interfaces. Use when building or reviewing interaction feedback, gesture-driven controls, interruptible motion, spatial transitions, typography, translucent materials, responsive layouts, or accessibility for polished web UI.
---

# Apple Design for the Web

Apply the reasoning behind Apple interfaces without copying platform chrome or
adding motion for its own sake. Preserve the conventions of the product,
framework, and target platform. Treat clarity, control, and accessibility as
requirements rather than finishing work.

## Workflow

1. Identify the user's goal, primary task, input methods, device constraints,
   and accessibility needs.
2. Inspect the existing design language, component behavior, and platform
   conventions before proposing changes.
3. Define visible states, transitions, cancellation paths, and recovery
   behavior before selecting animation techniques.
4. Implement the smallest behavior that gives immediate and continuous
   feedback.
5. Test interruption, reversal, keyboard use, reduced motion, zoom, resizing,
   and each supported pointer type.

## Design Principles

Use these principles together. Resolve conflicts according to the user's goal
and context instead of treating any one principle as an absolute.

- **Purpose:** Make every element support a real user goal. Remove work and
  decoration that compete with the primary task.
- **Agency:** Keep people in control. Provide clear choices, cancellation,
  escape routes, and recovery from mistakes. Reserve confirmation for actions
  whose consequences justify interruption.
- **Responsibility:** Protect privacy, safety, attention, and data. Ask for
  permissions in context, explain their purpose, and collect only what the
  feature needs.
- **Familiarity:** Prefer established web and product conventions. Keep the
  appearance, location, and behavior of repeated controls consistent.
- **Flexibility:** Support different viewports, input methods, languages,
  abilities, and user preferences without losing task or navigation context.
- **Simplicity:** Make the next useful action clear. Use hierarchy and concise
  language; do not confuse visual emptiness with ease of use.
- **Craft:** Make spacing, type, alignment, wording, feedback, and motion feel
  intentional. Verify details under real content and interaction, not only in
  a static ideal state.
- **Delight:** Choose an appropriate emotional quality, such as calm or
  confidence, and earn it through the other principles. Do not bolt decorative
  effects onto an unresolved experience.

## Fluid Interaction

### Respond immediately

- Show a visible pressed, selected, or active state as soon as input begins.
- Keep feedback synchronized with the action that causes it.
- Avoid artificial delays and animation queues on the direct input path.
- Preserve feedback when motion is reduced; substitute color, opacity, shape,
  or another calm state change when necessary.

### Track manipulation continuously

- Keep dragged content connected to the pointer throughout the gesture.
- Preserve the offset between the initial contact point and the manipulated
  element instead of snapping the element beneath the pointer.
- Use Pointer Events and pointer capture when a gesture must continue beyond
  the element's bounds.
- Preserve native scrolling and browser gestures outside the axis or region
  the custom interaction owns. Set `touch-action` only as narrowly as needed.

### Make motion interruptible

- Let new input take control from the element's current rendered position.
- Cancel or retarget in-flight motion without waiting for completion.
- Carry current velocity into a retargeted physical animation when the chosen
  animation system supports it.
- Model meaningful states such as idle, pressed, dragging, settling, open, and
  closed explicitly. Prevent state changes from producing visual jumps.
- Test rapid reversal and repeated input; do not disable controls merely to
  protect an animation.

### Respect momentum and boundaries

- Consider both position and release velocity when selecting a destination for
  a flick, swipe, drawer, sheet, or carousel.
- Use progressive resistance beyond a soft boundary, then settle toward a
  valid state. Keep hard constraints for safety or correctness.
- Make the result predictable: direction, available destinations, and the
  threshold for commitment must match the visible interaction.
- Keep two-dimensional motion independent by axis when each axis has different
  constraints or velocity.

### Preserve spatial continuity

- Connect overlays, menus, sheets, and expanded content to the control or
  location that produced them.
- Use compatible paths and origins for entry, exit, and reversal.
- Keep persistent content and controls in recognizable positions across
  layout changes whenever the task permits.
- Use motion to explain a change in hierarchy or location, not to disguise an
  unrelated replacement.

### Resolve competing gestures deliberately

- Delay commitment until movement reveals enough intent, while continuing to
  provide safe feedback.
- Consider tap, drag, scroll, and cancellation from the start of the pointer
  sequence rather than recognizing only the final swipe direction.
- Provide a keyboard and assistive-technology path for every action exposed
  only through a custom gesture.
- Avoid custom gestures when a standard control or native scrolling behavior
  already solves the task.

## Choose the Motion Model

- Use a spring or another retargetable physical model for motion directly
  driven by a gesture, especially when release velocity and interruption are
  observable.
- Use duration-based easing for discrete, short transitions whose velocity
  does not come from the user and whose intermediate position is not
  interactive.
- Avoid prescribing one duration, easing curve, or spring configuration for
  every component. Tune against distance, scale, input method, surrounding
  motion, and the emotional tone of the task.
- Remove bounce unless it communicates physical energy or a boundary. Excess
  oscillation delays comprehension and can create discomfort.
- Animate `transform` and `opacity` for frequent frame updates where possible.
  Measure layout outside the animation loop and avoid forced layout per frame.
- Use `requestAnimationFrame` for manual display-synchronized updates. Prefer
  a framework or browser primitive that supports cancellation and retargeting
  over building a general animation engine for one interaction.

## Typography

- Start with `system-ui` unless brand or content needs justify another family.
- Use optical sizing when the selected variable font supports it.
- Establish hierarchy through size, weight, spacing, and position as a system;
  do not rely on size alone.
- Tune tracking by text size and role. Large display text can tolerate tighter
  spacing; small or dense text needs enough space to remain legible.
- Tune line height to size, measure, language, and content density. Avoid one
  line-height value across the entire type scale.
- Express scalable type and surrounding spacing with relative units. Verify
  browser zoom and enlarged default text without clipped controls or lost
  content.
- Keep labels concise and specific. Do not trade clarity for visual symmetry
  or force important text into a fixed single line.

## Materials and Depth

- Use translucency to communicate layering, navigation, or separation while
  retaining context. Do not use blur as generic decoration.
- Keep content legible over every background the material can reveal. Pair
  translucency with sufficient contrast and restrained visual noise.
- Provide an opaque or near-opaque fallback when blur is unavailable,
  expensive, visually busy, or unsuitable for user preferences.
- Avoid stacking several translucent surfaces when the resulting hierarchy is
  ambiguous or the combined background harms readability.
- Match apparent depth to function through restrained shadow, edge treatment,
  overlap, and motion. Avoid making every surface appear elevated.
- Distinguish modal interruption from parallel work. Use a scrim and focus
  containment for a blocking task; preserve surrounding context for a
  non-blocking panel.

## Accessibility and Adaptation

- Use semantic HTML and native controls before recreating their behavior.
- Preserve a visible focus indicator and logical focus order. Move and restore
  focus deliberately when opening and closing modal UI.
- Make controls large enough for their input context and do not require precise
  pointer movement for common actions.
- Never rely on motion, color, sound, or haptics as the only signal for status,
  completion, warning, or error.
- Under `prefers-reduced-motion: reduce`, replace large translations, zooms,
  parallax, repeated motion, and elastic settling with a calm state change such
  as a short cross-fade or an immediate update.
- Preserve causality and orientation under reduced motion. Do not remove the
  feedback that explains what changed.
- Check increased contrast and forced-color environments. Ensure translucent
  surfaces and custom focus treatments degrade into readable solid states.
- Avoid time-limited interactions where possible. When timing is required,
  provide enough time and a way to pause, extend, or recover.

## Build and Review Output

For implementation work:

1. State the user-visible success criteria.
2. Define the interaction states and input ownership.
3. Implement the minimum behavior that satisfies them.
4. Verify the behavior with real interaction, including interruption and the
   relevant accessibility preferences.

For review work, report concrete findings in priority order. For each finding:

- Identify the affected element or interaction.
- Cite the observable behavior or code that creates the issue.
- Explain the user-visible consequence.
- Recommend the smallest correction and how to verify it.

Do not redesign unrelated UI, impose an Apple visual imitation, or add motion
to a static interface without a communication or feedback need.

## Primary Sources

- [Human Interface Guidelines: Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [WWDC18: Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)
- [Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Human Interface Guidelines: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
