import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { launch, CDP, Tab } from "../../skill/taste/scripts/consistency/cdp.mjs";
import { findChrome } from "../../skill/taste/scripts/roots.mjs";

const root = path.resolve(".");

test("browser: static UI fragments initialize and stay still after restart signals", { timeout: 90000 }, async t => {
  if (!findChrome()) return t.skip("Chrome unavailable");

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{margin:12px}.fixture{display:grid;grid-template-columns:440px 440px 440px;gap:12px}
      .card{width:440px;height:390px;overflow:hidden}.ui-stat{width:420px}#option,#global,#ordinary{height:100%}</style></head><body>
      <main class="fixture">
        <section class="card" id="option-card" tabindex="0"><div id="option" data-ui-load="stat"></div></section>
        <section class="card" id="global-card" tabindex="0"><div id="global" data-ui-load="stat"></div></section>
        <section class="card" id="search-card" tabindex="0"><div id="search" data-ui-load="search"></div></section>
        <section class="card" id="ordinary-card"><div id="ordinary" data-ui-load="stat"></div></section>
        <section class="card" id="voice-card" style="--fx-bg:#121212;--fx-surface:#1b1b1b;--fx-ink:#f4f4f4;--fx-muted:#aaa;--fx-accent:#9b8cff;--fx-accent-ink:#101010">
          <div id="voice" data-ui-load="voice"></div>
        </section>
      </main></body></html>`;

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
      : file.endsWith(".html") ? "text/html"
      : "text/javascript",
    );
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taste-ui-static-"));
  let chrome, cdp;
  try {
    chrome = await launch(dir);
    cdp = await CDP.connect(chrome.ws);
    const tab = await Tab.open(cdp, { width: 1440, height: 900 });
    await tab.goto(`http://127.0.0.1:${server.address().port}/`);
    await tab.eval(`(async()=>{
        window.__staticVoiceDraws = 0;
        const glPrototypes = [window.WebGLRenderingContext?.prototype, window.WebGL2RenderingContext?.prototype].filter(Boolean);
        for (const proto of new Set(glPrototypes)) {
          const original = proto.drawArrays;
          if (!original) continue;
          proto.drawArrays = function(...args) {
            if (this.canvas?.closest('.ui-voice')) window.__staticVoiceDraws++;
            return original.apply(this, args);
          };
        }
        const ui = (await import('/skill/taste/assets/ui/ui.js')).default;
        const data = { data:[10,20,30], prev:[5,6,7], fill:true };
        const optionCtl = await ui.load(document.querySelector('#option'), 'stat', { ...data, playback:'static' });
        document.documentElement.dataset.fragmentPlayback = 'static';
        const globalCtl = await ui.load(document.querySelector('#global'), 'stat', data);
        const searchCtl = await ui.load(document.querySelector('#search'), 'search');
        const voiceCtl = await ui.load(document.querySelector('#voice'), 'voice');
        delete document.documentElement.dataset.fragmentPlayback;
        const ordinaryCtl = await ui.load(document.querySelector('#ordinary'), 'stat', data);
        window.__uiStaticFixture = { ui, optionCtl, globalCtl, searchCtl, ordinaryCtl, voiceCtl };
      })()`);
    await new Promise(resolve => setTimeout(resolve, 100)); // let the chart observers and held-picture tidy settle
    const voiceMounted = await tab.eval(`new Promise(resolve => {
        const orb = document.querySelector('#voice [data-voice-orb]'), deadline = performance.now() + 8000;
        const check = () => {
          if (orb.classList.contains('has-fx')) {
            const r = orb.querySelector('canvas').getBoundingClientRect();
            return resolve({ mounted:true, visible:r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight });
          }
          if (performance.now() >= deadline) return resolve({ mounted:false, visible:false });
          setTimeout(check, 30);
        };
        check();
      })`);
    assert.equal(voiceMounted.mounted, true, "dark voice test fixture must mount its WebGL orb");
    assert.equal(voiceMounted.visible, true, "dark voice canvas stays in the browser viewport");
    await new Promise(resolve => setTimeout(resolve, 200)); // allow the orb's first frame and static pause to settle
    const voiceDrawsBefore = await tab.eval("window.__staticVoiceDraws");
    assert.ok(voiceDrawsBefore > 0, "WebGL instrumentation observed an orb frame");

    const before = await tab.eval(`(() => {
        const root = id => document.querySelector('#' + id + ' [data-ui]');
        const option = root('option'), global = root('global'), search = root('search'), ordinary = root('ordinary');
        const stat = el => ({
          bars: el.querySelectorAll('.ui-stat__bars rect').length,
          fill: el.classList.contains('is-fill'),
          chartHeight: el.querySelector('.ui-stat__svg').getBoundingClientRect().height,
          html: el.innerHTML,
          held: el.classList.contains('is-ui-held'),
        });
        return {
          option: stat(option), global: stat(global),
          search: {
            html: search.innerHTML,
            held: search.classList.contains('is-ui-held'),
            caretAnimation: getComputedStyle(search.querySelector('.ui-search__caret')).animationName,
          },
          ordinaryHeld: ordinary.classList.contains('is-ui-held'),
          voiceHeld: root('voice').classList.contains('is-ui-held'),
        };
      })()`);

    for (const which of ["option", "global"]) {
      assert.equal(before[which].bars, 3, `${which} static fragment uses opts.data`);
      assert.equal(before[which].fill, true, `${which} static fragment applies opts.fill`);
      assert.ok(before[which].chartHeight > 150, `${which} chart fills the tall placement`);
      assert.equal(before[which].held, true, `${which} static fragment is marked held`);
    }
    assert.equal(before.search.held, true, "global static search fragment is marked held");
    assert.equal(before.search.caretAnimation, "none", "held search caret has no running CSS animation");
    assert.equal(before.ordinaryHeld, false, "an ordinary fragment still starts its loop");

    await tab.eval(`(() => {
        const f = window.__uiStaticFixture;
        for (const id of ['option', 'global', 'search', 'voice']) {
          const card = document.querySelector('#' + id + '-card');
          card.dispatchEvent(new PointerEvent('pointerenter', { pointerType:'mouse' }));
          card.dispatchEvent(new FocusEvent('focusin', { bubbles:true }));
        }
        f.optionCtl.restart(); f.optionCtl.resume();
        f.globalCtl.restart(); f.globalCtl.resume();
        f.searchCtl.restart(); f.searchCtl.resume();
        f.voiceCtl.restart(); f.voiceCtl.resume();
        f.ui.restart(document.body);
      })()`);

    const ordinaryMoved = await tab.eval(`new Promise(resolve => {
        const rect = document.querySelector('#ordinary [data-ui] .ui-stat__bars rect');
        const before = rect.getAttribute('y'), deadline = performance.now() + 1800;
        const check = () => {
          if (rect.getAttribute('y') !== before) return resolve(true);
          if (performance.now() >= deadline) return resolve(false);
          requestAnimationFrame(check);
        };
        check();
      })`);
    await new Promise(resolve => setTimeout(resolve, 3500));
    const after = await tab.eval(`(() => {
        const root = id => document.querySelector('#' + id + ' [data-ui]');
        const option = root('option'), global = root('global'), search = root('search');
        return {
          option: { html:option.innerHTML, held:option.classList.contains('is-ui-held') },
          global: { html:global.innerHTML, held:global.classList.contains('is-ui-held') },
          search: {
            html:search.innerHTML,
            held:search.classList.contains('is-ui-held'),
            caretAnimation:getComputedStyle(search.querySelector('.ui-search__caret')).animationName,
          },
          voiceHeld: root('voice').classList.contains('is-ui-held'),
          voiceDraws: window.__staticVoiceDraws,
        };
      })()`);

    assert.deepEqual(after.option, { html: before.option.html, held: true });
    assert.deepEqual(after.global, { html: before.global.html, held: true });
    assert.deepEqual(after.search, { html: before.search.html, held: true, caretAnimation: "none" });
    assert.equal(before.voiceHeld, true, "global static voice fragment is marked held");
    assert.equal(after.voiceHeld, true, "voice stays held after restart signals");
    assert.equal(after.voiceDraws, voiceDrawsBefore, "the dark voice orb stays paused after restart signals");
    assert.equal(ordinaryMoved, true, "an ordinary fragment continues to animate");
  } finally {
    if (cdp) await cdp.send("Browser.close").catch(() => {});
    if (chrome) await chrome.close();
    server.close();
    server.closeAllConnections?.();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
