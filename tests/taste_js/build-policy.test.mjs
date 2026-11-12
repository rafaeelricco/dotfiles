import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyBuildFindings,
  definitionDigest,
  definitionFreshnessFindings,
  pagePlanFindings,
  planMarkupFindings,
  validateBuildPlan,
} from "../../skill/taste/scripts/build-policy.mjs";

const definition = { name: "studio", layout: { rhythm: "flow" }, motion: { moments: 1 } };
const plan = () => ({
  planVersion: 2,
  mode: "reference",
  taste: "studio",
  page: "software",
  definitionHash: definitionDigest(definition),
  layout: { compositions: {} },
  contract: {
    layout: { rhythm: "flow", headingAlign: "left" },
    motion: {
      moments: 1,
      entrance: "still",
      scene: "none",
      effect: "none",
      reveal: "default",
      fragmentPlayback: "static",
    },
  },
  hero: "centred",
  entrance: "still",
  moments: [],
  scene: null,
  effect: null,
  signature: [],
});

test("reference policy makes only explicit house-aesthetic findings advisory", () => {
  const findings = [
    { check: "heading-align", where: "section#intro", msg: "alignment preference" },
    { check: "overflow-x", where: "section#intro", msg: "content overflows" },
    { check: "unknown-check", where: "section#intro", msg: "unregistered finding" },
  ];
  const result = classifyBuildFindings(findings, "reference");
  assert.deepEqual(
    result.advisory.map(f => f.check),
    ["heading-align"],
  );
  assert.deepEqual(
    result.blocked.map(f => f.check),
    ["overflow-x", "unknown-check"],
  );
});

test("hard contract errors block even if their check id is aesthetic", () => {
  const result = classifyBuildFindings([{ check: "heading-align", where: "taste studio", hard: true }], "reference");
  assert.equal(result.advisory.length, 0);
  assert.equal(result.blocked.length, 1);
});

test("house mode keeps every current finding blocking", () => {
  const result = classifyBuildFindings([{ check: "heading-align" }, { check: "overflow-x" }], "house");
  assert.equal(result.advisory.length, 0);
  assert.equal(result.blocked.length, 2);
});

test("V2 page mode and taste identity must match the persisted plan", () => {
  const issues = pagePlanFindings(
    plan(),
    '<html data-build-mode="house"><head><meta name="taste" content="another"></head></html>',
  );
  assert.equal(issues.length, 2);
  assert.ok(issues.every(f => f.hard));
  assert.ok(issues.some(f => f.where === "html[data-build-mode]"));
  assert.ok(issues.some(f => f.where === "meta[name=taste]"));
});

test("reference markup checks identifiable hero, entrance, effect, component, layout and footer selections", () => {
  const reference = {
    ...plan(),
    entrance: "rise",
    effect: { id: "quiet-glow", slot: "hero" },
    signature: [{ family: "components", id: "brand-symbol" }],
    layout: {
      nav: "nav-centre",
      footer: "footer-visit",
      close: "close-photo",
      buttons: "solid",
      mark: "arc",
      compositions: { feature: ["bleed-panel", "split-6-6", "mirrored", "mirrored"] },
    },
  };
  const html = `<html data-build-mode="reference" data-buttons="solid" data-mark="arc"><head><meta name="taste" content="studio"></head><body>
    <header class="nav nav--centre"><span class="mark" data-mark="arc"></span></header>
    <section class="hero hero--centred" data-enter="rise"></section><main>
    <section class="comp-bleed"></section><div class="grid grid--mirror"></div><div class="grid grid--mirror"></div>
    <div data-fx="quiet-glow"></div><div data-component="brand-symbol"></div></main>
    <footer class="footer footer--visit"><div class="closing__cta close--photo"></div></footer></body></html>`;
  assert.deepEqual(planMarkupFindings(reference, html), []);

  const changed = html
    .replace("hero--centred", "hero--word")
    .replace('data-enter="rise"', "")
    .replace('data-fx="quiet-glow"', 'data-fx="other"')
    .replace('data-component="brand-symbol"', "")
    .replace('data-buttons="solid"', 'data-buttons="pill"')
    .replaceAll('data-mark="arc"', 'data-mark="ring"')
    .replace("footer--visit", "footer--dark")
    .replace("close--photo", "close--word");
  const issues = planMarkupFindings(reference, changed);
  for (const expected of [
    "hero centred",
    "hero entrance rise",
    "effect quiet-glow",
    "component brand-symbol",
    "html data-buttons",
    "brand mark",
    "footer type",
    "closing form close-photo",
  ])
    assert.ok(
      issues.some(f => f.where === expected && f.hard),
      expected,
    );
});

