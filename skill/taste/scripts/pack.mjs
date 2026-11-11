#!/usr/bin/env node
/*
  taste-skill pack.mjs - is a taste pack whole? (references/extract.md)
  Node 22, no packages. A pack is <ui skill>/tastes/<name>/: taste.json, capture/candidates.json, and its own
  items under assets/<family>/<id>/ (families: moments, scenes, effects, ui, components).

    node <skill>/scripts/pack.mjs check <name> [--render] [--json]   last line PACK: PASS or PACK: FAIL <n>; exit 0 or 1
    node <skill>/scripts/pack.mjs list                               every pack: own items, unsettled candidates

  One line per finding, FAIL <check> <where>: <message>. A WARN <check> <message> line is a note: it does not change
  PASS or FAIL or the exit code. --json prints {name, findings, warnings, status} and nothing else.
  Own items are written as if they sat in the kit, so each is staged (roots.mjs stageItem) to be loaded or shot.
  --render shoots every own item's demo.html with shoot.mjs (the picture lands in <pack>/shots/items/).
  Checks: pack-manifest, pack-unsettled, pack-ref, pack-variant, pack-item, pack-spec, pack-collide, pack-hotlink,
  pack-size, pack-lint, pack-render. The house pack is checked like any other, without pack-spec, pack-size and
  pack-collide (its items are the kit's own, moved).
  Exit 0 whole, 1 a finding, 2 usage or an unknown pack.
*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { HOUSE, SKILL, itemDir, stageItem, tasteName, tastesDir } from "./roots.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(SKILL, "assets");
const FAMILIES = ["moments", "scenes", "effects", "ui", "components"];
const BUDGET = { moments: 60e3, effects: 60e3, ui: 60e3, components: 80e3, scenes: 160e3 }; // bytes of code per item
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
// the families a signature may name, and how many items of each
const SIGNATURE = { moments: 3, scenes: 1, effects: 1, ui: Infinity };
const REF = /^([a-z]+)\/([a-z0-9][a-z0-9-]*)$/;
const SETTLED = /^(fits|variant|own):([a-z]+)\/([a-z0-9][a-z0-9-]*)$/;
const RENDER_LIMIT = 120e3; // ms for one shoot.mjs run
const LINT_CAP = 5; // lint findings kept per item

const die = m => {
  console.error("pack: " + m);
  process.exit(2);
};

// ---------------------------------------------------------------- small readers
const isDir = p => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const isFile = p => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};
const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));
const isObj = v => v != null && typeof v === "object" && !Array.isArray(v);
const strs = v => (Array.isArray(v) ? v.filter(s => typeof s === "string") : []);
const obj = v => (isObj(v) ? v : {});
const dirsOf = d => {
  try {
    return fs
      .readdirSync(d, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort();
  } catch {
    return [];
  }
};
// every file under dir (relative paths, "/" separators), minus a top-level folder named in `skip`
function walk(dir, skip = [], rel = "") {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) {
      if (!rel && skip.includes(e.name)) continue;
      out.push(...walk(dir, skip, r));
    } else if (e.isFile()) out.push(r);
  }
  return out;
}
// the own items of a pack: [{ family, id, dir }]; folders starting with _ and the shared scenes/classic are not items
function ownItems(pack) {
  const out = [];
  for (const family of FAMILIES)
    for (const id of dirsOf(path.join(pack, "assets", family)))
      if (!id.startsWith("_") && !(family === "scenes" && id === "classic"))
        out.push({ family, id, dir: path.join(pack, "assets", family, id) });
  return out;
}

// ---------------------------------------------------------------- lazy sibling modules
// moments.mjs and effects.mjs load only for the check that needs them; a failed import is one finding, not a crash
const loaded = new Map();
async function lazy(file) {
  if (!loaded.has(file))
    loaded.set(
      file,
      (file === "moments.mjs" ? import("./moments.mjs") : import("./effects.mjs")).then(
        mod => ({ mod }),
        e => ({ error: String(e?.message || e).split("\n")[0] }),
      ),
    );
  return loaded.get(file);
}
const scans = new Map(); // item dir → { effects, problems } | { error }
// an own effect, loaded from a stage where its ../fx.js is the kit's; only that effect's entries come back
async function scanItem(dir) {
  if (scans.has(dir)) return scans.get(dir);
  const m = await lazy("effects.mjs");
  let r;
  if (m.error) r = { error: `effects.mjs did not load: ${m.error}` };
  else if (typeof m.mod.scanEffects !== "function") r = { error: "effects.mjs has no scanEffects" };
  else {
    const id = path.basename(dir),
      st = stageItem(dir);
    try {
      const all = await m.mod.scanEffects(path.dirname(st.dir));
      r = {
        effects: all.effects.filter(e => e.id === id),
        problems: all.problems.filter(p => p.startsWith(id + ": ")),
      };
    } catch (e) {
      r = { error: `scanEffects failed: ${String(e?.message || e).split("\n")[0]}` };
    } finally {
      st.done();
    }
  }
  scans.set(dir, r);
  return r;
}

// ---------------------------------------------------------------- the pack's manifest
// → { taste, findings }; taste is null when taste.json cannot be read at all
function readManifest(pack, name) {
  const F = (msg, where = "taste.json") => ({ check: "pack-manifest", where, msg });
  const file = path.join(pack, "taste.json");
  if (!isFile(file)) return { taste: null, findings: [F("missing")] };
  let t;
  try {
    t = readJson(file);
  } catch (e) {
    return { taste: null, findings: [F(`unreadable: ${e.message}`)] };
  }
  if (!isObj(t)) return { taste: null, findings: [F("must be a JSON object")] };
  const f = [];
  const need = (k, ok, shape) => {
    if (!(k in t)) f.push(F(`"${k}" is missing (${shape})`));
    else if (!ok) f.push(F(`"${k}" must be ${shape}`));
  };
  const allStr = v => Array.isArray(v) && v.every(s => typeof s === "string");
  need("name", t.name === name, `the folder name "${name}"`);
  need("source", allStr(t.source), "an array of strings");
  need("use_when", allStr(t.use_when), "an array of strings");
  need("fits", isObj(t.fits) && Object.values(t.fits).every(allStr), "an object of arrays of ids");
  if (isObj(t.fits))
    for (const k of Object.keys(t.fits))
      if (!FAMILIES.includes(k)) f.push(F(`"fits.${k}" is not a family (${FAMILIES.join(", ")})`));
  need("variants", isObj(t.variants), "an object");
  if (isObj(t.variants)) {
    const { effects, motion } = t.variants;
    if (effects !== undefined && !(isObj(effects) && Object.values(effects).every(isObj)))
      f.push(F('"variants.effects" must be an object of objects'));
    if (motion !== undefined && !(isObj(motion) && Object.values(motion).every(v => typeof v === "string")))
      f.push(F('"variants.motion" must be an object of strings'));
  }
  need("signature", allStr(t.signature), 'an array of "<family>/<id>" strings');
  if (allStr(t.signature)) {
    const count = {};
    for (const s of t.signature) {
      const family = s.split("/")[0];
      if (!REF.test(s) || !Object.hasOwn(SIGNATURE, family))
        f.push(F(`"signature" entry "${s}" must be <family>/<id> (${Object.keys(SIGNATURE).join(", ")})`));
      else count[family] = (count[family] || 0) + 1;
    }
    for (const [family, most] of Object.entries(SIGNATURE))
      if (count[family] > most) f.push(F(`"signature" lists ${count[family]} ${family}: at most ${most}`));
  }
  need("settled", isObj(t.settled) && allStr(Object.values(t.settled)), "an object of strings");
  return { taste: t, findings: f };
}

// capture/candidates.json → { ids, findings }
function readCandidates(pack) {
  const file = path.join(pack, "capture", "candidates.json");
  if (!isFile(file)) return { ids: [], findings: [] };
  const F = msg => ({ check: "pack-manifest", where: "capture/candidates.json", msg });
  try {
    const list = readJson(file);
    if (!Array.isArray(list)) return { ids: [], findings: [F("must be an array of { id, kind, … }")] };
    const ids = list.map(c => c?.id).filter(id => typeof id === "string" && id);
    return { ids, findings: ids.length === list.length ? [] : [F("every entry needs a string id")] };
  } catch (e) {
    return { ids: [], findings: [F(`unreadable: ${e.message}`)] };
  }
}

// ---------------------------------------------------------------- the checks
// each returns [{ check, where, msg }]
function unsettled(t, ids) {
  const settled = obj(t.settled);
  return ids
    .filter(id => settled[id] === undefined)
    .map(id => ({ check: "pack-unsettled", where: id, msg: 'no entry in taste.json "settled"' }));
}

// fits, variants, signature and the settled entries of candidate ids
function refs(t, ids, name, pack) {
  const out = [];
  const miss = (where, family, id) =>
    out.push({ check: "pack-ref", where, msg: `no ${family}/${id} in this pack, the house pack or the kit` });
  const ownIn = (family, id) => isFile(path.join(pack, "assets", family, id, "meta.json"));
  for (const [family, list] of Object.entries(obj(t.fits)))
    if (FAMILIES.includes(family))
      for (const id of strs(list)) if (!itemDir(family, id, name)) miss(`fits.${family}`, family, id);
  for (const id of Object.keys(obj(obj(t.variants).effects)))
    if (!itemDir("effects", id, name)) miss("variants.effects", "effects", id);
  for (const s of strs(t.signature)) {
    const [family, id] = s.split("/");
    if (REF.test(s) && FAMILIES.includes(family) && !itemDir(family, id, name)) miss("signature", family, id);
  }
  const settled = obj(t.settled);
  for (const cid of ids) {
    const v = settled[cid];
    if (typeof v !== "string") continue;
    const m = SETTLED.exec(v);
    if (m) {
      const [, how, family, id] = m;
      if (!FAMILIES.includes(family))
        out.push({ check: "pack-manifest", where: `settled.${cid}`, msg: `"${v}": ${family} is not a family` });
      else if (how === "own" ? !ownIn(family, id) : !itemDir(family, id, name))
        out.push({
          check: "pack-ref",
          where: `settled.${cid}`,
          msg: `"${v}": no ${family}/${id} ${how === "own" ? "in this pack's assets" : "to point at"}`,
        });
    } else if (!(v.startsWith("skip:") && v.slice(5).trim().length >= 3))
      out.push({
        check: "pack-manifest",
        where: `settled.${cid}`,
        msg: `"${v}" must be fits:, variant: or own: <family>/<id>, or "skip: <reason of 3 or more characters>"`,
      });
  }
  return out;
}

let MOTION = null; // the --m-* tokens motion.css declares
function motionTokens() {
  if (!MOTION)
    try {
      MOTION = new Set(
        [...fs.readFileSync(path.join(KIT, "motion", "motion.css"), "utf8").matchAll(/(--m-[a-z0-9-]+)\s*:/g)].map(
          m => m[1],
        ),
      );
    } catch {
      MOTION = new Set();
    }
  return MOTION;
}
// the declared params of an effect found by itemDir: the kit's index.json, or a pack's scanEffects entry
async function paramsOf(id, dir) {
  const effectsDir = path.dirname(dir);
  if (path.resolve(effectsDir) === path.join(KIT, "effects"))
    try {
      return readJson(path.join(effectsDir, "index.json")).effects?.find(e => e.id === id)?.params || null;
    } catch {
      return null;
    }
  const s = await scanItem(dir);
  return s.effects?.find(e => e.id === id)?.params || null;
}
async function variants(t, name) {
  const out = [];
  const F = (where, msg) => out.push({ check: "pack-variant", where, msg });
  for (const [id, set] of Object.entries(obj(obj(t.variants).effects))) {
    const dir = itemDir("effects", id, name);
    const declared = dir ? await paramsOf(id, dir) : null;
    if (!declared || !isObj(set)) continue; // an unknown effect is pack-ref; an invalid one is pack-item
    for (const [k, v] of Object.entries(set)) {
      const p = declared[k];
      if (!isObj(p))
        F(`variants.effects.${id}`, `"${k}" is not a param of ${id} (${Object.keys(declared).join(", ")})`);
      else if (typeof v !== "number" || !Number.isFinite(v)) F(`variants.effects.${id}`, `"${k}" must be a number`);
      else if ((typeof p.min === "number" && v < p.min) || (typeof p.max === "number" && v > p.max))
        F(`variants.effects.${id}`, `"${k}" is ${v}, outside ${p.min}..${p.max}`);
    }
  }
  const tokens = motionTokens();
  for (const k of Object.keys(obj(obj(t.variants).motion)))
    if (!tokens.has(k)) F("variants.motion", `"${k}" is not a motion token of motion/motion.css`);
  return out;
}

// one own item's structure, by family
async function itemShape({ family, id, dir }) {
  const errs = [];
  const has = f => isFile(path.join(dir, f));
  let meta = null;
  if (has("meta.json"))
    try {
      meta = readJson(path.join(dir, "meta.json"));
    } catch (e) {
      errs.push(`meta.json: ${e.message}`);
    }
  else if (family !== "effects" || !has("effect.js")) errs.push("meta.json is missing");
  if (family === "moments") {
    if (meta) {
      const m = await lazy("moments.mjs");
      if (m.error) errs.push(`moments.mjs did not load: ${m.error}`);
      else if (typeof m.mod.validate !== "function") errs.push("moments.mjs has no validate");
      else
        try {
          errs.push(...m.mod.validate(meta, id, path.dirname(dir)));
        } catch (e) {
          errs.push(`validate failed: ${String(e?.message || e).split("\n")[0]}`);
        }
    }
  } else if (family === "effects") {
    const s = await scanItem(dir);
    if (s.error) errs.push(s.error);
    else errs.push(...s.problems.map(p => p.slice(id.length + 2)));
  } else if (family === "scenes") {
    for (const f of ["scene.js", "demo.html"]) if (!has(f)) errs.push(`${f} is missing`);
  } else if (family === "ui") {
    for (const f of ["fragment.html", "fragment.css"]) if (!has(f)) errs.push(`${f} is missing`);
  } else if (family === "components") {
    if (!has("component.html")) errs.push("component.html is missing");
  }
  return errs;
}

// the hosts of the recorded site: each source URL's hostname, and the same without a leading www.
function hostsOf(t) {
  const hosts = new Set();
  for (const u of strs(t.source))
    try {
      const h = new URL(u).hostname.toLowerCase();
      if (h) {
        hosts.add(h);
        hosts.add(h.replace(/^www\./, ""));
      }
    } catch {}
  return [...hosts].filter(Boolean);
}
const hostRe = h => new RegExp(`(^|[^a-z0-9-])${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9-])`, "i");

function hotlinks(item, hosts) {
  if (!hosts.length) return [];
  const res = hosts.map(h => [h, hostRe(h)]);
  const out = [];
  for (const f of walk(item.dir, ["source"])) {
    if (!/\.(js|css|html)$/i.test(f)) continue;
    let text;
    try {
      text = fs.readFileSync(path.join(item.dir, f), "utf8");
    } catch {
      continue;
    }
    const found = res.filter(([, re]) => re.test(text)).map(([h]) => h);
    if (found.length)
      out.push({
        check: "pack-hotlink",
        where: `${item.family}/${item.id}`,
        msg: `${f} names the recorded site (${found.join(", ")}): host it yourself or remove it`,
      });
  }
  return out;
}

function size(item) {
  const skip = f => /^demo[^/]*\.html$/i.test(f) || f === "spec.md";
  let n = 0;
  for (const f of walk(item.dir, ["source"])) if (!skip(f)) n += fs.statSync(path.join(item.dir, f)).size;
  const budget = BUDGET[item.family];
  return n > budget ?
      [{ check: "pack-size", where: `${item.family}/${item.id}`, msg: `${n} bytes of code, over the ${budget} budget` }]
    : [];
}

// demo: the staged demo.html
function lint(item, demo) {
  const where = `${item.family}/${item.id}`;
  const args = [path.join(HERE, "motion-lint.mjs"), demo, "--kit", "--json"];
  const r = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  let files;
  try {
    files = JSON.parse(r.stdout).files;
  } catch {
    const why = (r.stderr || r.error?.message || "").trim().split("\n").pop() || `exit ${r.status}`;
    return [{ check: "pack-lint", where, msg: `motion-lint.mjs gave no result: ${why}` }];
  }
  return files
    .flatMap(x => x.findings || [])
    .filter(f => f.sev === "FAIL")
    .slice(0, LINT_CAP)
    .map(f => ({
      check: "pack-lint",
      where,
      msg: `${f.id}: ${f.msg}${f.examples?.[0] ? ` (${f.examples[0]})` : ""}`,
    }));
}

// stage: the staged item; its root is what the demo's ../../system.css reaches
function render(item, pack, stage) {
  const where = `${item.family}/${item.id}`;
  const out = path.join(pack, "shots", "items", `${item.family}-${item.id}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = spawnSync(
    process.execPath,
    [
      path.join(HERE, "shoot.mjs"),
      "--url",
      path.join(stage.dir, "demo.html"),
      "--root",
      stage.root,
      "--w",
      "1440",
      "--out",
      out,
      "--no-tiles",
      "--profile",
      path.join(os.tmpdir(), `taste-pack-${process.pid}`),
    ],
    { encoding: "utf8", timeout: RENDER_LIMIT },
  );
  if (r.status === 0) return [];
  const last = s => (s || "").trim().split("\n").filter(Boolean).pop();
  const why =
    r.error?.code === "ETIMEDOUT" ?
      `shoot.mjs took over ${RENDER_LIMIT / 1000} s`
    : last(r.stderr) || r.error?.message || last(r.stdout) || `exit ${r.status}`;
  return [{ check: "pack-render", where, msg: why }];
}

// ---------------------------------------------------------------- check
const blank = v => typeof v !== "string" || !v.trim();
// → { findings, warnings }; a warning is the line printed after WARN
async function check(name, { renderOn }) {
  const pack = path.join(tastesDir(), name);
  const { taste, findings } = readManifest(pack, name);
  if (!taste) return { findings, warnings: [] };
  const out = [...findings];
  const warnings = [];
  const house = name === HOUSE;
  const cand = readCandidates(pack);
  out.push(...cand.findings, ...unsettled(taste, cand.ids), ...refs(taste, cand.ids, name, pack));
  if (!house) {
    if (Array.isArray(taste.use_when) && taste.use_when.every(blank))
      warnings.push("pack-manifest use_when is empty: no brief will be matched to this taste");
    if (!isDir(path.join(pack, "capture")))
      warnings.push("pack-unsettled no capture: record again with --keep-doc to list what the site does");
    else if (!isFile(path.join(pack, "capture", "candidates.json")))
      out.push({ check: "pack-unsettled", where: "capture", msg: "capture/candidates.json is missing: record again" });
    const stale = Object.keys(obj(taste.settled)).filter(k => !cand.ids.includes(k));
    if (cand.ids.length && stale.length * 2 > Object.keys(obj(taste.settled)).length)
      warnings.push(`pack-unsettled settled names ${stale.length} candidates that no longer exist`);
  }
  out.push(...(await variants(taste, name)));
  const hosts = hostsOf(taste);
  for (const item of ownItems(pack)) {
    const where = `${item.family}/${item.id}`;
    for (const msg of await itemShape(item)) out.push({ check: "pack-item", where, msg });
    if (!house) {
      if (!isFile(path.join(item.dir, "spec.md")))
        out.push({ check: "pack-spec", where, msg: "no spec.md (references/extract.md says what it holds)" });
      if (isDir(path.join(KIT, item.family, item.id)))
        out.push({ check: "pack-collide", where, msg: `the kit already has ${where}: pick another id` });
    }
    out.push(...hotlinks(item, hosts));
    if (!house) out.push(...size(item));
    const demo = isFile(path.join(item.dir, "demo.html"));
    if (!demo) continue; // a missing demo.html is a pack-item finding where the family needs one
    const stage = stageItem(item.dir);
    try {
      out.push(...lint(item, path.join(stage.dir, "demo.html")));
      if (renderOn) out.push(...render(item, pack, stage));
    } finally {
      stage.done();
    }
  }
  return { findings: out, warnings };
}

// ---------------------------------------------------------------- list
function list() {
  const root = tastesDir();
  const rows = [];
  for (const name of dirsOf(root)) {
    const pack = path.join(root, name);
    if (!isFile(path.join(pack, "taste.json"))) continue;
    const counts = {};
    for (const i of ownItems(pack)) counts[i.family] = (counts[i.family] || 0) + 1;
    let settled = {};
    try {
      settled = obj(readJson(path.join(pack, "taste.json")).settled);
    } catch {}
    const open = readCandidates(pack).ids.filter(id => settled[id] === undefined).length;
    const own = FAMILIES.filter(f => counts[f]).map(f => `${f} ${counts[f]}`);
    rows.push([name, own.length ? own.join(", ") : "no own items", `${open} unsettled`]);
  }
  const w = [0, 1].map(i => Math.max(0, ...rows.map(r => r[i].length)));
  for (const r of rows) console.log(`${r[0].padEnd(w[0])}  ${r[1].padEnd(w[1])}  ${r[2]}`);
}

// ---------------------------------------------------------------- main (only when run, not when imported)
const realOf = p => {
  try {
    return fs.realpathSync(p).toLowerCase();
  } catch {
    return path.resolve(p).toLowerCase();
  }
};
const isMain = process.argv[1] && realOf(process.argv[1]) === realOf(fileURLToPath(import.meta.url));
if (isMain) {
  const USAGE = "usage: pack.mjs check <name> [--render] [--json] | pack.mjs list";
  const args = process.argv.slice(2);
  const cmd = args[0];
  const rest = args.slice(1);
  if (cmd === "list") {
    if (rest.length) die(USAGE);
    list();
  } else if (cmd === "check") {
    const flags = rest.filter(a => a.startsWith("--"));
    const names = rest.filter(a => !a.startsWith("--"));
    if (names.length !== 1 || flags.some(f => f !== "--render" && f !== "--json")) die(USAGE);
    const given = names[0];
    let name;
    try {
      name = tasteName(given, true);
    } catch (e) {
      // a folder with no taste.json is a pack-manifest finding, not a usage error
      if (NAME.test(given) && isDir(path.join(tastesDir(), given))) name = given;
      else die(e.message);
    }
    const { findings, warnings } = await check(name, { renderOn: flags.includes("--render") });
    const status = findings.length ? "FAIL" : "PASS";
    if (flags.includes("--json")) {
      const lines = warnings.map(w => "WARN " + w);
      console.log(JSON.stringify({ name, findings, warnings: lines, status }, null, 1));
    } else {
      for (const f of findings) console.log(`FAIL ${f.check} ${f.where}: ${f.msg}`);
      for (const w of warnings) console.log("WARN " + w);
      console.log(findings.length ? `PACK: FAIL ${findings.length}` : "PACK: PASS");
    }
    process.exit(findings.length ? 1 : 0);
  } else die(USAGE);
}
