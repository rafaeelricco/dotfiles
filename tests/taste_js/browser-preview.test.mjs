import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import test from "node:test";
import {
  CDP,
  pageEvalTimeout,
  startHeadlessBrowser,
  startPreviewServer,
} from "../../skill/taste/scripts/consistency/browser.mjs";

function request(url, headers = {}) {
  const parsed = new URL(url);
  const rawPath = url.slice(url.indexOf(parsed.host) + parsed.host.length) || "/";
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: parsed.hostname, port: parsed.port, path: rawPath, headers }, res => {
        const chunks = [];
        res.on("data", chunk => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on("error", reject);
  });
}

test("shared preview server preserves gzip, directory and root access policies", async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taste-preview-"));
  fs.writeFileSync(path.join(root, "index.html"), "home page payload");
  fs.writeFileSync(path.join(root, "secret.txt"), "private");
  fs.mkdirSync(path.join(root, "nested"));
  fs.writeFileSync(path.join(root, "nested", "index.html"), "nested page");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const preview = await startPreviewServer({
    root,
    allowed: (servedRoot, file) =>
      path.resolve(file).startsWith(path.resolve(servedRoot) + path.sep) && path.basename(file) !== "secret.txt",
    portStart: 0,
    portEnd: 0,
    mime: { ".html": "text/html; charset=utf-8" },
    gzipExtensions: [".html"],
    outsideStatus: 403,
    contentLength: true,
    indexForBareDirectory: false,
  });
  t.after(() => preview.close());
  const base = `http://127.0.0.1:${preview.port}`;

  const compressed = await request(`${base}/`, { "accept-encoding": "gzip" });
  assert.equal(compressed.status, 200);
  assert.equal(compressed.headers["content-encoding"], "gzip");
  assert.equal(zlib.gunzipSync(compressed.body).toString(), "home page payload");
  assert.equal(compressed.headers["content-length"], String(compressed.body.length));

  assert.equal((await request(`${base}/nested/`)).status, 200);
  assert.equal((await request(`${base}/nested`)).status, 404);
  assert.equal((await request(`${base}/secret.txt`)).status, 404);
  assert.equal((await request(`${base}/..%2foutside.txt`)).status, 403);
});

test("shared Chrome launcher reports a spawn error without waiting for the startup timeout", async t => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "taste-browser-launch-"));
  t.after(() => fs.rmSync(profile, { recursive: true, force: true }));
  await assert.rejects(
    startHeadlessBrowser(path.join(profile, "missing-browser.exe"), { profile, startupTimeoutMs: 10000 }),
    /Chrome failed to launch/,
  );
});

test("shared CDP dispatches method and all-event listeners", async t => {
  const OriginalWebSocket = globalThis.WebSocket;
  t.after(() => {
    globalThis.WebSocket = OriginalWebSocket;
  });
  globalThis.WebSocket = class {
    constructor() {
      queueMicrotask(() => this.onopen?.());
    }
    send(raw) {
      const { id } = JSON.parse(raw);
      queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({ id, result: { ok: true } }) }));
    }
    close() {
      this.onclose?.();
    }
  };
  const cdp = await CDP.connect("ws://mock");
  const events = [];
  const offMethod = cdp.on("tab-1", "Page.loadEventFired", params => events.push(params.frameId));
  const offAny = cdp.onAny(message => events.push(message.method));
  const result = await cdp.send("Browser.getVersion");
  cdp.ws.onmessage({
    data: JSON.stringify({ method: "Page.loadEventFired", sessionId: "tab-1", params: { frameId: "main" } }),
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(events, ["main", "Page.loadEventFired"]);
  offMethod();
  offAny();
  cdp.ws.close();
});

test("page evaluation timeout extends past a requested screenshot wait", () => {
  assert.equal(pageEvalTimeout(450), 30_000);
  assert.equal(pageEvalTimeout(31_000), 41_000);
});
