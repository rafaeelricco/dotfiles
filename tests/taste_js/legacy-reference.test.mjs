import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

test("legacy tastes retain the previous planning and gate record without migration", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-taste-plan-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const packs = path.join(root, "packs");
  const project = path.join(root, "project");
  const packFile = path.join(packs, "sample", "taste.json");
  fs.mkdirSync(project);

  const evidence = () => ({
    sources: ["https://example.test/reference.png"],
    reason: "Recorded in a legacy reference",
  });
  const layout = {
    nav: ["nav-mega"],
    footer: ["footer-dark"],
    close: ["close-type"],
    buttons: ["solid"],
    mark: ["wordmark"],
    bands: [],
    rhythm: "screens",
    headingAlign: "left",
  };
  const motion = { moments: 0, entrance: "still", scene: "none", effect: "none" };
  const legacy = {
    name: "sample",
    source: ["https://example.test/"],
    use_when: [],
    fits: {},
    variants: {},
    signature: [],
    settled: {},
    layout,
    motion,
    contractEvidence: Object.fromEntries([
      ...Object.keys(layout).map(key => [`layout.${key}`, evidence()]),
      ...Object.keys(motion).map(key => [`motion.${key}`, evidence()]),
    ]),
  };
  const original = JSON.stringify(legacy);
  write(packFile, original);
  const cli = path.resolve("skill/taste/scripts/start.mjs");
  const env = { ...process.env, TASTE_SKILL_TASTES: packs };

  const explicitReference = spawnSync(
    process.execPath,
    [cli, "plan", "--page", "software", "--taste", "sample", "--mode", "reference"],
    { cwd: project, encoding: "utf8", env },
  );
  assert.equal(explicitReference.status, 2, explicitReference.stdout + explicitReference.stderr);
  assert.match(explicitReference.stderr, /schemaVersion: 2/);
  assert.equal(fs.existsSync(path.join(project, ".taste-skill")), false);

  const plan = spawnSync(process.execPath, [cli, "plan", "--page", "software", "--taste", "sample", "--no-recent"], {
    cwd: project,
    encoding: "utf8",
    env,
  });
  assert.equal(plan.status, 0, plan.stdout + plan.stderr);
  assert.doesNotMatch(plan.stdout, /REFERENCE PLAN|data-build-mode=|contract attrs/);
  const deal = JSON.parse(fs.readFileSync(path.join(project, ".taste-skill", "deal.json"), "utf8"));
  assert.equal(deal.taste, "sample");
  assert.equal(deal.planVersion, undefined);
  assert.equal(deal.mode, undefined);
  assert.equal(fs.readFileSync(packFile, "utf8"), original);
});
