#!/usr/bin/env node
/*
  taste-skill layout check - runs assets/layout/layout-check.js on a page in one headless Chrome (WebGL on
  the CPU), at each width, and prints every finding. Closes Chrome by its own PID.

    node <skill>/scripts/layout-check.mjs --url <url or file> --profile <own chrome dir>
         [--sizes 1440x900,1024x768,820x1180,768x1024,390x844] [--shots <dir>] [--root <dir>] [--json]

  After the layout rules it runs the finish checks (layout-check.js lyFinish: empty-band, blank-screen,
  placeholder, moment-target, moment-hidden, motion-visible, reveal-none, the repeats; --no-finish skips them)
  and lists every console error and every file that failed to load as console-error. A finding with
  sev "WARN" is listed and never counts.
  --shots writes, per size, the first screen (first-<w>.png) and every section framed as the check
  frames it (screen-<w>-<n>.png): the shot a reviewer takes of one section, to look at.
  Then, once per size, it lengthens the hero's h1 to its type's longest headline (heroes.json
  h1.maxChars, with words from the lead) and checks again: the hero must still be one screen
  (hero-maxchars) and the h1 within its lines at 1440 and 390 (hero-lines). On a page in a language that
  builds long compounds (lang de, nl, da, sv, nb, nn, no, fi) the added words start with one
  (Wochenendöffnungszeiten), which must break inside the column. --no-stress skips it.
  A file (or its folder, for index.html) is served from its folder over http on 127.0.0.1 (5770-5779),
  or from --root, a built site's folder, so its root-relative links (/style.css) resolve.
  --profile: the Chrome profile, a folder of its own in the OS temp folder or the project's .taste-skill folder, never
  outside the project; a relative one that leads out of the current folder (../prof) is replaced, with a warning, by
  .taste-skill/chrome-layout-check.
  Exit code 1 when there is a finding.
*/
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { chromeOrExit, climbRoot, servable } from "./roots.mjs";
import { readBuildPlan } from "./build-policy.mjs";
import { startHeadlessBrowser, startPreviewServer } from "./consistency/browser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const LAYOUT = path.join(here, "..", "assets", "layout");
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf("--" + k);
  return (
    i < 0 ? d
    : args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1]
    : true
  );
};
// default Chrome profile folder: --profile, else $TASTE_SKILL_TMP/chrome/<tool>-<pid>, else a fresh folder under the system temp dir
const buildPlan = readBuildPlan(opt("build-plan", null));
const checkOptions = buildPlan ? { contract: buildPlan.contract, mode: buildPlan.mode } : {};
const defaultProfile = () =>
  process.env.TASTE_SKILL_TMP ?
    path.join(process.env.TASTE_SKILL_TMP, "chrome", "layout-check-" + process.pid)
  : path.join(os.tmpdir(), "taste-skill-layout-check-" + process.pid);
const target = opt("url"),
  profileArg = (p => (p && p !== true ? p : defaultProfile()))(opt("profile")),
  shots = opt("shots"),
  rootArg = opt("root");
// a profile stays in the OS temp folder or the project: a relative --profile that leads out of this folder (or the folder
// itself) goes to .taste-skill/chrome-<name>
const inProject = (p, name) => {
  const abs = path.resolve(p),
    rel = path.relative(process.cwd(), abs);
  const out = !path.isAbsolute(p) && (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel));
  if (rel !== "" && !out) return abs;
  const to = path.join(process.cwd(), ".taste-skill", "chrome-" + name);
  console.error(
    `${name}: --profile ${p} ${out ? "leads outside the project folder" : "is the project folder itself"}; using ${to} (a profile goes in the OS temp folder or the project's .taste-skill folder)`,
  );
  return to;
};
const sizes = String(opt("sizes", "1440x900,1024x768,820x1180,768x1024,390x844"))
  .split(",")
  .map(s => s.split("x").map(Number));
