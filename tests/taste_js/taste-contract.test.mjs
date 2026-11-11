import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateContract, resolveContract } from "../../skill/taste/scripts/taste-contract.mjs";
import { correctedText } from "../../skill/ui/scripts/record-corrections.mjs";
import { reviewEvidenceForBuild, screenshotHash, treeHash } from "../../skill/taste/scripts/visual-review.mjs";

const evidence = t => ({
  ...t,
  ...(t.schemaVersion === 2 ?
    {
      evidence: {
        ...t.evidence,
        layout: { sources: ["https://example.test/"], reason: "Synthetic fixture" },
        motion: { sources: ["https://example.test/"], reason: "Synthetic fixture" },
      },
    }
  : {}),
  contractEvidence: Object.fromEntries(
    ["layout", "motion"].flatMap(k =>
      Object.keys(t[k] || {}).map(f => [`${k}.${f}`, { sources: ["shots/ref.png"], reason: "observed in reference" }]),
    ),
  ),
});
const referenceDefinition = t =>
  evidence({
    schemaVersion: 2,
    name: "sample",
    source: ["https://example.test/reference"],
    use_when: [],
    fits: {},
    variants: {},
    signature: [],
    settled: {},
    heroes: ["centred"],
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
    evidence: Object.fromEntries(
      [
        "tokens.colors.light",
        "tokens.typography",
        "tokens.dimensions",
        "fonts.roles.body",
        "fonts.roles.heading",
        "guidance.character",
        "guidance.usage",
        "guidance.composition",
        "guidance.adaptations",
      ].map(field => [
        field,
        { sources: ["https://example.test/reference.png"], reason: "observed in a reference capture" },
      ]),
    ),
    layout: {
      nav: ["nav-mega"],
      footer: ["footer-columns"],
      close: ["close-type"],
      buttons: ["solid"],
      mark: ["wordmark"],
      bands: [],
      rhythm: "flow",
      headingAlign: "center",
      compositions: { feature: ["split-6-6", "split-6-6"] },
    },
    motion: {
      moments: 0,
      entrance: "still",
      scene: "none",
      effect: "none",
      reveal: "none",
      fragmentPlayback: "static",
    },
    ...t,
  });
const temp = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taste-contract-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZksAAAAASUVORK5CYII=",
  "base64",
);

test("explicit none/zero and repeated compositions survive resolution without mutating defaults", () => {
  const defaults = { layout: { bands: ["tint"], rhythm: "screens" }, motion: { moments: 2 } };
  const t = evidence({
    layout: { bands: [], rhythm: "flow", compositions: { feature: ["split-6-6", "split-6-6"] } },
    motion: { moments: 0 },
  });
  assert.deepEqual(validateContract(t), []);
  const c = resolveContract(t, defaults);
  assert.deepEqual(c.layout.bands, []);
  assert.equal(c.motion.moments, 0);
  assert.deepEqual(defaults.layout.bands, ["tint"]);
  assert.deepEqual(resolveContract({}, defaults), defaults);
});

test("unknown choices, missing evidence and contradictory budgets fail", () => {
  assert.ok(validateContract({ layout: { nav: ["unknown"] } }).some(f => f.path === "layout.nav"));
  assert.ok(validateContract({ layout: { rhythm: "flow" } }).some(f => f.path.startsWith("contractEvidence")));
  assert.ok(
    validateContract(evidence({ motion: { moments: 0 }, signature: ["moments/word-highlight"] })).some(
      f => f.path === "motion.moments",
    ),
  );
});

