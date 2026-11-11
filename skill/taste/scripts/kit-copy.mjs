#!/usr/bin/env node
// kit-copy.mjs - copy into the page only what it uses: the core, the dealt parts (.taste-skill/deal.json), parts added by hand.
//   node kit-copy.mjs [--to assets] [--add ui/chat,effects/caustics] [--taste <name>]
// Never deletes; a second run adds what a new deal or --add names. Prints files and bytes copied.
import fs from "node:fs";
import path from "node:path";
import { SKILL, assetRoots, itemDir, tasteName } from "./roots.mjs";

const SKIP = /^(demo.*\.html|spec\.md|README\.md|.*\.mjs|\.DS_Store)$|^source$/; // an item's authoring files stay behind

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf("--" + k);
  return (
    i < 0 ? d
    : args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1]
    : true
  );
};
const die = msg => {
  console.error("kit-copy: " + msg);
  process.exit(2);
};

const to = path.resolve(process.cwd(), typeof opt("to", "assets") === "string" ? opt("to", "assets") : "assets");
const assetsRoot = path.join(SKILL, "assets");
const stat = { files: 0, bytes: 0 };
const replaced = [];
const seen = new Set(); // destination files already handled in this run

// one file → dest. Identical content is a no-op; different content is overwritten (the kit's copy wins) and listed.
// Returns the bytes written, or -1 for a no-op.
function copyFile(src, dest) {
  const data = fs.readFileSync(src);
  let existed = false;
  if (fs.existsSync(dest)) {
    existed = true;
    if (data.equals(fs.readFileSync(dest))) return -1;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
  if (existed) replaced.push(path.relative(to, dest).split(path.sep).join("/"));
  return data.length;
}

// a file or a folder (minus SKIP) from srcRoot/rel → to/rel; returns the destination .js files it holds, and counts
function copyTree(src, dest, out) {
  const st = fs.statSync(src);
  if (!st.isDirectory()) {
    if (seen.has(dest)) return;
    seen.add(dest);
    const n = copyFile(src, dest);
    if (n >= 0) {
      out.files++;
      out.bytes += n;
    }
    if (dest.endsWith(".js")) out.js.push(dest);
    return;
  }
  for (const name of fs.readdirSync(src).sort())
    if (!SKIP.test(name)) copyTree(path.join(src, name), path.join(dest, name), out);
}
const newGroup = () => ({ files: 0, bytes: 0, js: [] });
function report(label, g) {
  stat.files += g.files;
  stat.bytes += g.bytes;
  console.log(`${label} ${g.files} file${g.files === 1 ? "" : "s"}`);
}

// the deal's parts plus --add, as [family, id] pairs; the taste is the deal's unless --taste names one
function parts(deal, add) {
  const out = [];
  const push = (family, id) => {
    if (!out.some(p => p[0] === family && p[1] === id)) out.push([family, id]);
  };
  if (deal) {
    for (const m of deal.moments || []) push("moments", m.id);
    if (deal.scene) push("scenes", deal.scene.id);
    if (deal.effect) push("effects", deal.effect.id);
    for (const s of deal.signature || []) push(s.family, s.id);
  }
  for (const a of add) {
    const i = a.indexOf("/");
    const family = a.slice(0, i),
      id = a.slice(i + 1);
    if (i < 1 || !id || a.split("/").some(s => s === ".." || s === ".")) die(`--add needs <family>/<id>, got "${a}"`);
    push(family, id);
  }
  return out;
}

// one item folder → <to>/<family>/<id>/, minus SKIP
function copyItem(family, id, taste, to) {
  // an item folder, else any file or folder at that path in a root (a family's shared runtime: objects/_print-core)
  const dir =
    itemDir(family, id, taste)
    || assetRoots(taste)
      .map(r => path.join(r, family, id))
      .find(p => fs.existsSync(p));
  if (!dir) {
    const roots = assetRoots(taste).map(r => "  " + path.join(r, family, id, "meta.json"));
    die(`no ${family}/${id} in any root; searched:\n${roots.join("\n")}`);
  }
  const g = newGroup();
  copyTree(dir, path.join(to, family, id), g);
  return g;
}

// follow static relative imports of every copied .js (import … from "../x/y.js", import("../x/y.js")) and files it
// loads by URL (new URL("./stage.css", import.meta.url), also against a const made of one) through assetRoots(taste)
// until nothing new is found: classic scene wrappers, shared.js → fx.js, kit.js → photo-kit. Any file type is
// copied; only .js files are scanned further.
function closeImports(to, taste, scan) {
  const g = newGroup();
  const done = new Set();
  const specs = [
    /\bfrom\s*(["'])([^"'\n]+)\1/g, // import … from "x", export … from "x"
    /\bimport\s*(["'])([^"'\n]+)\1/g, // import "x"
    /\bimport\s*\(\s*(["'])([^"'\n]+)\1\s*[,)]/g, // import("x") with a plain string literal
  ];
  const urlSpec = /\bnew\s+URL\s*\(\s*(["'])([^"'\n]+)\1\s*,\s*(import\.meta\.url|[A-Za-z_$][\w$]*)\s*\)/g; // new URL("x", import.meta.url)
  const aliasSpec =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+URL\s*\(\s*(["'])([^"'\n]*)\2\s*,\s*import\.meta\.url\s*\)/g;
  const queue = [...scan];
  while (queue.length) {
    const file = queue.shift();
    if (done.has(file)) continue;
    done.add(file);
    // an import shown in a comment (a usage example) is no import
    const text = fs
      .readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    // [spec, the folder it is relative to]
    const refs = [];
    for (const re of specs)
      for (const m of text.matchAll(re)) {
        const spec = m[2].replace(/[?#].*$/, "");
        if (spec.startsWith("./") || spec.startsWith("../")) refs.push([spec, path.dirname(file)]);
      }
    // a const made of new URL("./", import.meta.url) is a base: new URL("stage.css", BASE)
    const bases = new Map([["import.meta.url", path.dirname(file)]]);
    for (const m of text.matchAll(aliasSpec)) {
      const at = path.resolve(path.dirname(file), m[3]);
      bases.set(m[1], /(^|\/)\.{0,2}$/.test(m[3]) ? at : path.dirname(at));
    }
    for (const m of text.matchAll(urlSpec)) {
      const spec = m[2].replace(/[?#].*$/, "");
      if (bases.has(m[3]) && spec && !/^([a-z][a-z0-9+.-]*:|\/)/i.test(spec)) refs.push([spec, bases.get(m[3])]);
    }
    for (const [spec, from] of refs) {
      const target = path.resolve(from, spec);
      const rel = path.relative(to, target);
      if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) continue; // outside the assets tree
      if (/(^|\/)\.{0,2}$/.test(spec) || fs.existsSync(target)) continue; // a folder (a base), or already there
      const isFile = p => fs.existsSync(p) && fs.statSync(p).isFile();
      const root = assetRoots(taste).find(r => isFile(path.join(r, rel)));
      if (!root) {
        console.error(`kit-copy: ${path.relative(to, file)} imports ${spec}, found in no root`);
        continue;
      }
      seen.add(target);
      const n = copyFile(path.join(root, rel), target);
      if (n >= 0) {
        g.files++;
        g.bytes += n;
      }
      if (target.endsWith(".js")) queue.push(target);
    }
  }
  return g;
}

// main: core.json "always" + "family" of every family in use, then copyItem for each part, then closeImports.
// exit 2 on a part itemDir() cannot find, naming the roots searched.
const addArg = opt("add", "");
const add =
  typeof addArg === "string" ?
    addArg
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  : [];
if (addArg === true) die("--add needs a list: ui/chat,effects/caustics");
const dealFile = path.join(process.cwd(), ".taste-skill", "deal.json");
let deal = null;
if (fs.existsSync(dealFile)) {
  try {
    deal = JSON.parse(fs.readFileSync(dealFile, "utf8"));
  } catch (e) {
    die(`${path.relative(process.cwd(), dealFile)} is not valid JSON (${e.message}); run start.mjs plan again`);
  }
} else if (!add.length) {
  const start = path.join(SKILL, "scripts", "start.mjs");
  die(`no .taste-skill/deal.json here; run \`node ${start} plan ...\` first, or name parts with --add`);
}

let taste;
try {
  const t = opt("taste", undefined);
  if (t === true) die("--taste needs a taste name");
  taste = tasteName(
    t !== undefined ? t
    : deal ? deal.taste
    : null,
  );
} catch (e) {
  die(e.message);
}

const core = JSON.parse(fs.readFileSync(path.join(assetsRoot, "core.json"), "utf8"));
const items = parts(deal, add);
const families = new Set(items.map(p => p[0]));
const corePaths = [...(core.always || [])];
for (const [family, list] of Object.entries(core.family || {})) if (families.has(family)) corePaths.push(...list);

const scan = [];
const coreGroup = newGroup();
for (const rel of corePaths) {
  const src = path.join(assetsRoot, rel);
  if (!fs.existsSync(src)) die(`core.json names ${rel}, which is not in ${assetsRoot}`);
  copyTree(src, path.join(to, rel), coreGroup);
}
report("core", coreGroup);
scan.push(...coreGroup.js);

// the effects a part mounts by id (fx.mount(el, "orb-sphere")): fx.js builds that module's URL at run time, so no
// import names it. A ui fragment lists them in its meta.json "effects"; a component mounts its "default".
function effectsOf(family, id) {
  if (family !== "ui" && family !== "components") return [];
  const dir = itemDir(family, id, taste);
  let m;
  try {
    m = dir ? JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")) : null;
  } catch {
    return [];
  }
  const ids = family === "ui" ? m?.effects : [m?.default];
  return (Array.isArray(ids) ? ids : []).filter(e => typeof e === "string" && e && e !== "none");
}

for (const [family, id] of items) {
  const g = copyItem(family, id, taste, to);
  report(`${family}/${id}`, g);
  scan.push(...g.js);
  // appended parts are copied by this same loop
  for (const e of effectsOf(family, id))
    if (!items.some(p => p[0] === "effects" && p[1] === e) && itemDir("effects", e, taste)) items.push(["effects", e]);
}

report("imports", closeImports(to, taste, scan));
for (const r of replaced) console.log(`replaced ${r}`);
console.log(`total ${stat.files} file${stat.files === 1 ? "" : "s"}, ${stat.bytes} bytes`);
