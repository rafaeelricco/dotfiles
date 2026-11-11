// record.mjs on a local page: the capture keeps gradients (fills) and picture grounds with sampled colours
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findChrome } from "../../skill/taste/scripts/roots.mjs";

const ROOT = path.resolve(".");
const SITE = path.join(ROOT, "tests/fixtures/taste_capture");
const TYPES = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml" };

// the fixture folder on 127.0.0.1:<free port>: same origin as the page, so the SVG can be sampled
const serve = () =>
  new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const name = new URL(req.url, "http://127.0.0.1").pathname.replace(/^\/+/, "") || "index.html";
      const file = path.join(SITE, path.basename(name));
      if (!fs.existsSync(file)) return res.writeHead(404).end();
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

// async spawn, so the server above keeps answering while record.mjs loads the page
const record = (url, root, limit) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["skill/ui/scripts/record.mjs", url, "--name", "fixture", "--root", root], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", d => (out += d));
    child.stderr.on("data", d => (out += d));
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`record.mjs ran past ${limit / 1000} s\n${out}`));
    }, limit);
    child.on("error", e => (clearTimeout(timer), reject(e)));
    child.on("close", code => (clearTimeout(timer), resolve({ code, out })));
  });

test("the capture keeps the page's gradients and its picture ground", { timeout: 240_000 }, async t => {
  if (!findChrome()) return t.skip("no browser to drive");
  const server = await serve();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taste-fills-"));
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const run = await record(url, tmp, 200_000);
    assert.equal(run.code, 0, run.out);
    const dir = path.join(tmp, "fixture", "capture");
    let file = path.join(dir, "home.json");
    if (!fs.existsSync(file)) {
      const pages = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "candidates.json");
      assert.ok(pages.length, `no page JSON in ${dir}`);
      file = path.join(dir, pages[0]);
    }
    const cap = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.deepEqual(
      cap.fills.primary.stops.filter(s => /^#[0-9a-f]{6}$/.test(s)),
      ["#1e82e0", "#1c38ea"],
    );
    assert.ok(cap.fills.panels.some(p => p.radius === 20 && p.gradient.stops.join() === "#dde2ee,#bbc5dd"));
    assert.deepEqual(cap.fills.text.find(x => x.role === "h2").gradient.stops, ["#19191d", "#626275"]);
    assert.ok(cap.fills.surface?.stops.includes("#dde2ee"));
    const g = cap.grounds[0];
    assert.equal(g.kind, "image");
    assert.match(g.overlay, /radial-gradient.*url\(\)/);
    const [r, , b] = [1, 3, 5].map(i => parseInt(g.colors.top.slice(i, i + 2), 16)); // blue sky on top
    assert.ok(b > r, g.colors.top);
    const [r2, , b2] = [1, 3, 5].map(i => parseInt(g.colors.bottom.slice(i, i + 2), 16)); // peach below
    assert.ok(r2 > b2, g.colors.bottom);
    // the two copies of one picture on one box are a single ground
    assert.equal(cap.grounds.filter(x => x.overlay === "none").length, 1, JSON.stringify(cap.grounds));
  } finally {
    server.close();
    server.closeAllConnections?.();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
