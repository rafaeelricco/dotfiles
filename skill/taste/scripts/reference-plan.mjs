import fs from "node:fs";
import path from "node:path";
import { FIT as MOMENT_FIT, canShare, fitsKind, needsMet, tonesOf } from "./moments.mjs";
import { LISTS, COMPS, KIND_COMPS } from "./layout-options.mjs";
import { contractRegistry, resolveReferenceContract, validateContract } from "./taste-contract.mjs";
import { resolveTaste } from "./taste-definition.mjs";
import { definitionDigest } from "./build-policy.mjs";
import { SKILL, tastesDir } from "./roots.mjs";

const PAGE_TYPES = new Set(["tech", "software", "gaming", "product", "service", "place"]);
const ENTER_META = JSON.parse(fs.readFileSync(path.join(SKILL, "assets/motion/meta.json"), "utf8"));
const HERO_META = JSON.parse(fs.readFileSync(path.join(SKILL, "assets/layout/heroes.json"), "utf8"));
const HEROES = HERO_META.heroes || [];
const ENTRANCES = ENTER_META.entrances || [];
const SIGNATURE_FAMILIES = new Set(["moments", "scenes", "effects", "ui", "components"]);

const isObject = x => x !== null && typeof x === "object" && !Array.isArray(x);
const unique = xs => [...new Set(xs)];
const list = x => (Array.isArray(x) ? x : []);
const fitPage = page => (page === "tech" ? "product" : page);
const fitsTone = (item, page, tone) => fitsKind(item, page) && (!tone || tonesOf(item).includes(tone));

function normalizeHas(page, value) {
  const defaults = {
    software: ["ui", "figures"],
    gaming: ["setting"],
    tech: ["photo", "product", "figures"],
    product: ["photo", "product"],
    service: ["photo"],
    place: ["photo"],
  };
  const values =
    value instanceof Set ? [...value]
    : Array.isArray(value) ? value
    : typeof value === "string" ?
      value
        .split(",")
        .map(x => x.trim())
        .filter(Boolean)
    : defaults[page] || [];
  const result = new Set([...values, "ground"]);
  if (page === "gaming") result.delete("ui");
  else if (result.delete("setting")) result.add("photo");
  return result;
}

function pageAllowed(key, page) {
  return (LISTS[key]?.[page] || LISTS[key]?.["*"] || "").split("|").filter(Boolean);
}

