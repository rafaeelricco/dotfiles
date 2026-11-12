// the CLIs say what went wrong in the form the caller reads, and exit non-zero
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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

// fetch refuses to write its credits through a link a checkout planted, so the file it points at is left alone
for (const [label, setup] of [
  [
    "photos.mjs fetch",
    site => {
      fs.mkdirSync(path.join(site, "assets/img"), { recursive: true });
      return {
        link: path.join(site, "assets/img/credits.json"),
        args: ["photos.mjs", ["fetch", "zzz-not-an-id", "--out", site]],
        cwd: site,
      };
    },
  ],
  [
    "icons.mjs fetch",
    site => {
      fs.mkdirSync(path.join(site, "assets/icons"), { recursive: true });
      return {
        link: path.join(site, "assets/icons/icons-credits.json"),
        args: ["icons.mjs", ["fetch", "nonexistent-app", "--out", "assets/icons"]],
        cwd: site,
      };
    },
  ],
]) {
  test(`${label} refuses a symlinked credits file`, { skip: process.platform === "win32" }, () => {
    const temp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "taste-credits-link-"));
    try {
      const site = path.join(temp, "site");
      const canary = path.join(temp, "canary.txt");
      fs.writeFileSync(canary, "CANARY");
      const { link, args, cwd } = setup(site);
      fs.symlinkSync(canary, link);
      const [file, rest] = args;
      const r = spawnSync(process.execPath, [path.join(scripts, file), ...rest], {
        cwd,
        encoding: "utf8",
        env: { ...process.env, TASTE_SKILL_ICON_CACHE: path.join(temp, "cache") },
      });
      assert.notEqual(r.status, 0);
      assert.match(r.stdout + r.stderr, /symlink or junction/);
      assert.equal(fs.readFileSync(canary, "utf8"), "CANARY");
      assert.ok(fs.lstatSync(link).isSymbolicLink());
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
}

test("photos.mjs credits --write refuses a symlinked credits page", { skip: process.platform === "win32" }, () => {
  const temp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "taste-credits-page-"));
  try {
    const site = path.join(temp, "site");
    const canary = path.join(temp, "canary.txt");
    fs.mkdirSync(path.join(site, "assets/img"), { recursive: true });
    fs.writeFileSync(
      path.join(site, "assets/img/credits.json"),
      JSON.stringify({
        photos: [
          {
            file: "photo-m1-1280.jpg",
            files: ["photo-m1-1280.jpg"],
            id: "m1",
            alt: "A test photograph",
            by: "Test Author",
            licence: "CC0",
            licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
            page: "https://commons.wikimedia.org/wiki/File:Test.jpg",
            source: "Wikimedia Commons",
          },
        ],
      }),
    );
    fs.writeFileSync(path.join(site, "index.html"), '<title>Test</title><img src="assets/img/photo-m1-1280.jpg">');
    fs.writeFileSync(canary, "CANARY");
    fs.symlinkSync(canary, path.join(site, "credits.html"));
    const r = run("photos.mjs", ["credits", "--out", site, "--write"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /symlink or junction/);
    assert.equal(fs.readFileSync(canary, "utf8"), "CANARY");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
