// the CLIs say what went wrong in the form the caller reads, and exit non-zero
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../skill/taste/scripts");
const run = (file, args) => spawnSync(process.execPath, [path.join(scripts, file), ...args], { encoding: "utf8" });

test("photos.mjs --json prints its error as JSON", () => {
  const r = run("photos.mjs", ["pick", "--trade", "saas", "--json"]);
  assert.equal(r.status, 1);
  assert.match(JSON.parse(r.stdout).error, /no trade/);
});

test("start.mjs exits 1 on an unknown command", () => {
  const r = run("start.mjs", ["bogus"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /usage:/);
  assert.equal(r.stdout, "");
});
