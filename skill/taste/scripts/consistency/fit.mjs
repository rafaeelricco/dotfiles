// consistency/fit.mjs — the 2.5.2 fit rule shared by the visuals module and runWidth (moved from consistency.mjs)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { itemDir } from "../roots.mjs";
import { TASTE } from "./cli.mjs";

// 2.5.2, the fit rule (moments.md): a place, service or product page may hold one quiet treatment (an effect whose
// meta.json says "treatment": true) and a big scene whose tones, intensity and webgl fit its kind; the kit's own scene
// files are no scroll library of the page's
export const readMeta = (dir, id) => {
  try {
    const d = /^[a-z0-9-]+$/.test(id || "") ? itemDir(dir, id, TASTE) : null;
    return d ? JSON.parse(readFileSync(join(d, "meta.json"), "utf8")) : null;
  } catch {
    return null;
  }
};
export const FIT_KIND = {
  place: { tones: ["warm", "editorial"], intensity: ["quiet", "lively"] },
  service: { tones: ["editorial", "warm", "product"], intensity: ["quiet", "lively"] },
  product: { tones: ["product", "editorial", "warm"], intensity: ["quiet", "lively", "bold"] },
};
export const isTreatment = id => {
  const m = readMeta("effects", id);
  return !!(m && m.treatment);
};
export const sceneFitsKind = (id, kind) => {
  const m = readMeta("scenes", id),
    f = FIT_KIND[kind];
  if (!m || !f || m.retired || (m.webgl || 0) > 0) return false;
  return (m.tones || []).some(t => f.tones.includes(t)) && f.intensity.includes(m.intensity || "lively");
};
