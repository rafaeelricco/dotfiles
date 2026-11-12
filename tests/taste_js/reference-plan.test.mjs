import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveMode } from "../../skill/taste/scripts/build-mode.mjs";
import { armBuild, assertSafeWritePath, writeJsonSafe } from "../../skill/taste/scripts/build-state.mjs";
import { compileReferencePlan } from "../../skill/taste/scripts/reference-plan.mjs";

const source = { sources: ["https://example.test/reference.png"], reason: "observed in a reference capture" };
const definition = overrides => {
  const layout = {
    nav: ["nav-split", "nav-mega"],
    footer: ["footer-columns"],
    close: ["close-type"],
    buttons: ["solid"],
    mark: ["wordmark"],
    bands: [],
    rhythm: "flow",
    headingAlign: "center",
  };
  const motion = {
    moments: 0,
    entrance: "still",
    scene: "none",
    effect: "none",
    reveal: "none",
    fragmentPlayback: "static",
  };
  const out = {
    schemaVersion: 2,
    name: "sample",
    source: ["https://example.test/reference"],
    use_when: [],
    fits: {},
    variants: {},
    signature: [],
    settled: {},
    heroes: ["centred"],
    layout,
    motion,
    tokens: {
      colors: {
        light: {
          "--p-bg": "#ffffff",
          "--p-ink": "#111111",
          "--p-surface": "#f4f4f4",
          "--p-muted": "#555555",
          "--p-accent": "#2457c5",
          "--p-accent-ink": "#ffffff",
          "--p-action": "#2457c5",
          "--p-action-ink": "#ffffff",
        },
        dark: null,
      },
      typography: { "--t-h1": "48px", "--t-h2": "32px", "--t-body": "16px" },
      surfaces: {},
      dimensions: { "--container": "1200px", "--nav": "72px" },
    },
    fonts: {
      roles: Object.fromEntries(
        ["body", "heading"].map(role => [role, { family: "system-ui", sources: [], fallbacks: ["sans-serif"] }]),
      ),
    },
    guidance: {
      character: "Clear and measured.",
      usage: ["Use direct language."],
      composition: ["Keep the hierarchy compact."],
      adaptations: ["Use accessible contrast."],
    },
    evidence: {
      layout: source,
      motion: source,
      "tokens.colors.light": source,
      "tokens.typography": source,
      "tokens.dimensions": source,
      "fonts.roles.body": source,
      "fonts.roles.heading": source,
      "guidance.character": source,
      "guidance.usage": source,
      "guidance.composition": source,
      "guidance.adaptations": source,
    },
    contractEvidence: {
      ...Object.fromEntries(Object.keys(layout).map(key => [`layout.${key}`, source])),
      ...Object.fromEntries(Object.keys(motion).map(key => [`motion.${key}`, source])),
    },
  };
  return {
    ...out,
    ...overrides,
    layout: { ...layout, ...overrides?.layout },
    motion: { ...motion, ...overrides?.motion },
  };
};

const temporary = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reference-plan-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test("mode inference follows taste and rejects explicit contradictions", () => {
  assert.equal(resolveMode({}), "house");
  assert.equal(resolveMode({ taste: "sample" }), "reference");
  assert.equal(resolveMode({ taste: "sample", tasteVersion: 1 }), "legacy");
  assert.throws(() => resolveMode({ mode: "reference", taste: "sample", tasteVersion: 1 }), /schemaVersion: 2/);
  assert.equal(resolveMode({ mode: "house" }), "house");
  assert.equal(resolveMode({ mode: "reference", taste: "sample" }), "reference");
  assert.throws(() => resolveMode({ mode: "house", taste: "sample" }), /conflicts/);
  assert.throws(() => resolveMode({ mode: "reference" }), /requires --taste/);
});

test("reference choices use first compatible values and preserve explicit none and zero", t => {
  const dir = temporary(t);
  const first = compileReferencePlan(definition({}), { page: "software", has: "ui", packDir: dir });
  const second = compileReferencePlan(definition({}), { page: "software", has: "ui", packDir: dir, history: ["used"] });
  assert.deepEqual(first, second);
  assert.equal(first.planVersion, 2);
  assert.equal(first.mode, "reference");
  assert.equal(first.layout.nav, "nav-mega");
  assert.deepEqual(first.layout.bands, []);
  assert.deepEqual(first.moments, []);
  assert.equal(first.contract.motion.moments, 0);
  assert.equal(first.entrance, "still");
  assert.equal(first.scene, null);
  assert.equal(first.effect, null);
  assert.equal(first.contract.layout.rhythm, "flow");
  assert.equal(first.contract.layout.headingAlign, "center");
});

test("a reference plan without a compatible recorded hero fails", t => {
  const dir = temporary(t);
  assert.throws(
    () => compileReferencePlan(definition({ heroes: ["place"] }), { page: "software", has: "ui", packDir: dir }),
    /no compatible hero/,
  );
});

test("state writes reject file links and parent arming joins the open build", t => {
  const dir = temporary(t);
  const outside = path.join(dir, "outside");
  fs.mkdirSync(outside);
  const canary = path.join(outside, "canary.txt");
  fs.writeFileSync(canary, "safe");
  const site = path.join(dir, "site");
  fs.mkdirSync(path.join(site, ".taste-skill"), { recursive: true });
  const targetLink = path.join(site, ".taste-skill", "deal.json");
  try {
    fs.symlinkSync(canary, targetLink, "file");
  } catch (error) {
    return t.skip(`symlinks unavailable: ${error.message}`);
  }
  assert.throws(() => assertSafeWritePath(targetLink), /symlink or junction/);
  assert.throws(() => writeJsonSafe(targetLink, { replaced: true }), /symlink or junction/);
  assert.equal(fs.readFileSync(canary, "utf8"), "safe");

  const parent = path.join(dir, "parent");
  fs.mkdirSync(path.join(parent, ".taste-skill"), { recursive: true });
  fs.mkdirSync(path.join(parent, "site"), { recursive: true });
  const marker = path.join(parent, ".taste-skill", "build.json");
  writeJsonSafe(marker, { start: "2026-11-11T00:00:00Z", page: null, kind: null });
  armBuild("software", path.join(parent, "site"));
  assert.equal(JSON.parse(fs.readFileSync(marker, "utf8")).page, "site");
  assert.equal(fs.existsSync(path.join(parent, "site", ".taste-skill", "build.json")), false);
});
