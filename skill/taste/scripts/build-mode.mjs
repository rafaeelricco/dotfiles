const modes = new Set(["house", "reference"]);

/** Infer the build mode from its taste, or reject an explicit contradiction.
 * A legacy v1 taste stays on the prior planner and gate path until explicitly migrated.
 * @param {{mode?: string | boolean, taste?: string | boolean | null, tasteVersion?: number}} options
 */
export function resolveMode({ mode, taste, tasteVersion } = {}) {
  const inferred =
    taste ?
      tasteVersion === 1 ?
        "legacy"
      : "reference"
    : "house";
  if (mode != null && mode !== false) {
    if (typeof mode !== "string" || !modes.has(mode))
      throw new Error(`--mode must be house or reference (got "${mode}")`);
    if (mode === "reference" && inferred === "legacy")
      throw new Error("--mode reference requires a schemaVersion: 2 taste; legacy v1 tastes use the legacy planner");
    if (mode !== inferred)
      throw new Error(
        mode === "house" ?
          "--mode house conflicts with --taste; a taste plan uses reference mode"
        : "--mode reference requires --taste <name>",
      );
  }
  return inferred;
}
