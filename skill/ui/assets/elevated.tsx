import { createContext, useContext, type ReactNode } from "react";

const Level = createContext(1); // 1 = the page

export const useSurfaceLevel = () => useContext(Level);

// Floating UI sits `offset` levels above what it opens on (popovers 2, dialogs 4),
// capped at 8, so a menu inside a dialog still separates from it. `shadow` pins
// the shadow to the role's level wherever it opens.
export function Elevated({
  offset,
  shadow,
  className,
  children,
}: {
  offset: number;
  shadow?: number;
  className?: string;
  children: ReactNode;
}) {
  const level = Math.min(useContext(Level) + offset, 8);
  return (
    <Level.Provider value={level}>
      <div
        className={className}
        style={{ background: `var(--surface-${level})`, boxShadow: `var(--shadow-surface-${shadow ?? level})` }}
      >
        {children}
      </div>
    </Level.Provider>
  );
}
