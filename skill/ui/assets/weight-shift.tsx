import type { ReactNode } from "react";

// Heavier text without moving neighbours: a hidden copy at the heavier weight
// reserves the width; the visible copy changes weight on top of it.
// `opsz` pairs an optical size with each weight ([at `from`, at `to`]) for fonts
// with that axis (Inter), so the heavier state also tightens and barely widens.
export function WeightShift({
  children,
  active,
  from = 400,
  to = 550,
  opsz,
}: {
  children: ReactNode;
  active: boolean;
  from?: number;
  to?: number;
  opsz?: [number, number];
}) {
  const axes = (heavy: boolean) => (opsz ? { fontVariationSettings: `"opsz" ${heavy ? opsz[1] : opsz[0]}` } : {});
  return (
    <span style={{ display: "inline-grid" }}>
      <span aria-hidden style={{ gridArea: "1 / 1", visibility: "hidden", fontWeight: to, ...axes(true) }}>
        {children}
      </span>
      <span
        style={{
          gridArea: "1 / 1",
          fontWeight: active ? to : from,
          ...axes(active),
          transition:
            "font-weight 80ms cubic-bezier(0.23, 1, 0.32, 1), font-variation-settings 80ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {children}
      </span>
    </span>
  );
}
