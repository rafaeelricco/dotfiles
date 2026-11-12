// the 2.5.2 fit rule, shared by the visuals module and runWidth (it was out of scope in runWidth before the split)
import assert from "node:assert/strict";
import test from "node:test";
import { isTreatment, sceneFitsKind } from "../../skill/taste/scripts/consistency/fit.mjs";

test("isTreatment reads meta.treatment", () => {
  assert.equal(isTreatment("duotone-grade"), true);
  assert.equal(isTreatment("ascii-shade"), false);
  assert.equal(isTreatment("no-such-effect"), false);
});

test("sceneFitsKind matches the page kind's tones and intensity", () => {
  assert.equal(sceneFitsKind("dot-becomes-the-full-stop", "place"), true); // editorial, warm; lively
  assert.equal(sceneFitsKind("parts-lock-into-the-whole", "place"), false); // tech only
  assert.equal(sceneFitsKind("dot-becomes-the-full-stop", "software"), false); // no fit rule for software
});