test("real plan CLI preserves no bands and zero moments and records its contract", t => {
  const dir = temp(t),
    packs = path.join(dir, "packs"),
    project = path.join(dir, "project");
  fs.mkdirSync(project);
  write(path.join(packs, "sample/taste.json"), JSON.stringify(referenceDefinition({})));
  const run = spawnSync(
    process.execPath,
    [
      path.resolve("skill/taste/scripts/start.mjs"),
      "plan",
      "--page",
      "software",
      "--trade",
      "saas",
      "--has",
      "ui",
      "--taste",
      "sample",
      "--no-recent",
    ],
    { cwd: project, encoding: "utf8", env: { ...process.env, TASTE_SKILL_TASTES: packs } },
  );
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /bands\s+none/);
  assert.match(run.stdout, /moments\s+none \(recorded\)/);
  const deal = JSON.parse(fs.readFileSync(path.join(project, ".taste-skill/deal.json"), "utf8"));
  assert.deepEqual(deal.moments, []);
  assert.equal(deal.entrance, "still");
  assert.equal(deal.effect, null);
  assert.equal(deal.contract.layout.rhythm, "flow");
  assert.equal(deal.planVersion, 2);
  assert.equal(deal.mode, "reference");
  assert.equal(fs.existsSync(path.join(project, ".taste-skill/history.json")), false);
});

test("explicit reference mode rejects legacy packs while default planning preserves them", t => {
  const dir = temp(t),
    packs = path.join(dir, "packs"),
    project = path.join(dir, "project");
  fs.mkdirSync(project);
  const legacy = referenceDefinition({});
  delete legacy.schemaVersion;
  const packFile = path.join(packs, "sample/taste.json");
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
  assert.equal(fs.existsSync(path.join(project, ".taste-skill/deal.json")), false);

  const run = spawnSync(process.execPath, [cli, "plan", "--page", "software", "--taste", "sample", "--no-recent"], {
    cwd: project,
    encoding: "utf8",
    env,
  });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const deal = JSON.parse(fs.readFileSync(path.join(project, ".taste-skill/deal.json"), "utf8"));
  assert.equal(deal.taste, "sample");
  assert.equal(Object.hasOwn(deal, "planVersion"), false);
  assert.equal(fs.readFileSync(packFile, "utf8"), original);
});

