import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const scripts = path.resolve("skill/taste/scripts");
const run = (script, args, cwd, input) =>
  spawnSync(process.execPath, [path.join(scripts, script), ...args], {
    cwd,
    input,
    encoding: "utf8",
    timeout: 20000,
  });

test("dispatcher preserves direct command output and exit status", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "taste-cli-"));
  try {
    for (const [sub, script, prefix, args] of [
      ["plan", "start.mjs", ["plan"], ["--page", "invalid"]],
      ["build", "kit-copy.mjs", [], []],
      ["check", "gate.mjs", [], []],
      ["pack", "pack.mjs", [], ["invalid"]],
    ]) {
      const direct = run(script, [...prefix, ...args], cwd);
      const via = run("taste.mjs", [sub, ...args], cwd);
      assert.equal(via.status, direct.status, sub);
      assert.equal(via.stdout, direct.stdout, sub);
      assert.equal(via.stderr, direct.stderr, sub);
    }
    const direct = run("gate.mjs", ["--hook", "claude"], cwd, JSON.stringify({ cwd }));
    const via = run("taste.mjs", ["check", "--hook", "claude"], cwd, JSON.stringify({ cwd }));
    assert.equal(via.status, direct.status);
    assert.equal(via.stdout, direct.stdout);
    assert.equal(via.stderr, direct.stderr);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

for (const kind of ["file", "directory"])
  test(`gate refuses symlinked state ${kind}`, t => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "taste-state-"));
    try {
      const project = path.join(base, kind);
      const outside = path.join(base, `outside-${kind}`);
      fs.mkdirSync(project);
      fs.mkdirSync(outside);
      const canary = path.join(outside, "build.json");
      fs.writeFileSync(canary, "canary");
      try {
        if (kind === "directory") fs.symlinkSync(outside, path.join(project, ".taste-skill"), "junction");
        else {
          fs.mkdirSync(path.join(project, ".taste-skill"));
          fs.symlinkSync(canary, path.join(project, ".taste-skill", "build.json"), "file");
        }
      } catch (error) {
        if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) return t.skip(`links unavailable: ${error.code}`);
        throw error;
      }
      const result = run("gate.mjs", ["--start", "index.html"], project);
      assert.notEqual(result.status, 0, kind);
      assert.equal(fs.readFileSync(canary, "utf8"), "canary", kind);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
