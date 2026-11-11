import fs from "node:fs";
import path from "node:path";
import { LISTS, COMPS } from "./layout-options.mjs";
import { SKILL, tastesDir } from "./roots.mjs";

const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const strings = v => Array.isArray(v) && v.every(x => typeof x === "string");
export function contractRegistry(pack = null) {
  /** @type {Record<string, any>} */
  const registry = Object.fromEntries(
    Object.entries(LISTS).map(([k, pools]) => [k, [...new Set(Object.values(pools).flatMap(p => p.split("|")))]]),
  );
  registry.bands = ["tint", "dark", "brand"];
  registry.rhythm = ["screens", "flow"];
  registry.headingAlign = ["left", "center"];
  registry.compositions = Object.fromEntries(Object.entries(COMPS).map(([k, v]) => [k, v.split("|")]));
  const meta = JSON.parse(fs.readFileSync(path.join(SKILL, "assets/motion/meta.json"), "utf8"));
  registry.entrance = (meta.entrances || []).map(x => x.id);
  if (!registry.entrance.includes("still")) registry.entrance.push("still");
  if (pack) {
    const dir = path.join(pack, "assets/components");
    const own =
      fs.existsSync(dir) ?
        fs
          .readdirSync(dir)
          .filter(id => /^[a-z0-9-]+$/.test(id) && fs.existsSync(path.join(dir, id, "meta.json")))
          .map(id => `components/${id}`)
      : [];
    for (const key of ["nav", "footer", "close"]) registry[key].push(...own);
  }
  return registry;
}

export function validateContract(manifest, registry = null) {
  registry ||= contractRegistry(
    /^[a-z0-9][a-z0-9-]{0,63}$/.test(manifest?.name || "") ? path.join(tastesDir(), manifest.name) : null,
  );
  const findings = [];
  const fail = (path, message) => findings.push({ path, message });
  const t = manifest || {};
  if (t.layout !== undefined && !object(t.layout)) fail("layout", "must be an object");
  if (t.motion !== undefined && !object(t.motion)) fail("motion", "must be an object");
  for (const [key, value] of Object.entries(object(t.layout) ? t.layout : {})) {
    if (key === "compositions") {
      if (!object(value)) {
        fail("layout.compositions", "must be an object");
        continue;
      }
      for (const [section, ids] of Object.entries(value))
        if (!strings(ids) || !ids.length || ids.some(id => !registry.compositions?.[section]?.includes(id)))
          fail(`layout.compositions.${section}`, "requires supported composition ids");
    } else if (["rhythm", "headingAlign"].includes(key)) {
      if (!registry[key]?.includes(value)) fail(`layout.${key}`, "unknown choice");
    } else if (
      !Object.hasOwn(LISTS, key)
      || !registry[key]
      || !strings(value)
      || (key !== "bands" && !value.length)
      || value.some(id => !registry[key].includes(id))
    )
      fail(`layout.${key}`, "requires supported choices");
  }
  const motion = object(t.motion) ? t.motion : {};
  for (const [key, value] of Object.entries(motion)) {
    const valid =
      key === "moments" ? Number.isInteger(value) && value >= 0 && value <= 3
      : key === "entrance" ? registry.entrance?.includes(value)
      : key === "fragmentPlayback" ? ["static", "loop"].includes(value)
      : key === "reveal" ? ["none", "default"].includes(value)
      : ["scene", "effect"].includes(key) ? ["none", "auto"].includes(value)
      : false;
    if (!valid) fail(`motion.${key}`, "unknown or invalid choice");
  }
  const signature = Array.isArray(t.signature) ? t.signature.filter(x => typeof x === "string") : [];
  for (const key of ["nav", "footer", "close"])
    for (const id of Array.isArray(t.layout?.[key]) ? t.layout[key] : [])
      if (id.startsWith("components/") && !signature.includes(id))
        fail(`layout.${key}`, "own layout parts must be signature components");
  if (motion.moments !== undefined && signature.filter(x => x.startsWith("moments/")).length > motion.moments)
    fail("motion.moments", "budget is smaller than required signature moments");
  for (const [key, family] of [
    ["scene", "scenes"],
    ["effect", "effects"],
  ])
    if (motion[key] === "none" && signature.some(x => x.startsWith(family + "/")))
      fail(`motion.${key}`, "contradicts a signature item");
  // Evidence is required only for new contract fields; legacy packs remain readable.
  const paths = [
    ...Object.keys(object(t.layout) ? t.layout : {}).map(k => `layout.${k}`),
    ...Object.keys(motion).map(k => `motion.${k}`),
  ];
  for (const p of paths) {
    // V2 definitions use the canonical evidence map. Continue accepting the separate legacy map so a
    // schema upgrade can move contract evidence into `evidence` without breaking existing reviewed packs.
    const evidence =
      t.schemaVersion === 2 ?
        (t.evidence?.[p] ?? t.evidence?.[p.split(".")[0]] ?? t.contractEvidence?.[p])
      : t.contractEvidence?.[p];
    if (
      !object(evidence)
      || !strings(evidence.sources)
      || !evidence.sources.length
      || !evidence.sources.every(x => x.trim())
      || typeof evidence.reason !== "string"
      || !evidence.reason.trim()
    )
      fail(`${t.schemaVersion === 2 ? "evidence" : "contractEvidence"}.${p}`, "requires sources and a reason");
  }
  return findings;
}

export { loadTastePack, validateTaste, resolveTaste } from "./taste-definition.mjs";

export function resolveContract(manifest, defaults = {}) {
  const t = manifest || {};
  return {
    ...structuredClone(defaults),
    layout: { ...(defaults.layout || {}), ...(t.layout || {}) },
    motion: { ...(defaults.motion || {}), ...(t.motion || {}) },
  };
}

// Reference builds resolve missing decoration quietly, including any signature requirements.
// Keep this shared by the planner and its freshness check; legacy contracts retain their own defaults.
export function resolveReferenceContract(manifest) {
  const signature = Array.isArray(manifest?.signature) ? manifest.signature : [];
  const items = family => signature.filter(item => typeof item === "string" && item.startsWith(family + "/"));
  return resolveContract(manifest, {
    motion: {
      entrance: "still",
      moments: items("moments").length,
      scene: items("scenes").length ? "auto" : "none",
      effect: items("effects").length ? "auto" : "none",
      reveal: "none",
      fragmentPlayback: "static",
    },
  });
}

export function selectPool(contract, key, fallback) {
  return contract?.layout?.[key] ?? fallback;
}

export function checkedContract(manifest) {
  const errors = validateContract(manifest);
  if (errors.length) throw new Error(errors.map(e => `${e.path}: ${e.message}`).join("; "));
  return resolveContract(manifest);
}
