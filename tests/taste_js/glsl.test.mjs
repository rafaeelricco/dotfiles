// the visuals module's GLSL lint keeps its own cases (they were never run before the split)
import assert from "node:assert/strict";
import test from "node:test";
import { visualMod } from "../../skill/taste/scripts/consistency/modules/visuals.mjs";

test("GLSL lint self-test passes", () => {
  const lines = [];
  assert.equal(
    visualMod.selfTest(l => lines.push(l)),
    true,
    lines.join("\n"),
  );
});
