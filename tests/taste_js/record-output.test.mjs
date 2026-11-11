import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CDP, Tab, launch } from "../../skill/taste/scripts/consistency/cdp.mjs";
import { findChrome } from "../../skill/taste/scripts/roots.mjs";

const ROOT = path.resolve(".");
const RECORD = path.join(ROOT, "skill/ui/scripts/record.mjs");

const capturePage = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0} body{font-family:Arial,sans-serif;color:#111;background:#fff}
  main{padding:32px} h2{width:fit-content;margin:0 0 24px;font-size:36px;line-height:1.2;
    background-image:linear-gradient(90deg,#19191d,#626275);background-clip:text;-webkit-background-clip:text;color:transparent}
  .panel{width:420px;height:160px;border:3px dashed #123456}
  button{display:block;margin-top:24px;height:44px;padding:0 20px;color:#fff;background:#2468cf;border:2px solid #8a2be2}
</style></head><body><main><h2>Captured gradient heading</h2><div class="panel"></div><button>Continue</button></main></body></html>`;

function serve(html) {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function run(args) {
  return spawnSync(process.execPath, [RECORD, ...args], { cwd: ROOT, encoding: "utf8" });
}

function recordFrom(capture, root) {
  const input = path.join(root, "capture.json");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(input, JSON.stringify(capture));
  const result = run(["--from", input, "--name", "sample", "--root", root]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return path.join(root, "sample");
}

function completeForCss(pack) {
  const definitionFile = path.join(pack, "taste.json");
  const definition = JSON.parse(fs.readFileSync(definitionFile, "utf8"));
  const sample = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/taste_v2/sample/taste.json"), "utf8"));
  const fillMissing = (value, fallback) => {
    if (value === null || value === undefined) return fallback;
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const out = { ...value };
    for (const [key, next] of Object.entries(fallback || {})) out[key] = fillMissing(value[key], next);
    return out;
  };
  const completed = fillMissing(definition, sample);
  for (const [role, face] of Object.entries(completed.fonts.roles)) {
    if (!definition.fonts.roles[role]?.family) {
      face.family = "system-ui";
      face.sources = [];
      face.fallbacks = [];
    }
  }
  const sampleEvidence = path.join(ROOT, "tests/fixtures/taste_v2/sample/capture/evidence/fixture.txt");
  const evidenceDir = path.join(pack, "capture/evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.copyFileSync(sampleEvidence, path.join(evidenceDir, "fixture.txt"));
  fs.writeFileSync(definitionFile, JSON.stringify(completed, null, 1) + "\n");
  return completed;
}

test("browser capture exports its card and heading surfaces", { timeout: 240_000 }, async t => {
  if (!findChrome()) return t.skip("Chrome unavailable");
  const server = await serve(capturePage);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "record-output-"));
  let chrome;
  let cdp;
  try {
    chrome = await launch(temp);
    cdp = await CDP.connect(chrome.ws);
    const tab = await Tab.open(cdp, { width: 1440, height: 900 });
    await tab.goto(`http://127.0.0.1:${server.address().port}/`);
    const captureScript = fs.readFileSync(path.join(ROOT, "skill/ui/scripts/record-capture.js"), "utf8");
    const capture = await tab.eval(captureScript);
    const card = capture.components?.card?.[0];

    const pack = recordFrom(capture, path.join(temp, "v2"));
    const definition = JSON.parse(fs.readFileSync(path.join(pack, "taste.json"), "utf8"));
    await t.test("capture keeps the measured border style", () => {
      assert.ok(card, JSON.stringify(capture.components?.card));
      assert.match(card.border, /^3px dashed #123456$/);
      assert.equal(definition.tokens.surfaces.panel?.border, "3px dashed #123456");
      assert.equal(definition.tokens.surfaces.primary?.border, "2px solid #8a2be2");
    });
    await t.test("capture reads the real h2 gradient entry", () => {
      assert.ok(capture.fills.text.some(row => row.role === "h2" && /gradient\(/.test(row.gradient.css)));
      assert.match(definition.tokens.surfaces.h2.background, /gradient\(/);
      assert.equal(definition.tokens.surfaces.h2["background-clip"], "text");
    });

    completeForCss(pack);
    const css = run(["css", "sample", "--root", path.dirname(pack)]);
    assert.equal(css.status, 0, css.stderr || css.stdout);
    await tab.goto("about:blank");
    await tab.eval(`(() => {
      document.body.innerHTML='<h2 id="generated-heading">Gradient heading</h2><div id="generated-panel" data-surface="panel"></div><button id="generated-primary" data-surface="primary">Generated</button>';
      const style=document.createElement('style'); style.textContent=${JSON.stringify(css.stdout)}; document.head.append(style);
    })()`);
    const rendered = await tab.eval(`({
      panel:getComputedStyle(document.querySelector('#generated-panel')).border,
      panelStyle:getComputedStyle(document.querySelector('#generated-panel')).borderStyle,
      primary:getComputedStyle(document.querySelector('#generated-primary')).border,
      primaryStyle:getComputedStyle(document.querySelector('#generated-primary')).borderStyle,
      heading:{image:getComputedStyle(document.querySelector('#generated-heading')).backgroundImage,clip:getComputedStyle(document.querySelector('#generated-heading')).webkitBackgroundClip,color:getComputedStyle(document.querySelector('#generated-heading')).color}
    })`);
    await t.test("generated CSS displays solid and dashed borders", () => {
      assert.equal(rendered.panelStyle, "dashed", JSON.stringify(rendered));
      assert.match(rendered.panel, /3px dashed rgb\(18, 52, 86\)/);
      assert.equal(rendered.primaryStyle, "solid", JSON.stringify(rendered));
      assert.match(rendered.primary, /2px solid rgb\(138, 43, 226\)/);
    });
    await t.test("generated CSS paints h2 text with the captured gradient", () => {
      assert.match(rendered.heading.image, /gradient\(/);
      assert.equal(rendered.heading.clip, "text");
      assert.equal(rendered.heading.color, "rgba(0, 0, 0, 0)");
    });
  } finally {
    if (cdp) await cdp.send("Browser.close").catch(() => {});
    if (chrome) await chrome.close();
    server.close();
    server.closeAllConnections?.();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("legacy width/color borders normalize while none and explicit styles survive both CSS exports", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "record-border-"));
  try {
    const cases = [
      ["3px #123456", "3px solid #123456"],
      ["none", "none"],
      ["2px dashed #654321", "2px dashed #654321"],
    ];
    for (const [index, [border, expected]] of cases.entries()) {
      const capture = {
        v: 1,
        captured: "2026-11-11",
        path: "/",
        viewport: [1440, 900],
        roles: { bg: "#ffffff", ink: "#111111" },
        components: {
          card: [{ radius: 0, pad: 16, bg: "none", border, shadow: "none" }],
        },
      };

      const v2Root = path.join(temp, `v2-${index}`);
      const v2Pack = recordFrom(capture, v2Root);
      const definition = JSON.parse(fs.readFileSync(path.join(v2Pack, "taste.json"), "utf8"));
      assert.equal(definition.tokens.surfaces.panel.border, expected);
      completeForCss(v2Pack);
      const css = run(["css", "sample", "--root", v2Root]);
      assert.equal(css.status, 0, css.stderr || css.stdout);
      assert.ok(css.stdout.includes(`border: ${expected};`), css.stdout);

      const legacyRoot = path.join(temp, `legacy-${index}`);
      fs.mkdirSync(path.join(legacyRoot, "sample"), { recursive: true });
      fs.writeFileSync(path.join(legacyRoot, "sample", "taste.json"), "{}\n");
      recordFrom(capture, legacyRoot);
      const kit = run(["kit", "sample", "--root", legacyRoot]);
      assert.equal(kit.status, 0, kit.stderr || kit.stdout);
      assert.ok(kit.stdout.includes(`--panel-border: ${expected};`), kit.stdout);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