test("V2 recorder recaptures leave the authored taste definition byte-for-byte unchanged", t => {
  const dir = temp(t),
    packs = path.join(dir, "packs"),
    pack = path.join(packs, "sample");
  fs.cpSync(path.resolve("tests/fixtures/taste_v2/sample"), pack, { recursive: true });
  const manifest = path.join(pack, "taste.json");
  const original = fs.readFileSync(manifest);
  const capture = path.join(dir, "capture.json");
  write(capture, fs.readFileSync("tests/fixtures/ui_capture.json", "utf8"));
  const run = spawnSync(
    process.execPath,
    [path.resolve("skill/ui/scripts/record.mjs"), "--from", capture, "--name", "sample", "--root", packs, "--force"],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.deepEqual(fs.readFileSync(manifest), original);
  assert.match(fs.readFileSync(path.join(pack, "design-system.txt"), "utf8"), /Generated from `taste.json`/);
});

test("V2 outputs resolve pack-local signature components using the pack root", t => {
  const dir = temp(t),
    packs = path.join(dir, "packs"),
    pack = path.join(packs, "sample");
  fs.cpSync(path.resolve("tests/fixtures/taste_v2/sample"), pack, { recursive: true });
  const component = path.join(pack, "assets/components/brand-symbol");
  fs.mkdirSync(component, { recursive: true });
  write(path.join(component, "meta.json"), JSON.stringify({ id: "brand-symbol" }));
  const manifest = JSON.parse(fs.readFileSync(path.join(pack, "taste.json"), "utf8"));
  manifest.signature = ["components/brand-symbol"];
  manifest.layout.nav = ["components/brand-symbol"];
  write(path.join(pack, "taste.json"), JSON.stringify(manifest));

  const cli = path.resolve("skill/ui/scripts/record.mjs");
  for (const command of ["kit", "css", "guide"]) {
    const run = spawnSync(process.execPath, [cli, command, "sample", "--root", packs], { encoding: "utf8" });
    assert.equal(run.status, 0, `${command}: ${run.stdout}${run.stderr}`);
  }
});

test("corrections retain raw observations and reject ambiguous or stale replacements", t => {
  const dir = temp(t),
    original = "| body | Serif | 36 |";
  write(path.join(dir, "shots/ref.png"), png);
  write(
    path.join(dir, "corrections.json"),
    JSON.stringify([
      { from: original, to: "| body | Sans | 18 |", reason: "quote was selected", source: "shots/ref.png" },
    ]),
  );
  assert.equal(correctedText(original, dir), "| body | Sans | 18 |");
  assert.equal(original, "| body | Serif | 36 |");
  assert.throws(() => correctedText(original + original, dir), /ambiguous/);
  assert.throws(() => correctedText("changed capture", dir), /missing/);
});

test("real recorder bridges container, flat cards, heading weight and captured gradients", t => {
  const dir = temp(t);
  write(
    path.join(dir, "sample/taste.json"),
    JSON.stringify({
      name: "sample",
      source: ["https://example.test/"],
      use_when: [],
      fits: {},
      variants: {},
      signature: [],
      settled: {},
    }),
  );
  const capture = JSON.parse(fs.readFileSync("tests/fixtures/ui_capture.json", "utf8"));
  capture.type.push({ role: "h2", family: "Geist", size: 40, line: 44, weight: 450, tracking: "0" });
  capture.components.card = [{ radius: 0, pad: 16, bg: "transparent", border: "1px solid #cccccc", shadow: "none" }];
  capture.fills = { primary: { css: "linear-gradient(90deg, #1e82e0, #1c38ea)" } };
  const file = path.join(dir, "capture.json");
  write(file, JSON.stringify(capture));
  const cli = path.resolve("skill/ui/scripts/record.mjs");
  const record = spawnSync(process.execPath, [cli, "--from", file, "--name", "sample", "--root", dir], {
    encoding: "utf8",
  });
  assert.equal(record.status, 0, record.stderr);
  const kit = spawnSync(process.execPath, [cli, "kit", "sample", "--root", dir], { encoding: "utf8" });
  assert.equal(kit.status, 0, kit.stderr);
  for (const expected of [
    "--container: 1200px",
    "--nav: 64px",
    "--r-lg: 0px",
    "--panel-fill: transparent",
    "--panel-shadow: none",
    "--h2-weight: 450",
    "--btn-fill: linear-gradient(90deg, #1e82e0, #1c38ea)",
  ])
    assert.ok(kit.stdout.includes(expected), expected);
});

test("visual evidence requires all regions and states, and invalidates changed assets and screenshots", t => {
  const dir = temp(t),
    project = path.join(dir, "project"),
    pack = path.join(dir, "pack");
  write(path.join(project, "index.html"), "<main>fixture</main>");
  write(path.join(project, "assets/main.css"), "main{color:black}");
  write(path.join(pack, "taste.json"), "{}");
  write(path.join(project, "shots/actual.png"), png);
  write(path.join(pack, "shots/ref.png"), png);
  const review = {
    status: "reviewed",
    buildHash: treeHash(project),
    packHash: treeHash(pack, true),
    states: { hover: "stable", focus: "visible ring", reducedMotion: "no motion" },
    comparisons: ["hero", "middle", "close"].flatMap(region =>
      ["1440x900", "390x844"].map(viewport => ({
        region,
        viewport,
        reference: "shots/ref.png",
        actual: "shots/actual.png",
        referenceHash: screenshotHash(pack, "shots/ref.png"),
        actualHash: screenshotHash(project, "shots/actual.png"),
        notes: {
          composition: "matches",
          typography: "matches",
          surfaces: "matches",
          imagery: "adapted",
          motion: "static",
        },
        findings: [],
        adaptations: [],
      })),
    ),
  };
  const file = path.join(project, ".taste-skill/visual-review.json");
  write(file, JSON.stringify(review));
  assert.deepEqual(reviewEvidenceForBuild({ project, pack }), []);
  write(path.join(project, "assets/main.css"), "main{color:red}");
  assert.ok(reviewEvidenceForBuild({ project, pack }).some(f => /stale/.test(f.msg)));
  write(path.join(project, "assets/main.css"), "main{color:black}");
  review.comparisons.pop();
  write(file, JSON.stringify(review));
  assert.ok(reviewEvidenceForBuild({ project, pack }).some(f => /missing close/.test(f.msg)));
  write(path.join(project, "shots/actual.png"), Buffer.concat([png, Buffer.from("changed")]));
  assert.ok(reviewEvidenceForBuild({ project, pack }).some(f => /image changed/.test(f.msg)));
});
