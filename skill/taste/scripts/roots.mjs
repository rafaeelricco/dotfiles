// roots.mjs - where the catalogue lives: the taste packs beside this skill (ui/tastes), then this skill's assets.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const HOUSE = "house";
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;

// the ui skill sits beside this one (gate.mjs tasteOverrides uses the same rule); TASTE_SKILL_TASTES replaces it in tests
export const tastesDir = () =>
  path.resolve(process.env.TASTE_SKILL_TASTES || path.join(fs.realpathSync(SKILL), "..", "ui", "tastes"));
// a saved taste's name, or null for none. The house pack is the kit's extras, not a taste: only pack.mjs names it.
export function tasteName(v, allowHouse = false) {
  if (v == null || v === false) return null;
  if (typeof v !== "string" || !NAME.test(v)) throw new Error(`--taste needs a taste name, got "${v}"`);
  if (v === HOUSE && !allowHouse) throw new Error(`"${HOUSE}" is the kit's extras pack, not a taste`);
  const file = path.join(tastesDir(), v, "taste.json");
  if (!fs.existsSync(file)) throw new Error(`no taste "${v}" in ${tastesDir()}`);
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file} is not valid JSON (${e.message})`);
  }
  return v;
}
// the named taste's pack first, then the house pack, each only when it is on disk
export const packDirs = taste =>
  [...new Set([taste, HOUSE].filter(Boolean))].map(n => path.join(tastesDir(), n)).filter(d => fs.existsSync(d));
export const assetRoots = taste => [...packDirs(taste).map(d => path.join(d, "assets")), path.join(SKILL, "assets")];
export function itemDir(family, id, taste) {
  for (const r of assetRoots(taste))
    if (fs.existsSync(path.join(r, family, id, "meta.json"))) return path.join(r, family, id);
  return null;
}
export function readTaste(taste) {
  try {
    return taste ? JSON.parse(fs.readFileSync(path.join(tastesDir(), taste, "taste.json"), "utf8")) : null;
  } catch {
    return null;
  }
}
// a path as the PLAN prints it
export const refOf = p =>
  p.startsWith(SKILL + path.sep) ?
    "<skill>/" + path.relative(SKILL, p).split(path.sep).join("/")
  : "<ui skill>/tastes/" + path.relative(tastesDir(), p).split(path.sep).join("/");

// A part dealt again on its own joins the deal the plan wrote, beside the history file: kit-copy.mjs copies from
// that deal and the gate reads it. No deal there yet (no plan was run): nothing to keep in step.
export function updateDeal(historyFile, patch) {
  if (typeof historyFile !== "string") return;
  const file = path.join(path.dirname(path.resolve(historyFile)), "deal.json");
  let deal;
  try {
    deal = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return;
  }
  fs.writeFileSync(file, JSON.stringify({ ...deal, ...patch }, null, 1) + "\n");
}

// A pack's item is written as if it sat in the kit (its code imports ../fx.js, its demo links ../../system.css),
// and on a page kit-copy.mjs puts it there. To load or show it where it lies, stage it: a temp folder whose assets/
// is the kit's by symlink, with the item's family folder holding the kit's entries, the pack's shared ones and a
// copy of the item. Returns { dir: the staged item, root: the staged assets folder, done(): remove the stage }.
export function stageItem(dir) {
  const family = path.basename(path.dirname(dir)),
    id = path.basename(dir),
    kit = path.join(SKILL, "assets"),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taste-stage-")),
    root = path.join(tmp, "assets"),
    fam = path.join(root, family);
  fs.mkdirSync(fam, { recursive: true });
  const names = d => {
    try {
      return fs.readdirSync(d);
    } catch {
      return [];
    }
  };
  for (const e of names(kit)) if (e !== family) fs.symlinkSync(path.join(kit, e), path.join(root, e));
  for (const from of [path.join(kit, family), path.dirname(dir)])
    for (const e of names(from))
      if (e !== id && !fs.existsSync(path.join(fam, e))) fs.symlinkSync(path.join(from, e), path.join(fam, e));
  fs.cpSync(dir, path.join(fam, id), { recursive: true });
  return { dir: path.join(fam, id), root, done: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}
