// the kit's data files keep the shapes the dealers and checkers read (skill/taste/schemas)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const taste = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../skill/taste");
const read = f => JSON.parse(fs.readFileSync(path.join(taste, f), "utf8"));
const typeOf = v =>
  Array.isArray(v) ? "array"
  : v === null ? "null"
  : typeof v;
// the subset of JSON Schema the schemas use: type (one or a list), required, properties, items, additionalProperties
function check(s, v, at, errs) {
  const types = [s.type].flat().filter(Boolean);
  if (types.length && !types.includes(typeOf(v))) return void errs.push(`${at}: ${typeOf(v)}, not ${types.join("|")}`);
  if (typeOf(v) === "object") {
    for (const k of s.required || []) if (!(k in v)) errs.push(`${at}: no ${k}`);
    for (const [k, x] of Object.entries(v)) {
      const sub =
        (s.properties || {})[k] || (typeof s.additionalProperties === "object" ? s.additionalProperties : null);
      if (sub) check(sub, x, `${at}.${k}`, errs);
    }
  }
  if (typeOf(v) === "array" && s.items) v.forEach((x, i) => check(s.items, x, `${at}[${i}]`, errs));
}
const valid = (schema, file) => {
  const errs = [];
  check(read(`schemas/${schema}.schema.json`), read(file), file, errs);
  assert.deepEqual(errs, []);
};

for (const [schema, fam] of [
  ["effect-meta", "effects"],
  ["scene-meta", "scenes"],
  ["moment-meta", "moments"],
  ["component-meta", "components"],
  ["ui-meta", "ui"],
])
  test(`assets/${fam}/*/meta.json`, () => {
    const dirs = fs.readdirSync(path.join(taste, "assets", fam));
    const files = dirs.map(d => `assets/${fam}/${d}/meta.json`).filter(f => fs.existsSync(path.join(taste, f)));
    assert.ok(files.length > 0);
    for (const f of files) valid(schema, f);
  });

for (const fam of ["effects", "scenes", "moments", "ui", "backgrounds", "icons"])
  test(`assets/${fam}/index.json`, () => valid(`${fam}-index`, `assets/${fam}/index.json`));
test("assets/layout/heroes.json", () => valid("heroes", "assets/layout/heroes.json"));
test("assets/core.json", () => valid("core", "assets/core.json"));
