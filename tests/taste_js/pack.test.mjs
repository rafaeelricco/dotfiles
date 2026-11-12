// pack.mjs check: palettes under variants.effects, retired kit items, settlements no dealer reads
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const PACK = path.resolve("skill/taste/scripts/pack.mjs");
// a pack "sample" in a temp tastes folder (TASTE_SKILL_TASTES, so real packs are never read), one candidate c1
const check = manifest => {
  const tastes = fs.mkdtempSync(path.join(os.tmpdir(), "pack-"));
  const dir = path.join(tastes, "sample");
  fs.mkdirSync(path.join(dir, "capture"), { recursive: true });
  const base = {
    name: "sample",
    source: [],
    captured: "2026-11-11",
    use_when: ["a test"],
    fits: {},
    variants: {},
    signature: [],
    settled: { c1: "skip: cookie banner" },
  };
  fs.writeFileSync(path.join(dir, "taste.json"), JSON.stringify({ ...base, ...manifest }));
  fs.writeFileSync(path.join(dir, "capture/candidates.json"), JSON.stringify([{ id: "c1", kind: "loop" }]));
  const r = spawnSync(process.execPath, [PACK, "check", "sample"], {
    encoding: "utf8",
    env: { ...process.env, TASTE_SKILL_TASTES: tastes },
  });
  return { code: r.status, out: r.stdout + r.stderr };
};
const pass = r => assert.equal(r.code, 0, r.out);
const fails = (r, re) => (assert.equal(r.code, 1, r.out), assert.match(r.out, re));

test("an effect palette of the six fx keys passes", () =>
  pass(
    check({
      variants: {
        effects: { "painterly-landscape": { horizon: 0.58, palette: { bg: "#3d8de2", accent: "#f6b087" } } },
      },
    }),
  ));
test("a palette key fx.js ignores fails", () =>
  fails(
    check({ variants: { effects: { "painterly-landscape": { palette: { paper: "#ffffff" } } } } }),
    /pack-variant.*palette\.paper/,
  ));
test("a palette value that is not a hex colour fails", () =>
  fails(
    check({ variants: { effects: { "painterly-landscape": { palette: { bg: "blue" } } } } }),
    /pack-variant.*palette\.bg/,
  ));
test("a fits settlement missing from fits fails", () =>
  fails(check({ settled: { c1: "fits:ui/chat" } }), /pack-settled.*not under fits\.ui/));
test("a fits settlement listed under fits passes", () =>
  pass(check({ fits: { ui: ["chat"] }, settled: { c1: "fits:ui/chat" } })));
test("a variant settlement outside effects fails", () =>
  fails(check({ settled: { c1: "variant:components/fx-button" } }), /pack-settled.*only effects carry variants/));
test("a retired moment in fits fails", () =>
  fails(check({ fits: { moments: ["headline-arrives"] } }), /pack-ref.*headline-arrives is retired/));
test("a settlement on a retired moment fails", () =>
  fails(
    check({ fits: { moments: ["headline-arrives"] }, settled: { c1: "fits:moments/headline-arrives" } }),
    /retired/,
  ));
