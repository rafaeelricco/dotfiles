/**
 * Reference — the read-after-write delay.
 * Source: app/frontend/src/hooks/use-projection-delay.ts (ambar/HartAgency), verbatim.
 * `useProjectionDelay()` -> { schedule, cancel }. Defer success-path work that re-reads a
 * read model until the projection has likely caught up with the just-committed write.
 */
import * as React from "react";

export { EVENTUAL_CONSISTENCY_WAIT_MS, awaitProjectionConsistency, useProjectionDelay, type UseProjectionDelayReturn };

/**
 * Default UI-side wait after a write command succeeds before re-querying
 * read models. The event store commits synchronously; Mongo projections
 * catch up asynchronously.
 */
const EVENTUAL_CONSISTENCY_WAIT_MS = 2500;

/**
 * Schedule `fn` to run after the read-model projection is likely caught up
 * with the latest write, and return a cancel handle.
 *
 * Event-sourced writes return success the moment events are committed, but
 * the read-model projections queried by the UI catch up asynchronously. We
 * keep this delay in the UI (not the backend) so each client surface
 * (`app/frontend`, `app/mobile`, future consumers) controls its own
 * read-after-write behavior and the backend stays honest about what
 * "success" means.
 *
 * React components should use {@link useProjectionDelay} instead of calling this
 * directly — the hook hides the cancel + unmount lifecycle.
 */
function awaitProjectionConsistency(fn: () => void, ms = EVENTUAL_CONSISTENCY_WAIT_MS): () => void {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
}

type UseProjectionDelayReturn = {
  /** Defer `fn` until the projection is likely caught up. Supersedes any prior pending wait. */
  schedule: (fn: () => void, ms?: number) => void;
  /** Cancel the current pending wait without running its callback. */
  cancel: () => void;
};

/**
 * Hook for deferring post-write actions until read-model projections catch up.
 * Returns `{ schedule, cancel }` — destructure only what you need.
 *
 * @remarks
 * Thin React wrapper around {@link awaitProjectionConsistency}. The single
 * `useRef` that tracks the in-flight cancel handle lives here — call sites
 * stay free of refs and effects for this concern.
 */
function useProjectionDelay(): UseProjectionDelayReturn {
  const cancelRef = React.useRef<(() => void) | null>(null);

  const cancel = React.useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  const schedule = React.useCallback(
    (fn: () => void, ms?: number) => {
      cancel();
      cancelRef.current = awaitProjectionConsistency(() => {
        cancelRef.current = null;
        fn();
      }, ms);
    },
    [cancel],
  );

  return React.useMemo(() => ({ schedule, cancel }), [schedule, cancel]);
}
