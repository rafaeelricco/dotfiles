// consistency/cdp.mjs — our own Chrome: launch, the CDP driver and its tabs, the page init scripts (moved from consistency.mjs)
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromeOrExit } from "../roots.mjs";
import { sleep } from "./cli.mjs";

// profile: the folder the run's own Chrome profile is made in (--profile)
export async function launch(PROFILE) {
  if (typeof WebSocket === "undefined")
    throw new Error("Node 22+ is required (no built-in WebSocket in " + process.version + ")");
  const exe = chromeOrExit("consistency", 2);
  const dir = join(PROFILE, `run-${process.pid}-${Date.now().toString(36)}`);
  mkdirSync(dir, { recursive: true });
  const proc = spawn(
    exe,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${dir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--mute-audio",
      "--hide-scrollbars",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-features=Translate,MediaRouter",
      "--force-color-profile=srgb",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-gpu",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disk-cache-size=16777216",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const pid = proc.pid;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (pid && proc.exitCode === null) {
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      else {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
    }
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {}
  };
  // the normal end: let Chrome exit after Browser.close (killed by its PID if it does not), then remove its profile
  // folder, trying for up to 10s while its helper processes let go of their files
  const close = async () => {
    if (stopped) return;
    if (pid && proc.exitCode === null) await Promise.race([new Promise(r => proc.once("exit", r)), sleep(5000)]);
    if (pid && proc.exitCode === null) {
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      else {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
    }
    stopped = true;
    for (let i = 0; i < 40 && existsSync(dir); i++) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {}
      if (existsSync(dir)) await sleep(250);
    }
  };
  process.once("exit", stop);
  for (const s of ["SIGINT", "SIGTERM", "SIGHUP"])
    process.once(s, () => {
      stop();
      process.exit(130);
    });
  const ws = await new Promise((res, rej) => {
    let buf = "";
    // a busy machine (several builders, WebGL on the CPU) can take long to start Chrome: wait 60s
    const t = setTimeout(() => rej(new Error("Chrome did not start within 60s")), 60000);
    proc.stderr.on("data", d => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(t);
        res(m[1]);
      }
    });
    proc.once("exit", c => {
      clearTimeout(t);
      rej(new Error("Chrome exited early (" + c + ")"));
    });
  }).catch(e => {
    stop();
    throw e;
  });
  return { ws, pid, stop, close };
}

