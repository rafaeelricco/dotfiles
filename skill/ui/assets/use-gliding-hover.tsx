"use client";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { exit, spring } from "./springs";

type Axis = "x" | "y" | "xy";
type Rect = { x: number; y: number; width: number; height: number };
const ITEM = "[data-glide-item]:not([aria-disabled='true'])";

// The item under the pointer wins; otherwise the nearest center on the list's
// axis, so a pointer in a gap or padding still lands. Ties keep the first item.
export function pickNearest(rects: Rect[], px: number, py: number, axis: Axis): number {
  let best = -1;
  let bestDist = Infinity;
  rects.forEach((r, i) => {
    if (px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height) {
      if (bestDist !== -1) [best, bestDist] = [i, -1];
      return;
    }
    const dx = px - (r.x + r.width / 2);
    const dy = py - (r.y + r.height / 2);
    const d =
      axis === "x" ? Math.abs(dx)
      : axis === "y" ? Math.abs(dy)
      : Math.hypot(dx, dy);
    if (d < bestDist) [best, bestDist] = [i, d];
  });
  return best;
}

// Container: position: relative. Items: the clickable element carries data-glide-item
// and position: relative so it sits above the highlight.
export function useGlidingHover<C extends HTMLElement>(
  ref: RefObject<C | null>,
  { axis = "y" as Axis, gapClick = true } = {},
) {
  const items = useRef<HTMLElement[]>([]);
  const frame = useRef(0);
  const [rects, setRects] = useState<Rect[]>([]);
  const [active, setActive] = useState(-1);
  const [session, setSession] = useState(0);

  const toLocal = useCallback(
    (cx: number, cy: number) => {
      const c = ref.current!;
      const b = c.getBoundingClientRect();
      return [cx - b.left - c.clientLeft + c.scrollLeft, cy - b.top - c.clientTop + c.scrollTop] as const;
    },
    [ref],
  );

  // One measurement per frame; a layout with zero-size items is never published.
  const measure = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const c = ref.current;
      if (!c) return;
      const els = [...c.querySelectorAll<HTMLElement>(ITEM)];
      const next = els.map(el => {
        const r = el.getBoundingClientRect();
        const [x, y] = toLocal(r.left, r.top);
        return { x, y, width: r.width, height: r.height };
      });
      if (next.some(r => r.width === 0 && r.height === 0)) return;
      items.current = els;
      setRects(next);
    });
  }, [ref, toLocal]);

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [ref, measure]);

  const locate = (e: PointerEvent) => pickNearest(rects, ...toLocal(e.clientX, e.clientY), axis);

  const handlers = {
    // Mouse only: touch has no hover.
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setSession(s => s + 1); // a fresh entry fades in at the nearest item instead of sliding from the last one
      setActive(locate(e));
    },
    onPointerMove: (e: PointerEvent) => e.pointerType === "mouse" && setActive(locate(e)),
    onPointerLeave: () => setActive(-1),
    // What is lit is what a click hits: a click in a gap goes to the lit item.
    onClick: (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        !gapClick
        || active < 0
        || t.closest("[data-glide-item]")
        || t.closest("input,textarea,select,button,a,[role='button']")
      )
        return;
      items.current[active]?.click();
    },
  };

  // `measure` is exposed for lists that move without the container resizing.
  return { handlers, rects, active, session, measure };
}

export function GlidingHighlight({
  hover,
  className,
}: {
  hover: ReturnType<typeof useGlidingHover>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const r = hover.rects[hover.active];
  return (
    <AnimatePresence>
      {r && (
        <motion.div
          key={hover.session}
          aria-hidden
          className={className}
          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
          initial={{ opacity: 0, x: r.x, y: r.y, width: r.width, height: r.height }}
          animate={{ opacity: 1, x: r.x, y: r.y, width: r.width, height: r.height }}
          exit={{ opacity: 0, transition: exit.fast }}
          // Reduced motion: travel snaps, the fade stays.
          transition={reduce ? { default: { duration: 0 }, opacity: spring.fast } : spring.fast}
        />
      )}
    </AnimatePresence>
  );
}
