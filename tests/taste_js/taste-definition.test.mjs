import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTastePack, resolveTaste, validateTaste } from "../../skill/taste/scripts/taste-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.resolve(HERE, "../fixtures/taste_v2/sample");
const copySample = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taste-v2-"));
  const pack = path.join(root, "sample");
  fs.cpSync(SAMPLE, pack, { recursive: true });
  return { root, pack };
};

test("loadTastePack accepts a complete v2 definition and keeps its full root data", () => {
  const pack = loadTastePack(SAMPLE);
  assert.equal(pack.version, 2);
  assert.equal(pack.definition.schemaVersion, 2);
  assert.ok(pack.definition.layout);
  assert.ok(pack.definition.motion);
  assert.deepEqual(pack.definition.heroes, ["split"]);
});

test("loadTastePack treats schemaVersion absence as legacy v1", t => {
  const { root, pack } = copySample();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(pack, "taste.json"), JSON.stringify({ name: "sample", source: [], use_when: [] }));
  assert.equal(loadTastePack(pack).version, 1);
});

test("unknown versions and malformed v2 values fail without guide fallback", t => {
  const { root, pack } = copySample();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(pack, "taste.json");
  const definition = JSON.parse(fs.readFileSync(file, "utf8"));
  definition.schemaVersion = 99;
  fs.writeFileSync(file, JSON.stringify(definition));
  assert.throws(() => loadTastePack(pack), /unsupported schemaVersion/);
  definition.schemaVersion = 2;
  definition.tokens.colors.light["--p-bg"] = "#fff;body{display:none}";
  fs.writeFileSync(file, JSON.stringify(definition));
  assert.ok(
    validateTaste(definition, { purpose: "draft", packDir: pack }).some(f => f.path === "tokens.colors.light.--p-bg"),
  );
  assert.throws(() => loadTastePack(pack), /CSS declaration boundary/);
});

test("resolveTaste is deterministic and rejects unresolved build tokens", t => {
  const { root, pack } = copySample();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const definition = loadTastePack(pack).definition;
  const first = resolveTaste(definition, { purpose: "build", packDir: pack });
  const second = resolveTaste(definition, { purpose: "build", packDir: pack });
  assert.deepEqual(first, second);
  assert.notEqual(first, definition);
  const draft = structuredClone(definition);
  draft.tokens.colors.light["--p-action"] = null;
  assert.equal(validateTaste(draft, { purpose: "guide", packDir: pack }).length, 0);
  assert.ok(
    validateTaste(draft, { purpose: "build", packDir: pack }).some(f => f.path === "tokens.colors.light.--p-action"),
  );
});

test("font sources are validated offline and custom families need a source and fallback for output", t => {
  const { root, pack } = copySample();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const definition = loadTastePack(pack).definition;
  const baseline = resolveTaste(definition, { purpose: "css", packDir: pack });
  assert.equal(baseline.fonts.roles.body.family, "Inter");
  const missing = structuredClone(definition);
  missing.fonts.roles.body.sources = [];
  missing.fonts.roles.body.fallbacks = [];
  assert.ok(validateTaste(missing, { purpose: "css", packDir: pack }).some(f => f.path === "fonts.roles.body"));
  const badSource = structuredClone(definition);
  badSource.fonts.roles.body.sources = ["http://fonts.example.test/font.woff2"];
  assert.ok(
    validateTaste(badSource, { purpose: "draft", packDir: pack }).some(f => f.path === "fonts.roles.body.sources.0"),
  );
});

test("one root custom property cannot have two authoritative definitions", () => {
  const definition = loadTastePack(SAMPLE).definition;
  definition.tokens.dimensions["--p-bg"] = "#000000";
  assert.ok(validateTaste(definition).some(f => f.path === "tokens.dimensions.--p-bg" && /duplicates/.test(f.message)));
});
