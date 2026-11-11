// what a preview server may send: never a dot-named file, even when a page's ../ climbs the root to its project
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { climbRoot, servable } from "../../skill/taste/scripts/roots.mjs";

const project = () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), "taste-serve-"));
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(p, rel)), { recursive: true });
    fs.writeFileSync(path.join(p, rel), text);
  };
  put("package.json", "{}");
  put(".env", "SECRET=x");
  put(".git/config", "[core]");
  put(".well-known/security.txt", "Contact: x");
  put("unused.png", "");
  put("dist/index.html", '<img src="../unused.png">');
  put(".output/public/a.css", "b{}");
  return p;
};

test("a page that climbs to its project is not served the project's dotfiles", () => {
  const p = project();
  const root = climbRoot(path.join(p, "dist/index.html"), 1);
  assert.equal(root, p);
  assert.equal(servable(root, path.join(p, ".env")), false);
  assert.equal(servable(root, path.join(p, ".git/config")), false);
  assert.equal(servable(root, path.join(p, "unused.png")), true);
  assert.equal(servable(root, path.join(p, "dist/index.html")), true);
  assert.equal(servable(root, path.join(p, ".well-known/security.txt")), true);
});

test("a root that is itself a dot folder still serves its files", () => {
  const p = project();
  assert.equal(servable(path.join(p, ".output/public"), path.join(p, ".output/public/a.css")), true);
});

test("a page in a dot folder under the root still loads, and the root's dotfiles stay out", () => {
  const p = project();
  fs.writeFileSync(path.join(p, ".output/public/index.html"), "<p>hi</p>");
  const home = path.join(p, ".output/public");
  assert.equal(servable(p, path.join(home, "index.html"), home), true);
  assert.equal(servable(p, path.join(home, "a.css"), home), true);
  assert.equal(servable(p, path.join(p, ".env"), home), false);
  assert.equal(servable(p, path.join(p, ".git/config"), home), false);
});

test("a link to a dotfile is not served", t => {
  const p = project();
  try {
    fs.symlinkSync(path.join(p, ".env"), path.join(p, "cfg.txt"), "file");
    fs.symlinkSync(path.join(p, ".git"), path.join(p, "g"), "junction");
  } catch (e) {
    return t.skip(`links unavailable: ${e.code}`);
  }
  assert.equal(servable(p, path.join(p, "cfg.txt")), false);
  assert.equal(servable(p, path.join(p, "g/config")), false);
});

test("a short 8.3 name for a dotfile is not served", t => {
  const p = project();
  if (process.platform !== "win32" || !fs.existsSync(path.join(p, "ENV~1"))) return t.skip("no 8.3 names on this volume");
  assert.equal(servable(p, path.join(p, "ENV~1")), false);
  assert.equal(servable(p, path.join(p, "GIT~1/config")), false);
});