function selectFirst(key, allowed, page, { allowComponents = false, signature = [] } = {}) {
  const pool = pageAllowed(key, page);
  const selected = allowed.find(
    id => pool.includes(id) || (allowComponents && id.startsWith("components/") && signature.includes(id)),
  );
  if (!selected) throw new Error(`reference layout.${key} has no compatible choice for ${page}`);
  return selected;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function assetRoots(packDir) {
  const roots = [];
  if (packDir) roots.push(path.join(path.resolve(packDir), "assets"));
  roots.push(path.join(tastesDir(), "house", "assets"), path.join(SKILL, "assets"));
  return unique(roots.map(root => path.resolve(root)));
}

function itemAt(family, id, roots) {
  if (!/^[a-z][a-z0-9-]*$/.test(family) || !/^[a-z0-9][a-z0-9-]*$/.test(id)) return null;
  for (const root of roots) {
    const dir = path.resolve(root, family, id);
    const relative = path.relative(root, dir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) continue;
    const meta = readJson(path.join(dir, "meta.json"));
    if (meta && typeof meta === "object") return { ...meta, id: meta.id || id, dir };
  }
  return null;
}

function readFitItems(family, definition, roots) {
  const fitIds = list(definition.fits?.[family]);
  const signatureIds = list(definition.signature)
    .filter(item => typeof item === "string" && item.startsWith(`${family}/`))
    .map(item => item.slice(family.length + 1));
  return unique([...fitIds, ...signatureIds])
    .map(id => {
      const found = itemAt(family, id, roots);
      if (!found && signatureIds.includes(id))
        throw new Error(`signature ${family}/${id} is missing assets/${family}/${id}/meta.json`);
      if (!found && fitIds.includes(id))
        throw new Error(`fits.${family} item ${id} is missing assets/${family}/${id}/meta.json`);
      return found;
    })
    .filter(Boolean);
}

function heroNeedsMet(hero, has, page) {
  const keys = new Set(has);
  if (page !== "gaming" && keys.delete("setting")) keys.add("photo");
  return (
    (hero.needs || []).every(need =>
      String(need)
        .split("|")
        .some(k => keys.has(k)),
    ) && !(hero.avoid || []).some(k => keys.has(k))
  );
}

function selectHero(definition, page, has) {
  const choices = list(definition.heroes);
  if (!choices.length)
    throw new Error("reference definition is missing required heroes; record at least one compatible hero id");
  const type = fitPage(page);
  const candidates = choices
    .map(id => HEROES.find(hero => hero.id === id))
    .filter(Boolean)
    .filter(hero => {
      if (page === "place" && hero.id !== "place" && hero.id !== "statement") return false;
      if (page === "gaming" && hero.id === "place") return false;
      if (page !== "place" && hero.id === "place") return false;
      if (!(hero.types?.[page] > 0 || hero.types?.[type] > 0)) return false;
      if (!heroNeedsMet(hero, has, page)) return false;
      if (page === "gaming" && (hero.needs || []).some(n => /\bui\b/i.test(n))) return false;
      return true;
    });
  const hero = candidates[0];
  if (!hero) throw new Error(`reference heroes has no compatible hero for ${page} with ${[...has].join(", ")}`);
  if (hero.id === "place")
    throw new Error(
      "reference hero place needs a recorded hero form; this definition schema has no supported place-form choice yet",
    );
  return { id: hero.id, form: null, meta: hero };
}

function entranceMeets(need, { has, hero, page }) {
  const windowHero =
    /^(centred|collage|word|statement|triptych)$/.test(hero.id) || (hero.id === "split" && page === "software");
  const picture =
    !windowHero
    && (has.has("photo")
      || has.has("film")
      || has.has("object")
      || has.has("setting")
      || /place|photo|film|product|editorial/.test(hero.id));
  return (
    /window|ui/i.test(need) ? has.has("ui") || hero.id === "ui"
    : /moving|scene/i.test(need) ? has.has("film") || hero.id === "film"
    : /70%|half/i.test(need) ? picture && !/split/.test(hero.form || hero.id)
    : /picture|photograph/i.test(need) ? picture
    : true
  );
}

function selectEntrance(contract, context) {
  const requested = contract.motion.entrance;
  if (requested === "still")
    return (
      ENTRANCES.find(item => item.id === "still") || { id: "still", sees: "static hero", markup: 'data-enter="still"' }
    );
  const fitting = ENTRANCES.filter(
    item =>
      item.id !== "still"
      && MOMENT_FIT[context.page]
      && (item.tones || []).some(tone => MOMENT_FIT[context.page].tones.includes(tone))
      && (!context.tone || item.tones.includes(context.tone))
      && MOMENT_FIT[context.page].intensity.includes(item.intensity || "quiet")
      && (item.needs || []).every(need => entranceMeets(need, context)),
  );
  if (requested) {
    const match = fitting.find(item => item.id === requested);
    if (!match) throw new Error(`reference entrance ${requested} cannot fit ${context.hero.id} and its content`);
    return match;
  }
  return (
    ENTRANCES.find(item => item.id === "still") || { id: "still", sees: "static hero", markup: 'data-enter="still"' }
  );
}

function itemFitsScene(scene, page, has, tone) {
  const techPages = new Set(["tech", "software", "gaming"]);
  return (
    !scene.retired
    && (scene.weight ?? 1) > 0
    && fitsTone(scene, page, tone)
    && (!techPages.has(page) || !Array.isArray(scene.types) || !scene.types.length || scene.types.includes(page))
    && needsMet(scene, has).length === 0
  );
}

function itemFitsMoment(moment, page, has, tone) {
  return (
    !moment.retired && (moment.weight ?? 1) > 0 && fitsTone(moment, page, tone) && needsMet(moment, has).length === 0
  );
}

function itemFitsEffect(effect, page, palettes, tone) {
  if (effect.retired) return false;
  const fit = MOMENT_FIT[page];
  if (!fit) return false;
  const tones = Array.isArray(effect.tones) ? effect.tones : [];
  if (!tones.some(value => fit.tones.includes(value))) return false;
  if (tone && !tones.includes(tone)) return false;
  if (!fit.intensity.includes(effect.intensity || "lively")) return false;
  const treatment = effect.treatment === true;
  if ((effect.webgl || 0) > 0 && !fit.webgl && !treatment) return false;
  if (!fit.webgl && !treatment) return false;
  return (effect.palettes || []).some(kind => palettes.includes(kind));
}

function selectedLayout(definition, page, signature) {
  const input = definition.layout;
  if (!isObject(input)) throw new Error("reference definition is missing required layout choices");
  for (const key of ["rhythm", "headingAlign"])
    if (input[key] === undefined) throw new Error(`reference definition is missing required layout.${key}`);
  const out = {};
  for (const key of ["nav", "footer", "close", "buttons", "mark"]) {
    if (!Array.isArray(input[key]) || input[key].length === 0)
      throw new Error(`reference layout.${key} is required; record an ordered list of supported choices`);
    out[key] = selectFirst(key, input[key], page, {
      allowComponents: ["nav", "footer", "close"].includes(key),
      signature,
    });
  }
  if (Object.hasOwn(input, "bands")) {
    const bands = list(input.bands);
    const validCombinations = pageAllowed("bands", page).map(value => value.split("+"));
    const exact = validCombinations.find(
      pool => pool.length === bands.length && pool.every((item, i) => item === bands[i]),
    );
    if (bands.length && !exact) throw new Error(`reference layout.bands has no compatible sequence for ${page}`);
    out.bands = bands.slice();
  }
  const forPage = new Set(KIND_COMPS[page] || []);
  if (isObject(input.compositions)) {
    const compositions = {};
    for (const [section, choices] of Object.entries(input.compositions)) {
      if (!forPage.has(section)) continue;
      if (!Array.isArray(choices) || choices.some(id => !COMPS[section]?.split("|").includes(id)))
        throw new Error(`reference layout.compositions.${section} has no compatible choices for ${page}`);
      compositions[section] = choices.slice();
    }
    if (Object.keys(compositions).length) out.compositions = compositions;
  }
  for (const key of ["rhythm", "headingAlign"]) if (Object.hasOwn(input, key)) out[key] = input[key];
  return out;
}

function selectScene({ definition, contract, page, has, roots, signature, tone }) {
  const required = signature.find(item => item.family === "scenes");
  if (contract.motion.scene === "none") return null;
  const candidates = readFitItems("scenes", definition, roots);
  const ordered = required ? [candidates.find(x => x.id === required.id)] : candidates;
  if (!required && contract.motion.scene !== "auto") return null;
  const scene = ordered.find(x => x && itemFitsScene(x, page, has, tone));
  if (required && !scene)
    throw new Error(`signature scenes/${required.id} cannot fit ${page} with ${[...has].join(", ")}`);
  return scene || null;
}

function selectMoments({ definition, contract, page, has, roots, signatures, scene, effect, tone }) {
  const required = signatures.filter(item => item.family === "moments");
  const count = contract.motion.moments;
  const target = count === undefined ? required.length : Math.max(count, required.length);
  const candidates = readFitItems("moments", definition, roots);
  const selected = [];
  const add = (candidate, isSignature = false) => {
    if (!candidate || !itemFitsMoment(candidate, page, has, tone)) {
      if (isSignature)
        throw new Error(
          `signature moments/${candidate?.id || "<missing>"} cannot fit ${page} with ${[...has].join(", ")}`,
        );
      return false;
    }
    if (
      scene
      && ((scene.avoidMoments || []).includes(candidate.id) || (candidate.avoidWith || []).includes(scene.id))
    ) {
      if (isSignature) throw new Error(`signature moments/${candidate.id} conflicts with scene ${scene.id}`);
      return false;
    }
    const contexts =
      (scene?.webgl || 0) + (effect?.webgl || 0) + selected.reduce((n, item) => n + (item.webgl || 0), 0);
    if (contexts + (candidate.webgl || 0) > 4 || selected.some(item => !canShare(item, candidate))) {
      if (isSignature)
        throw new Error(`signature moments/${candidate.id} conflicts with another required visual or the WebGL budget`);
      return false;
    }
    if (!selected.some(item => item.id === candidate.id)) selected.push(candidate);
    return true;
  };
  for (const item of required)
    add(
      candidates.find(x => x.id === item.id),
      true,
    );
  for (const candidate of candidates) {
    if (selected.length >= target) break;
    add(candidate, false);
  }
  if (selected.length < target)
    throw new Error(
      `reference motion.moments needs ${target} compatible moments; only ${selected.length} of the approved fits/signatures fit ${page}`,
    );
  return selected.map(item => ({ id: item.id, dir: item.dir }));
}

function selectEffect({ definition, contract, page, roots, signatures, scene, tone }) {
  const required = signatures.find(item => item.family === "effects");
  if (contract.motion.effect === "none") return null;
  if (scene && !required) return null;
  const candidates = readFitItems("effects", definition, roots);
  const ordered = required ? [candidates.find(x => x.id === required.id)] : candidates;
  if (!required && contract.motion.effect !== "auto") return null;
  const palettes = ["light", "dark"].filter(mode => definition.tokens.colors[mode] !== null);
  const effect = ordered.find(
    candidate =>
      candidate && (required || candidate.random !== false) && itemFitsEffect(candidate, page, palettes, tone),
  );
  if (required && !effect)
    throw new Error(`signature effects/${required.id} cannot fit ${page} and the recorded colors`);
  if (!effect) return null;
  const tech = ["tech", "software", "gaming"].includes(page);
  const preferred = tech ? ["hero", "band", "card", "footer"] : ["band", "hero", "card", "footer"];
  const slot = preferred.find(value => effect.bestOn?.includes(value));
  if (!slot) {
    if (required) throw new Error(`signature effects/${effect.id} has no compatible placement slot`);
    return null;
  }
  return { id: effect.id, slot, dir: effect.dir, webgl: effect.webgl || 0 };
}

function parseSignature(definition, roots) {
  const signature = [];
  for (const item of list(definition.signature)) {
    if (typeof item !== "string" || !item.includes("/"))
      throw new Error(`invalid signature entry ${JSON.stringify(item)}`);
    const slash = item.indexOf("/");
    const family = item.slice(0, slash);
    const id = item.slice(slash + 1);
    if (!SIGNATURE_FAMILIES.has(family)) throw new Error(`unsupported signature family ${family}`);
    const found = itemAt(family, id, roots);
    if (!found) throw new Error(`signature ${item} is missing its asset folder`);
    signature.push({ family, id, dir: found.dir });
  }
  return signature;
}

/** Compile a v2 recorded taste into an ordered, deterministic plan without reading or mutating history.
 * @param {any} definition
 * @param {{page?: string, has?: string | string[] | Set<string>, packDir?: string, tone?: string}} options
 */
export function compileReferencePlan(definition, { page, has, packDir, tone } = {}) {
  if (typeof page !== "string" || !PAGE_TYPES.has(page))
    throw new Error(`reference plan needs a page kind (${[...PAGE_TYPES].join(", ")})`);
  if (!isObject(definition) || definition.schemaVersion !== 2)
    throw new Error(
      "reference plans require a schemaVersion: 2 taste definition; legacy v1 packs remain available to existing exports but must be upgraded before a new reference plan",
    );
  const resolved = resolveTaste(definition, { purpose: "build", packDir });
  const errors = validateContract(resolved, contractRegistry(packDir));
  if (errors.length) throw new Error(errors.map(item => `${item.path}: ${item.message}`).join("; "));
  const contract = resolveReferenceContract(resolved);
  for (const [key, value] of [
    ["layout.rhythm", resolved.layout?.rhythm],
    ["layout.headingAlign", resolved.layout?.headingAlign],
  ])
    if (value === undefined) throw new Error(`reference definition is missing required ${key}`);
  // Missing decoration has an explicit quiet resolution in the deal, never a house-style fallback.
  const signatureItems = list(resolved.signature);
  const signatureMomentCount = signatureItems.filter(
    item => typeof item === "string" && item.startsWith("moments/"),
  ).length;
  const hasSignatureEffect = signatureItems.some(item => typeof item === "string" && item.startsWith("effects/"));
  const sigScenes = list(resolved.signature).filter(item => typeof item === "string" && item.startsWith("scenes/"));
  const sigEffects = list(resolved.signature).filter(item => typeof item === "string" && item.startsWith("effects/"));
  if (sigScenes.length > 1) throw new Error("reference signature may require at most one scene");
  if (sigEffects.length > 1) throw new Error("reference signature may require at most one effect");
  if (sigScenes.length && sigEffects.length)
    throw new Error("reference signature cannot require both a scene and an effect");
  if (signatureMomentCount > 3) throw new Error("reference signature may require at most three moments");
  if (hasSignatureEffect && contract.motion.scene === "auto")
    throw new Error("reference motion.scene auto conflicts with the signature effect; set motion.scene to none");
  const roots = assetRoots(packDir);
  const signature = parseSignature(resolved, roots);
  const hasSet = normalizeHas(page, has);
  const hero = selectHero(resolved, page, hasSet);
  const layout = selectedLayout(
    resolved,
    page,
    signature.map(item => `${item.family}/${item.id}`),
  );
  const entranceMeta = selectEntrance(contract, { has: hasSet, hero, page, tone });
  const sceneMeta = selectScene({ definition: resolved, contract, page, has: hasSet, roots, signature, tone });
  const effect = selectEffect({
    definition: resolved,
    contract,
    page,
    roots,
    signatures: signature,
    scene: sceneMeta,
    tone,
  });
  const moments = selectMoments({
    definition: resolved,
    contract,
    page,
    has: hasSet,
    roots,
    signatures: signature,
    scene: sceneMeta,
    effect,
    tone,
  });
  const scene = sceneMeta ? { id: sceneMeta.id, dir: sceneMeta.dir } : null;
  return {
    planVersion: 2,
    mode: "reference",
    taste: resolved.name,
    page,
    definitionHash: definitionDigest(definition),
    layout,
    contract,
    hero: hero.id,
    ...(hero.form ? { heroForm: hero.form } : {}),
    entrance: entranceMeta.id,
    moments,
    scene,
    effect,
    signature,
  };
}
