// Motion tiers from references/fluid/system.md. Pick by the size of what moves.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export const spring = {
  fast: { type: "spring", duration: 0.08, bounce: 0 },
  moderate: { type: "spring", duration: 0.16, bounce: 0 },
  slow: { type: "spring", duration: 0.24, bounce: 0.12 },
} as const;

// Exits are plain tweens one tier quicker, so a dismissal reads as final.
export const exit = {
  fast: { duration: 0.06, ease: EASE_OUT },
  moderate: { duration: 0.12, ease: EASE_OUT },
  slow: { duration: 0.16, ease: EASE_OUT },
} as const;