export class CDP {
  static async connect(wsUrl) {
    const c = new CDP();
    c.n = 1;
    c.pending = new Map();
    c.listeners = new Map();
    c.ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      c.ws.onopen = res;
      c.ws.onerror = () => rej(new Error("CDP socket failed"));
    });
    c.ws.onclose = () => {
      c.closed = true;
      for (const p of c.pending.values()) {
        clearTimeout(p.t);
        p.rej(new Error("CDP socket closed"));
      }
      c.pending.clear();
    };
    c.ws.onmessage = ev => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
      if (msg.id && c.pending.has(msg.id)) {
        const p = c.pending.get(msg.id);
        c.pending.delete(msg.id);
        clearTimeout(p.t);
        if (msg.error) p.rej(new Error(msg.error.message));
        else p.res(msg.result);
      } else if (msg.method) {
        const fns = c.listeners.get((msg.sessionId || "") + "|" + msg.method);
        if (fns) for (const fn of [...fns]) fn(msg.params);
      }
    };
    return c;
  }
  send(method, params = {}, sessionId, ms = 30000) {
    if (this.closed) return Promise.reject(new Error("CDP socket closed"));
    const id = this.n++;
    return new Promise((res, rej) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error("CDP timeout: " + method));
      }, ms);
      this.pending.set(id, { res, rej, t });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }
  on(sid, method, fn) {
    const k = (sid || "") + "|" + method;
    if (!this.listeners.has(k)) this.listeners.set(k, new Set());
    this.listeners.get(k).add(fn);
    return () => this.listeners.get(k).delete(fn);
  }
}
// ---------------------------------------------------------------- the WebGL guard (in every page before its scripts)
// Counts the page's live WebGL contexts (not lost; on the page, or never put on it) and keeps them at GL_CAP: a new
// one past the cap first frees the oldest whose canvas is far off screen (WEBGL_lose_context, as the browser's own limit
// would), else it is refused (getContext returns null and the effect shows its fallback). The page's own peak, what it
// asked for, is what the webgl check reports.
export const GL_CAP = 4;
export const GL_GUARD = `(() => {
  if (window.__ccgl) return;
  const CAP = ${GL_CAP};
  const S = window.__ccgl = { cap: CAP, list: [], peak: 0, peakAt: [], asked: 0, refused: 0, evicted: 0, prodAsked: 0, prodRefused: 0 };
  // a context asked for by a product's own render (a [data-product] frame, its canvas often off the page by the time the
  // checker looks: freed after a still) is the picture of the product, never an effect: known by its host at the time of
  // the ask, or by the render kit's own files in the call stack
  const isProd = (c) => {
    try { if (c && c.closest && c.closest('[data-product]')) return true; } catch (e) {}
    try { return /\\/objects\\/product-render\\//.test(String(new Error().stack || '')); } catch (e) { return false; }
  };
  // a render kit may ask for a context before it puts the canvas in its frame: a canvas off the page at the ask is judged
  // again once the asking code has run, and counts as the product's own when it then sits in a [data-product] frame
  const late = (c, rec, refused) => {
    try { if (!c || c.isConnected || !c.closest) return; } catch (e) { return; }
    queueMicrotask(() => { try { if (c.closest('[data-product]')) { if (rec) rec.prod = true; S.prodAsked++; if (refused) S.prodRefused++; } } catch (e) {} });
  };
  const isGL =(t) => /^(webgl2?|experimental-webgl)$/i.test(String(t));
  const name = (c) => {
    try {
      const h = c.closest && (c.closest('[data-fx]') || c.closest('[data-fx-mounted]'));
      if (h) return '[data-fx="' + (h.getAttribute('data-fx') || '') + '"]';
      const p = c.parentElement || c;
      return (p.tagName || 'canvas').toLowerCase() + (p.id ? '#' + p.id : (typeof p.className === 'string' && p.className.trim() ? '.' + p.className.trim().split(/\\s+/)[0] : ''));
    } catch (e) { return 'canvas'; }
  };
  const live = () => {
    const out = [];
    for (const x of S.list) {
      const c = x.c.deref(), g = x.g.deref();
      if (!c || !g) continue;
      try { if (g.isContextLost()) continue; } catch (e) { continue; }
      if (c.isConnected) x.ever = true; else if (x.ever) continue; // taken off the page: the page has let it go
      out.push(Object.assign(x, { el: c }));
    }
    S.list = S.list.filter((x) => x.c.deref() && x.g.deref());
    return out;
  };
  const far = (x) => {
    const c = x.el; if (!c.isConnected || !c.getBoundingClientRect) return false;
    const r = c.getBoundingClientRect(), vh = innerHeight;
    return (r.width < 1 && r.height < 1) || r.bottom < -0.6 * vh || r.top > 1.6 * vh;
  };
  S.now = () => live().map((x) => { const c = x.el, r = c.getBoundingClientRect ? c.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 }; return { name: name(c), px: (c.width || 0) * (c.height || 0), rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }, on: !!c.isConnected }; });
  const wrap = (proto) => {
    if (!proto || !proto.getContext) return;
    const orig = proto.getContext;
    proto.getContext = function (type) {
      if (!isGL(type) || S.list.some((x) => x.c.deref() === this)) return orig.apply(this, arguments);
      const L = live(); S.asked++;
      const prod = isProd(this); if (prod) S.prodAsked++;
      if (L.length + 1 > S.peak) { S.peak = L.length + 1; S.peakAt = [...L.map((x) => name(x.el)), name(this)]; }
      if (L.length >= CAP) {
        const v = L.filter(far).sort((a, b) => a.born - b.born)[0];
        if (!v) { S.refused++; if (prod) S.prodRefused++; else late(this, null, true); try { S.refusedEls.add(this); } catch (e) {} return null; }
        try { const e = v.g.deref().getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } catch (e) {}
        S.evicted++;
      }
      const g = orig.apply(this, arguments);
      const rec = g ? { c: new WeakRef(this), g: new WeakRef(g), born: performance.now(), ever: !!this.isConnected, prod } : null;
      if (rec) S.list.push(rec);
      if (!prod) late(this, rec, !g);
      return g;
    };
  };
  wrap(window.HTMLCanvasElement && HTMLCanvasElement.prototype);
  wrap(window.OffscreenCanvas && OffscreenCanvas.prototype);
  // every shader source the page compiles (for the reserved-word lint) and every compile or link that fails; with
  // window.__ccglFail set (the gl-fallback pass) every shader is replaced by one that cannot compile, as a GPU that
  // rejects it would leave it, to see what the page shows then
  S.shaders = []; S.fails = []; S.refusedEls = new WeakSet();
  const hook = (P) => {
    if (!P || P.__cchook) return; P.__cchook = true;
    const ss = P.shaderSource, cs = P.compileShader, lp = P.linkProgram;
    P.shaderSource = function (sh, src) {
      try { const s = String(src); if (S.shaders.length < 80 && !S.shaders.some((x) => x.src === s)) S.shaders.push({ src: s.slice(0, 60000), host: name(this.canvas || {}) }); } catch (e) {}
      if (window.__ccglFail) return ss.call(this, sh, 'checker: a shader this GPU rejects;');
      return ss.apply(this, arguments);
    };
    P.compileShader = function (sh) {
      const r = cs.apply(this, arguments);
      try { if (S.fails.length < 30 && !this.getShaderParameter(sh, this.COMPILE_STATUS)) S.fails.push({ kind: 'compile', log: String(this.getShaderInfoLog(sh) || '').slice(0, 240), host: name(this.canvas || {}) }); } catch (e) {}
      return r;
    };
    P.linkProgram = function (p) {
      const r = lp.apply(this, arguments);
      try { if (S.fails.length < 30 && !this.getProgramParameter(p, this.LINK_STATUS)) S.fails.push({ kind: 'link', log: String(this.getProgramInfoLog(p) || '').slice(0, 240), host: name(this.canvas || {}) }); } catch (e) {}
      return r;
    };
  };
  hook(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  hook(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
})();`;

