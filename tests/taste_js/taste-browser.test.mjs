import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { launch, CDP, Tab } from "../../skill/taste/scripts/consistency/cdp.mjs";
import { findChrome } from "../../skill/taste/scripts/roots.mjs";

import { serializeTasteCss } from "../../skill/taste/scripts/taste-output.mjs";

const root = path.resolve(".");
test(
  "browser: flow, centered headings, representative type and static UI at six widths",
  { timeout: 90000 },
  async t => {
    if (!findChrome()) return t.skip("Chrome unavailable");
    const html = `<!doctype html><html data-rhythm="flow" data-heading-align="center" data-fragment-playback="static"><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/skill/taste/assets/system.css">
    <style>body{margin:0;font-family:Arial} h2{font:400 30px Arial} p{font:400 18px Arial}
    .wrap{width:calc(100% - 40px);max-width:1000px;margin:auto} .quote{font:400 36px Georgia}
    .close-title{font-size:56px} .section-head--center h2{font:400 30px Arial}</style></head><body><main>
    <section><div class="wrap"><h1>Reference fixture</h1><p>Representative body text.</p></div></section>
    <section><div class="wrap"><div class="section-head--center"><h2>First section</h2></div><p>Useful body text.</p>
    <div data-ui="search" id="search"><span data-search-q>Find</span><ul data-search-list><li>Result</li></ul></div></div></section>
    <section><div class="wrap"><h2>Second section</h2><p>More ordinary body text.</p><blockquote><p class="quote">An unusually large testimonial must not become the body face.</p></blockquote></div></section>
    <section><div class="wrap"><h2 class="close-title">Exceptional close</h2></div></section>
    </main><footer><h2 style="font-size:16px">Footer heading</h2></footer></body></html>`;
    const server = http.createServer((req, res) => {
      if (req.url === "/") {
        res.setHeader("Content-Type", "text/html");
        res.end(html);
        return;
      }
      const file = path.resolve(root, "." + new URL(req.url, "http://localhost").pathname);
      if (!file.startsWith(path.join(root, "skill") + path.sep) || !fs.existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".css") ? "text/css"
        : file.endsWith(".json") ? "application/json"
        : "text/javascript",
      );
      res.end(fs.readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taste-browser-"));
    let chrome, cdp;
    try {
      chrome = await launch(dir);
      cdp = await CDP.connect(chrome.ws);
      const tab = await Tab.open(cdp, { width: 1440, height: 900 });
      await tab.goto(`http://127.0.0.1:${server.address().port}/`);
      const capture = fs.readFileSync("skill/ui/scripts/record-capture.js", "utf8");
      const layoutCheck = fs.readFileSync("skill/taste/assets/layout/layout-check.js", "utf8");
      for (const width of [1440, 1024, 820, 768, 390, 320]) {
        await tab.send("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: width < 600,
        });
        const observed = await tab.eval(
          `({height:document.querySelectorAll('main > section')[1].offsetHeight, align:getComputedStyle(document.querySelector('.section-head--center')).textAlign, overflow:document.documentElement.scrollWidth>innerWidth})`,
        );
        assert.ok(observed.height < 900, JSON.stringify({ width, ...observed }));
        assert.equal(observed.align, "center");
        assert.equal(observed.overflow, false);
        const cap = await tab.eval(capture);
        assert.equal(cap.type.find(r => r.role === "body").size, 18);
        assert.equal(cap.type.find(r => r.role === "h2").size, 30);
        await tab.eval(layoutCheck);
        const checks = await tab.eval("window.lyCheck()");
        assert.ok(!checks.findings.some(f => ["screen-short", "screen-height", "neighbour"].includes(f.rule)));
        // A page cannot use data-rhythm=flow to override a saved screen contract.
        const trusted = await tab.eval('window.lyCheck({contract:{layout:{rhythm:"screens"}}})');
        assert.ok(trusted.findings.some(f => ["screen-short", "screen-height", "neighbour"].includes(f.rule)));
        const reference = await tab.eval('window.lyCheck({contract:{layout:{rhythm:"flow"}}})');
        assert.ok(!reference.findings.some(f => ["screen-short", "screen-height", "neighbour"].includes(f.rule)));
      }
      await tab.eval(
        `(async()=>{const ui=await import('/skill/taste/assets/ui/ui.js');await ui.start(document.querySelector('#search'));})()`,
      );
      const before = await tab.eval("document.querySelector('#search').innerHTML");
      await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 120, y: 400 });
      await new Promise(resolve => setTimeout(resolve, 3200));
      assert.equal(await tab.eval("document.querySelector('#search').innerHTML"), before);
      // Exercise generated V2 values in the consuming browser, after the kit stylesheet.
      const definition = JSON.parse(fs.readFileSync("tests/fixtures/taste_v2/sample/taste.json", "utf8"));
      definition.fonts.roles.body = { family: "Arial", sources: [], fallbacks: ["sans-serif"] };
      definition.fonts.roles.heading = { family: "Georgia", sources: [], fallbacks: ["serif"] };
      definition.tokens.surfaces.primary = {
        background: "linear-gradient(rgb(20, 40, 80), rgb(80, 100, 160))",
        "box-shadow": "0px 2px 4px rgb(0 0 0 / 20%)",
      };
      definition.evidence["tokens.surfaces.primary"] = {
        sources: ["https://example.test/"],
        reason: "Known browser fixture values",
      };
      const css = serializeTasteCss(definition);
      await tab.eval(`(() => {
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(css)} + ' #generated-body{font-family:var(--font-text)} #generated-heading{font-family:var(--font-display)}';
        document.head.append(style);
        const fixture = document.createElement('div');
        fixture.innerHTML = '<p id="generated-body">Body</p><h2 id="generated-heading">Heading</h2><button class="btn--primary" id="generated-button">Action</button>';
        document.body.append(fixture);
      })()`);
      for (const width of [1440, 390]) {
        await tab.send("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: width < 600,
        });
        const rendered = await tab.eval(`({
          body:getComputedStyle(document.querySelector('#generated-body')).fontFamily,
          heading:getComputedStyle(document.querySelector('#generated-heading')).fontFamily,
          fill:getComputedStyle(document.querySelector('#generated-button')).backgroundImage,
          shadow:getComputedStyle(document.querySelector('#generated-button')).boxShadow
        })`);
        assert.match(rendered.body, /^Arial/);
        assert.match(rendered.heading, /^Georgia/);
        assert.match(rendered.fill, /linear-gradient/);
        assert.notEqual(rendered.shadow, "none");
      }
      await tab.eval("document.querySelector('main').style.width='2000px'");
      assert.equal(
        await tab.eval("document.documentElement.scrollWidth > innerWidth"),
        true,
        "flow must still expose overflow",
      );
      await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
      assert.equal(await tab.eval("matchMedia('(prefers-reduced-motion: reduce)').matches"), true);
    } finally {
      if (cdp) await cdp.send("Browser.close").catch(() => {});
      if (chrome) await chrome.close();
      server.close();
      server.closeAllConnections?.();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);