test("known composition marker repetitions are strict while unmarked split-6-6 stays visual", () => {
  const reference = {
    ...plan(),
    entrance: "still",
    layout: {
      nav: "nav-mega",
      footer: "footer-columns",
      close: "close-type",
      buttons: "solid",
      mark: "wordmark",
      compositions: { feature: ["bleed-panel", "split-6-6", "mirrored", "bleed-panel"] },
    },
  };
  const html = `<html data-build-mode="reference" data-buttons="solid" data-mark="wordmark"><meta name="taste" content="studio">
    <header class="nav"><span class="nav__logo">Studio</span></header>
    <section class="hero hero--centred" data-enter="still"></section><main>
    <section class="comp-bleed"></section><div class="grid grid--mirror"></div></main>
    <footer class="footer"><div class="closing__cta close--type"></div></footer></html>`;
  const finding = planMarkupFindings(reference, html).find(f => f.where === "composition marker bleed-panel");
  assert.ok(finding?.hard);
  assert.match(finding.msg, /bleed-panel 2 times/);
  assert.match(finding.msg, /bleed-panel 1 time/);
});
test("reference none and zero motion contracts reject unplanned mounts", () => {
  const reference = {
    ...plan(),
    contract: {
      layout: { rhythm: "flow", headingAlign: "left" },
      motion: {
        moments: 0,
        entrance: "still",
        scene: "none",
        effect: "none",
        reveal: "none",
        fragmentPlayback: "static",
      },
    },
    layout: { buttons: "solid", mark: "wordmark" },
  };
  const html = `<html data-build-mode="reference" data-buttons="solid" data-mark="wordmark"><meta name="taste" content="studio">
    <section class="hero hero--centred" data-enter="still"></section><main>
    <div data-moment="extra" data-big-scene="extra-scene" data-fx="extra-effect"></div></main></html>`;
  const issues = planMarkupFindings(reference, html);
  assert.ok(issues.some(f => f.where === "unplanned moment extra" && f.hard));
  assert.ok(issues.some(f => f.where === "unplanned scene extra-scene" && f.hard));
  assert.ok(issues.some(f => f.where === "unplanned effect extra-effect" && f.hard));
});

test("V2 reference plans reject stale definitions and malformed plan shapes", () => {
  const saved = plan();
  assert.ok(validateBuildPlan(saved).length === 0);
  assert.equal(definitionFreshnessFindings(saved, definition).length, 0);
  assert.equal(definitionFreshnessFindings(saved, { ...definition, layout: { rhythm: "screens" } }).length, 1);
  assert.ok(validateBuildPlan({ ...saved, layout: null }).some(f => f.field === "layout"));
  assert.ok(validateBuildPlan({ ...saved, contract: {} }).some(f => f.field === "contract.layout"));
});

test("resolved auto selections and nonzero moment budgets still reject extra mounts", () => {
  const reference = plan();
  reference.contract.motion = { ...reference.contract.motion, moments: 1, scene: "auto", effect: "auto" };
  reference.moments = [{ id: "known" }];
  const html =
    '<html data-build-mode="reference"><section class="hero hero--centred" data-enter="still"></section><div data-moment="known"></div><div data-moment="extra" data-big-scene="extra-scene" data-fx="extra-effect"></div></html>';
  const issues = planMarkupFindings(reference, html);
  for (const where of ["unplanned moment extra", "unplanned scene extra-scene", "unplanned effect extra-effect"])
    assert.ok(
      issues.some(f => f.where === where && f.hard),
      where,
    );
});
