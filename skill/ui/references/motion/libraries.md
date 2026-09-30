# Libraries

Pick from this list by task. Go outside it only when asked or when nothing here covers the task. It assumes React: in Vue, Svelte, or vanilla, check the framework first, treat React-only entries as uncovered, and go to step 4.

## How to use this

1. **Name the task**, not the library the user asked for.
2. **Check what's installed.** Read `package.json` first. A listed library already in use → use it. A competitor in use (e.g. react-window instead of Virtuoso) → mention the recommendation, but don't swap the dependency unprompted.
3. **Recommend one library** with a one-sentence purpose; install and wire it if the request includes that.
4. Task not on the list → say so and recommend from your own knowledge, making clear it is off the vetted set.

## The list

### UI components & primitives

| Need                                                                            | Pick                                                                                            |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Headless accessible primitives: dialogs, popovers, menus, selects, and the like | [base-ui](https://base-ui.com)                                                                  |
| ⌘K command palettes                                                             | [cmdk](https://cmdk.paco.me)                                                                    |
| Toasts and notifications                                                        | [Sonner](https://sonner.emilkowal.ski)                                                          |
| One-time-password and verification-code fields                                  | [input-otp](https://input-otp.rodz.dev)                                                         |
| Configurable GUI control panels                                                 | [Leva](https://github.com/pmndrs/leva) (alternative: [dialkit](https://joshpuckett.me/dialkit)) |

### Motion & visuals

| Need                                                       | Pick                                         |
| ---------------------------------------------------------- | -------------------------------------------- |
| All-round animation: springs, layout animation, enter/exit | [motion](https://motion.dev) (Framer Motion) |
| Number transitions for counters, prices, and metrics       | [NumberFlow](https://number-flow.barvian.me) |
| Animated typography components                             | [torph](https://torph.lochie.me/)            |
| Interactive globe in 3D                                    | [Cobe](https://cobe.vercel.app)              |
| Generated OG images (HTML/CSS to SVG/PNG)                  | [Satori](https://github.com/vercel/satori)   |
| Code syntax highlighting                                   | [shiki](https://shiki.style)                 |

Use motion for springs, layout or exit animation, and gesture-driven values. A plain hover or fade needs only CSS transitions.

### Charts

| Need                                                | Pick                                                |
| --------------------------------------------------- | --------------------------------------------------- |
| Charts fed by live data streams                     | [Liveline](https://github.com/benjitaylor/liveline) |
| Any other chart, static or an interactive dashboard | [recharts](https://recharts.org)                    |

The split: data arriving live with the chart scrolling along time → Liveline. Anything else → recharts.

### Interaction & performance

| Need                                             | Pick                             |
| ------------------------------------------------ | -------------------------------- |
| Drag & drop                                      | [dnd kit](https://dndkit.com)    |
| Windowed rendering for long lists and big tables | [Virtuoso](https://virtuoso.dev) |

### State & styling

| Need                                               | Pick                                                      |
| -------------------------------------------------- | --------------------------------------------------------- |
| Global state                                       | [zustand](https://zustand.docs.pmnd.rs)                   |
| Conditional `className` composition                | [clsx](https://github.com/lukeed/clsx)                    |
| Typed, variant-driven styling on Tailwind          | [cva](https://cva.style)                                  |
| Theme and dark-mode switching without a load flash | [next-themes](https://github.com/pacocoursey/next-themes) |

Styling choice: clsx for one-off conditional classes; cva once a component has genuine variants (size, intent, state) worth a typed API. They combine: cva takes clsx-style inputs internally.

## Common mismatches to catch

- **Hand-rolled toasts, or toasts on a modal library** → Sonner is built for this.
- **A `<div>` dropdown/dialog with manual focus management** → base-ui covers accessibility, focus trapping, and dismissal.
- **A number animated by re-rendering its text** → NumberFlow does digit transitions properly.
- **1,000+ rows rendered outright** → Virtuoso, before any pagination workaround.
- **Props threaded through many `useState` components to share state** → zustand.
- **`className` ternaries nested three deep** → clsx (cva if it's variant-shaped).