if (!target || target === true || rootArg === true) {
  console.error(
    "usage: layout-check.mjs --url <url or file> [--profile <dir in the OS temp folder or .taste-skill>] [--sizes 1440x900,1024x768,820x1180,768x1024,390x844] [--shots dir] [--root dir] [--json]",
  );
  process.exit(2);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = chromeOrExit("layout-check", 2);
const src = fs.readFileSync(path.join(LAYOUT, "layout-check.js"), "utf8");
// a page file is served from its folder (or --root) over http on 127.0.0.1 (5770-5779), never opened from file://
let url = target,
  server = null;
if (!/^https?:\/\//i.test(target)) {
  let file = path.resolve(/^file:/i.test(target) ? fileURLToPath(target) : target);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    console.error(`check: no page at ${file}`);
    process.exit(2);
  }
  // serve from high enough that the page's ../ references resolve
  const ups = Math.max(
    0,
    ...[
      ...fs
        .readFileSync(file, "utf8")
        .matchAll(/(?:(?:src|href)\s*=\s*|\bfrom\s*|\bimport\s*\(?\s*|url\(\s*)["']?((?:\.\.\/)+)/g),
    ].map(m => m[1].length / 3),
  );
  let root = climbRoot(file, ups);
  if (rootArg) {
    root = path.resolve(rootArg);
    const rel = path.relative(root, file);
    if (rel.split(path.sep)[0] === ".." || path.isAbsolute(rel)) {
      console.error(`check: the page is not inside --root ${root}: ${file}`);
      process.exit(2);
    }
  }
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".glb": "model/gltf-binary",
    ".txt": "text/plain",
    ".ico": "image/x-icon",
  };
  server = await startPreviewServer({
    root,
    home: path.dirname(file),
    allowed: servable,
    portStart: 5770,
    portEnd: 5779,
    mime: MIME,
    indexForBareDirectory: false,
  }).catch(() => null);
  if (!server) {
    console.error("check: no free port in 5770-5779");
    process.exit(2);
  }
  url = `http://127.0.0.1:${server.port}/${path.relative(root, file).split(path.sep).map(encodeURIComponent).join("/")}`;
}
const { heroes } = JSON.parse(fs.readFileSync(path.join(LAYOUT, "heroes.json"), "utf8"));
// the stress: the page's own h1 markup (from its source, before layout.js split it) with words from the
// lead added to its last plain text until it holds maxChars characters; the letters moment is left off
const STRESS = String.raw`(async (maxChars) => {
  const h1 = document.querySelector('main > section h1'); if (!h1) return null;
  const doc = new DOMParser().parseFromString(await (await fetch(location.href)).text(), 'text/html');
  const src = doc.querySelector('main > section h1'); if (!src) return null;
  const words = (document.querySelector('main > section .hero__lead')?.textContent || 'what the company makes and sells every day').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 2).map(w => w.toLowerCase());
  const len = () => src.textContent.replace(/\s+/g, ' ').trim().length;
  const tw = doc.createTreeWalker(src, NodeFilter.SHOW_TEXT); let last = null;
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (n.textContent.trim() && !n.parentElement.closest('.ly-word, .ly-pic, .ly-mark')) last = n;
  if (!last || !words.length) return null;
  // one long compound first on a page whose language builds them (a German heading holds words of 20 letters and
  // more): it must break with a hyphen inside its column at 390 (system.css hyphens: auto, in the page's lang).
  // An English page never holds one, and hyphens: auto in English does not break it, so it is left out there.
  if (/^(de|nl|da|sv|nb|nn|no|fi)\b/i.test(document.documentElement.lang || '')) words.unshift('Wochenendöffnungszeiten');
  for (let i = 0; len() < maxChars && i < 80; i++) {
    const w = words[i % words.length], room = maxChars - len() - 1;
    if (room < 2) break;
    last.textContent = last.textContent.replace(/\s*$/, '') + ' ' + w.slice(0, room) + (/\s$/.test(last.textContent) ? ' ' : '');
  }
  h1.removeAttribute('data-ly-letters'); h1.classList.remove('ly-locked', 'ly-letters');
  h1.innerHTML = src.innerHTML;
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 300)));
  return { chars: len(), text: h1.textContent.replace(/\s+/g, ' ').trim() };
})`;

const profile = inProject(profileArg, "layout-check");
const [w0, h0] = sizes[0];
let browser = null;
const kill = () => browser?.kill();
const guard = setTimeout(() => {
  console.error("check: timed out");
  kill();
  process.exit(2);
}, 240000);

let failed = false;
const report = [];
try {
  browser = await startHeadlessBrowser(chrome, {
    profile,
    startupTimeoutMs: 15000,
    args: [
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-gpu",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      `--window-size=${w0},${h0}`,
    ],
  });
  const { cdp } = browser;
  const send = (method, params = {}, sessionId) => cdp.send(method, params, sessionId);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  const subs = [];
  cdp.onAny(m => subs.forEach(f => f(m)));
  const ev = async x => {
    const r = await S("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  // console-error: an uncaught error, a console.error, or a file that failed to load (a script, a module, a picture)
  const errors = [];
  const IGNORE = /favicon\.ico|apple-touch-icon/i;
  subs.push(m => {
    if (m.method === "Runtime.exceptionThrown")
      errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split("\n")[0]);
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
      errors.push(
        "console.error: "
          + (m.params.args || [])
            .map(a => a.value ?? a.description ?? "")
            .join(" ")
            .split("\n")[0],
      );
    else if (
      m.method === "Log.entryAdded"
      && m.params.entry.level === "error"
      && !IGNORE.test(m.params.entry.url || "")
    )
      errors.push(
        `${m.params.entry.text.split("\n")[0]}${m.params.entry.url ? " (" + m.params.entry.url.replace(/^https?:\/\/127\.0\.0\.1:\d+\//, "") + ")" : ""}`,
      );
  });
  await S("Page.enable");
  await S("Runtime.enable");
  await S("Log.enable");
  // the section reveals are required once the kit's motion.js reveals sections
  let reveal = false;
  try {
    reveal = /data-(m-)?reveal|\bm-reveal\b|is-revealed/.test(
      fs.readFileSync(path.join(here, "..", "assets", "motion", "motion.js"), "utf8"),
    );
  } catch {
    /* no kit beside it */
  }
  const snap = async file => {
    const { data } = await S("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(file, Buffer.from(data, "base64"));
  };
  for (const [W, H] of sizes) {
    await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 });
    const loaded = new Promise(r =>
      subs.push(m => {
        if (m.method === "Page.loadEventFired") r();
      }),
    );
    await S("Page.navigate", { url });
    await Promise.race([loaded, sleep(20000)]);
    await ev(
      `new Promise(r => { const t = performance.now(); (function w() { if (document.documentElement.dataset.ready || performance.now() - t > 5000) r(); else setTimeout(w, 50); })(); })`,
    );
    await ev("document.fonts ? document.fonts.ready.then(() => 1) : 1");
    await sleep(900);
    const res = await ev(src + `\n;window.lyCheck(${JSON.stringify(checkOptions)})`);
    res.size = `${W}x${H}`;
    res.overflowX = await ev("document.documentElement.scrollWidth > document.documentElement.clientWidth");
    if (res.overflowX) res.findings.push({ rule: "overflow-x", where: "page", detail: "the page scrolls sideways" });
    // the finish checks (layout-check.js lyFinish): they scroll, so they run before the shots and the stress
    if (!opt("no-finish")) {
      await ev(
        `new Promise(r => { const t = performance.now(); (function w() { if (document.documentElement.dataset.momentsReady || !document.querySelector('[data-moment]') || performance.now() - t > 4000) r(); else setTimeout(w, 50); })(); })`,
      );
      try {
        res.findings.push(...(await ev(`window.lyFinish(${JSON.stringify({ reveal, ...checkOptions })})`)));
      } catch (e) {
        res.findings.push({
          rule: "finish-check",
          where: "page",
          detail: `the finish checks could not run: ${e.message.split("\n")[0]}`,
          fix: "fix the page error it names",
        });
      }
      await ev("scrollTo(0, 0)");
      await sleep(300);
    }
    const errFix = e =>
      /import\.meta|import statement|export|Unexpected token/i.test(e) ?
        'a module loaded as a classic script: load it once, as <script type="module" src="assets/system.js"></script> (the starter\'s last lines), and delete the other <script> for it'
      : /Failed to load resource|404|ERR_/i.test(e) ?
        "the page names a file that does not load: fix the path, or take the reference out"
      : "fix the error in the page's own script (the kit's files load clean on the starter)";
    for (const e of errors)
      res.findings.push({ rule: "console-error", where: e.slice(0, 110), detail: "an error on load", fix: errFix(e) });
    errors.length = 0;
    report.push(res);
    if (shots && shots !== true) {
      fs.mkdirSync(shots, { recursive: true });
      await ev("scrollTo(0, 0)");
      await sleep(500);
      await snap(path.join(shots, `first-${W}.png`));
      const frames = res.sections.map(q => q.frame); // the views the check judged (layout-check.js)
      for (let k = 1; k < frames.length; k++) {
        await ev(`scrollTo(0, ${frames[k]})`);
        await sleep(700);
        await snap(path.join(shots, `screen-${W}-${k}.png`));
      }
      await ev("scrollTo(0, 0)");
    }
    if (!opt("no-stress")) {
      const id = await ev(
        `(document.querySelector('main > section')?.className.match(/hero--([a-z]+)/) || [])[1] || ''`,
      );
      const h = heroes.find(x => x.id === id);
      const taste =
        h && (buildPlan ? buildPlan.mode === "reference" : await ev(`!!document.querySelector('meta[name="taste"]')`));
      const allowedAt = h =>
        W >= 1400 ? h.h1.lines[0]
        : W <= 420 ? h.h1.lines[1]
        : null;
      if (taste) {
        // a taste pins the h1's face and size: maxChars (set for the kit's pairings) does not apply, its own h1 does
        const lines = res.hero?.h1?.lines ?? 0,
          allowed = allowedAt(h);
        if (allowed && lines > allowed)
          res.findings.push({
            rule: "hero-lines",
            where: "section.hero h1",
            detail: `the page's own h1 (its taste pins the face) takes ${lines} lines at ${W}, ${allowed} at most`,
          });
      } else if (h) {
        const st = await ev(`${STRESS}(${h.h1.maxChars})`);
        if (st) {
          const again = await ev(src + `\n;window.lyCheck(${JSON.stringify(checkOptions)})`);
          const lines = again.hero?.h1?.lines ?? 0,
            allowed = allowedAt(h);
          res.stress = { hero: id, maxChars: h.h1.maxChars, chars: st.chars, lines, height: again.hero?.height };
          for (const f of again.findings.filter(f => f.rule === "hero-fold"))
            res.findings.push({
              rule: "hero-maxchars",
              where: f.where,
              detail: `with a ${st.chars}-character h1 (heroes.json maxChars): ${f.detail}`,
            });
          if (allowed && lines > allowed)
            res.findings.push({
              rule: "hero-lines",
              where: "section.hero h1",
              detail: `the check fills the h1 to ${st.chars} characters (this hero's maxChars in heroes.json), not the page's own: it takes ${lines} lines at ${W}, ${allowed} at most`,
            });
          if (await ev("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
            res.findings.push({
              rule: "hero-maxchars",
              where: "page",
              detail: `with a ${st.chars}-character h1 the page scrolls sideways`,
            });
        }
      }
    }
    if (errors.length) {
      res.errors = [...errors];
      errors.length = 0;
    }
  }
  cdp.ws.close();
} catch (e) {
  console.error("check:", e.message);
  failed = true;
} finally {
  clearTimeout(guard);
  kill();
  server?.close();
}

if (opt("json")) console.log(JSON.stringify(report, null, 1));
else
  for (const r of report) {
    console.log(`\n${r.size}  lines x ${r.L} and ${r.R}, nav ${r.nav}px, one screen ${r.screen}px`);
    if (r.hero) {
      const h = r.hero,
        b = v => (v ? `${v.w}x${v.h} at ${v.x},${v.y}` : "-");
      console.log(
        `  hero ${h.height} tall; h1 ${h.h1 ? `${h.h1.size}px/${h.h1.leading}, ${h.h1.lines} lines, ${b(h.h1)}` : "-"}; lead ${h.lead ? `${h.lead.size}/${h.lead.lineHeight}, ${h.lead.lines} lines, ${h.lead.w} wide` : "-"}; buttons ${h.buttons ? `${h.buttons.n} x ${h.buttons.h}` : "-"}; visual ${b(h.visual)}`,
      );
    }
    if (r.stress)
      console.log(
        `  stress: ${r.stress.hero} h1 at ${r.stress.chars} of ${r.stress.maxChars} characters takes ${r.stress.lines} lines, hero ${r.stress.height} tall`,
      );
    for (const s of r.sections)
      console.log(
        `  section ${s.where.slice(0, 60).padEnd(60)} y ${String(s.top).padStart(5)}  h ${String(s.height).padStart(5)}  content ${s.content}`,
      );
    if (!r.findings.length) console.log("  no findings");
    for (const f of r.findings)
      console.log(
        `  ${(f.sev === "WARN" ? "WARN " : "") + f.rule.padEnd(16)} ${f.where.slice(0, 70)}: ${f.detail}${f.fix ? `\n  ${"".padEnd(16)} fix: ${f.fix}` : ""}`,
      );
    if (r.errors) for (const e of r.errors) console.log(`  page error: ${e}`);
  }
const n = report.reduce((a, r) => a + r.findings.filter(f => f.sev !== "WARN").length, 0);
process.exit(
  failed ? 2
  : n ? 1
  : 0,
);