// what starts to animate the moment an IntersectionObserver sees it come on screen (a halo that breathes twice, a picture
// whose lines draw in, a card that fades up): finite CSS animations and transitions begun in or under the observed box
// right after its callback. Read by the scroll-reveal check (scroll motion the style snapshots cannot see)
export const IO_HOOK = `(() => {
  if (window.__ccio || !window.IntersectionObserver) return;
  const S = window.__ccio = { list: [] };
  const O = window.IntersectionObserver;
  const W = function (cb, opts) {
    const wrapped = function (entries) {
      const r = cb.apply(this, arguments);
      try {
        const hits = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        if (hits.length && scrollY > 0) setTimeout(() => {
          try {
            for (const a of document.getAnimations()) {
              const t = a.effect && a.effect.target; if (!(t instanceof Element)) continue;
              const host = hits.find((h) => h === t || h.contains(t)); if (!host) continue;
              const tm = a.effect.getComputedTiming(); if (tm.iterations === Infinity || !(tm.duration > 0)) continue;
              if ((a.currentTime || 0) > 500) continue;
              S.list.push({ host, target: t, name: a.animationName || a.transitionProperty || 'an animation', dur: tm.duration, it: tm.iterations, y: scrollY });
            }
          } catch (e) {}
        }, 90);
      } catch (e) {}
      return r;
    };
    return new O(wrapped, opts);
  };
  W.prototype = O.prototype;
  window.IntersectionObserver = W;
})();`;

export class Tab {
  static async open(cdp, { width, height, mobile = false, net = false }) {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", newWindow: true });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const t = new Tab();
    t.cdp = cdp;
    t.targetId = targetId;
    t.sid = sessionId;
    t.vw = width;
    t.vh = height;
    cdp.on(sessionId, "Page.javascriptDialogOpening", () =>
      t.send("Page.handleJavaScriptDialog", { accept: false }).catch(() => {}),
    );
    await t.send("Page.enable");
    await t.send("Runtime.enable");
    await t.send("Page.addScriptToEvaluateOnNewDocument", { source: GL_GUARD }).catch(() => {});
    await t.send("Page.addScriptToEvaluateOnNewDocument", { source: IO_HOOK }).catch(() => {});
    // what the page asked for and did not get (a stylesheet, script, image, video or font)
    t.failed = [];
    if (net) {
      const reqs = new Map();
      cdp.on(sessionId, "Network.requestWillBeSent", p => reqs.set(p.requestId, { url: p.request.url, type: p.type }));
      cdp.on(sessionId, "Network.responseReceived", p => {
        if (p.response.status >= 400)
          t.failed.push({
            url: p.response.url,
            type: p.type || reqs.get(p.requestId)?.type,
            why: String(p.response.status),
          });
      });
      cdp.on(sessionId, "Network.loadingFailed", p => {
        if (p.canceled || /ERR_ABORTED|ERR_BLOCKED_BY_CLIENT/.test(p.errorText || "")) return;
        const q = reqs.get(p.requestId);
        if (q)
          t.failed.push({ url: q.url, type: p.type || q.type, why: (p.errorText || "failed").replace(/^net::/, "") });
      });
      await t.send("Network.enable").catch(() => {});
    }
    await t.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    await t.send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
    await t.send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
    return t;
  }
  send(m, p = {}, ms) {
    return this.cdp.send(m, p, this.sid, ms);
  }
  async goto(u, ms = 30000) {
    let off;
    const loaded = new Promise(r => {
      off = this.cdp.on(this.sid, "Page.loadEventFired", () => r());
    });
    const nav = await this.send("Page.navigate", { url: u }, ms).catch(e => ({ errorText: e.message }));
    if (nav.errorText && !/ERR_ABORTED/.test(nav.errorText)) {
      off();
      throw new Error("navigate: " + nav.errorText);
    }
    await Promise.race([loaded, sleep(ms)]);
    off();
  }
  async eval(expr, ms = 60000) {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, ms);
    if (r.exceptionDetails)
      throw new Error(
        "page: " + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 500),
      );
    return r.result?.value;
  }
  async shot(q = 85) {
    const { data } = await this.send("Page.captureScreenshot", { format: "jpeg", quality: q }, 45000);
    return data;
  }
  async close() {
    try {
      await this.cdp.send("Target.closeTarget", { targetId: this.targetId }, undefined, 5000);
    } catch {}
  }
}
