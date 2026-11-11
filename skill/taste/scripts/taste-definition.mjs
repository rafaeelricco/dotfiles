import fs from "node:fs";
import path from "node:path";
import { contractRegistry, validateContract } from "./taste-contract.mjs";
import { SKILL } from "./roots.mjs";

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CSS_VAR = /^--[a-zA-Z0-9_-]+$/;
const PURPOSES = new Set(["draft", "guide", "css", "kit", "pack", "build"]);
const RESOLVED = new Set(["css", "kit", "pack", "build"]);
const FAMILIES = ["moments", "scenes", "effects", "ui", "components"];
let HERO_IDS = null;
const heroIds = () => {
  if (HERO_IDS) return HERO_IDS;
  try {
    HERO_IDS = new Set(
      JSON.parse(fs.readFileSync(path.join(SKILL, "assets/layout/heroes.json"), "utf8")).heroes.map(hero => hero.id),
    );
  } catch {
    HERO_IDS = new Set();
  }
  return HERO_IDS;
};

/** Load a pack without consulting its generated design-system.txt. */
export function loadTastePack(dir) {
  const packDir = path.resolve(dir);
  const file = path.join(packDir, "taste.json");
  let definition;
  try {
    definition = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${file}: cannot read taste definition (${error.message})`);
  }
  if (!isObject(definition)) throw new Error(`${file}: taste definition must be a JSON object`);
  if (!hasOwn(definition, "schemaVersion")) return { version: 1, dir: packDir, definition };
  if (definition.schemaVersion !== 2)
    throw new Error(`${file}: unsupported schemaVersion ${JSON.stringify(definition.schemaVersion)}`);
  const findings = validateTaste(definition, { purpose: "draft", packDir });
  if (findings.length) throw new Error(findings.map(f => `${f.path}: ${f.message}`).join("; "));
  return { version: 2, dir: packDir, definition };
}

function fontSourceIssue(source, packDir) {
  if (typeof source !== "string" || !source.trim()) return "must be a non-empty source string";
  const value = source.trim();
  if (/^https:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const extension = /\.(?:css|woff2?|ttf|otf)(?:$|\/)/i.test(url.pathname);
      const googleCss = url.hostname === "fonts.googleapis.com" && url.pathname === "/css2";
      return url.protocol === "https:" && (extension || googleCss) ?
          null
        : "HTTPS font sources must point to CSS or a font file";
    } catch {
      return "must be a valid HTTPS CSS or font URL";
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || path.isAbsolute(value) || value.includes("\\"))
    return "local font sources must be relative pack paths";
  const root = path.resolve(packDir || process.cwd());
  const absolute = path.resolve(root, value);
  const relative = path.relative(root, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`))
    return "local font source must stay inside the pack";
  if (!/\.(?:css|woff2?|ttf|otf)$/i.test(value)) return "local font sources must be CSS or a font file";
  if (packDir) {
    try {
      if (!fs.statSync(absolute).isFile()) return "local font source must be a file";
      const realRoot = fs.realpathSync(root);
      const realFile = fs.realpathSync(absolute);
      const realRelative = path.relative(realRoot, realFile);
      if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`))
        return "local font source must stay inside the pack";
    } catch {
      return "local font source file does not exist in the pack";
    }
  }
  return null;
}

function evidenceFor(definition, field) {
  if (!isObject(definition.evidence)) return null;
  const segments = field.split(".");
  for (let count = segments.length; count > 0; count--) {
    const value = definition.evidence[segments.slice(0, count).join(".")];
    if (value !== undefined) return value;
  }
  return null;
}

function evidenceSourceIssue(source, packDir) {
  if (typeof source !== "string" || !source.trim()) return "must be a non-empty source reference";
  const value = source.trim();
  if (/^https:\/\//i.test(value)) {
    try {
      return new URL(value).protocol === "https:" ? null : "evidence URLs must use HTTPS";
    } catch {
      return "must be a valid HTTPS URL or pack-relative file";
    }
  }
  if (!packDir) return null;
  if (path.isAbsolute(value) || value.includes("\\")) return "evidence files must be pack-relative paths";
  const root = path.resolve(packDir);
  const absolute = path.resolve(root, value);
  const relative = path.relative(root, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`))
    return "evidence file must stay inside the pack";
  try {
    if (!fs.statSync(absolute).isFile()) return "evidence source must be a file";
    const realRoot = fs.realpathSync(root);
    const realFile = fs.realpathSync(absolute);
    const realRelative = path.relative(realRoot, realFile);
    if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`))
      return "evidence file must stay inside the pack";
  } catch {
    return "evidence file does not exist in the pack";
  }
  return null;
}

function checkEvidence(definition, field, add) {
  const evidence = evidenceFor(definition, field);
  if (
    !isObject(evidence)
    || !Array.isArray(evidence.sources)
    || !evidence.sources.length
    || !evidence.sources.every(s => typeof s === "string" && s.trim())
  ) {
    add(`evidence.${field}`, "populated fields require source evidence");
  } else if (typeof evidence.reason !== "string" || !evidence.reason.trim()) {
    add(`evidence.${field}.reason`, "populated fields require an evidence reason");
  }
}

/** Return all schema, evidence and consumer-specific findings as {path,message} records. */
export function validateTaste(definition, { purpose = "draft", packDir = null } = {}) {
  const findings = [];
  const add = (field, message) => findings.push({ path: field, message });
  const isResolved = RESOLVED.has(purpose);
  if (!PURPOSES.has(purpose)) add("purpose", `unknown purpose "${purpose}"`);
  if (!isObject(definition)) return [{ path: "taste.json", message: "must be a JSON object" }];
  if (definition.schemaVersion !== 2) add("schemaVersion", "must equal 2");

  if (typeof definition.name !== "string" || !NAME.test(definition.name)) add("name", "must be a lower-case taste id");
  if (!Array.isArray(definition.source) || !definition.source.every(value => typeof value === "string"))
    add("source", "must be an array of strings");
  if (!Array.isArray(definition.use_when) || !definition.use_when.every(value => typeof value === "string"))
    add("use_when", "must be an array of strings");
  if (
    !isObject(definition.fits)
    || !Object.values(definition.fits).every(
      value => Array.isArray(value) && value.every(item => typeof item === "string"),
    )
  )
    add("fits", "must be an object of string arrays");
  else
    for (const [family, ids] of Object.entries(definition.fits))
      if (!FAMILIES.includes(family)) add(`fits.${family}`, "unknown asset family");
  if (!isObject(definition.variants)) add("variants", "must be an object");
  else {
    if (
      definition.variants.effects !== undefined
      && (!isObject(definition.variants.effects) || !Object.values(definition.variants.effects).every(isObject))
    )
      add("variants.effects", "must be an object of objects");
    if (
      definition.variants.motion !== undefined
      && (!isObject(definition.variants.motion)
        || !Object.values(definition.variants.motion).every(value => typeof value === "string"))
    )
      add("variants.motion", "must be an object of strings");
  }
  if (!Array.isArray(definition.signature) || !definition.signature.every(value => typeof value === "string"))
    add("signature", "must be an array of strings");
  if (
    !isObject(definition.settled)
    || !Object.values(definition.settled).every(
      value => typeof value === "string" || (Array.isArray(value) && value.every(item => typeof item === "string")),
    )
  )
    add("settled", "must be an object of strings or string arrays");
  if (definition.heroes !== undefined) {
    if (!Array.isArray(definition.heroes) || !definition.heroes.every(value => typeof value === "string"))
      add("heroes", "must be an array of hero ids");
    else for (const id of definition.heroes) if (!heroIds().has(id)) add("heroes", `unknown hero "${id}"`);
  }

  const tokens = definition.tokens;
  if (!isObject(tokens)) add("tokens", "must be an object");
  const colors = isObject(tokens) ? tokens.colors : null;
  if (!isObject(colors)) add("tokens.colors", "must be an object");
  else {
    for (const mode of ["light", "dark"]) {
      const palette = colors[mode];
      if (mode === "dark" && palette === null) continue;
      if (!isObject(palette)) {
        add(`tokens.colors.${mode}`, mode === "dark" ? "must be null or an object" : "must be an object");
        continue;
      }
      for (const [name, value] of Object.entries(palette)) {
        const field = `tokens.colors.${mode}.${name}`;
        if (!CSS_VAR.test(name)) add(field, "map keys must be CSS custom property names");
        if (value !== null && (typeof value !== "string" || !value.trim()))
          add(field, "must be a non-empty string or null");
        if (typeof value === "string" && /[;{}<>\r\n]/.test(value)) add(field, "contains a CSS declaration boundary");
        if (value !== null) checkEvidence(definition, field, add);
      }
    }
  }

  for (const key of ["typography", "dimensions"]) {
    const map = isObject(tokens) ? tokens[key] : null;
    if (!isObject(map)) {
      add(`tokens.${key}`, "must be a map object");
      continue;
    }
    for (const [name, value] of Object.entries(map)) {
      const field = `tokens.${key}.${name}`;
      if (!CSS_VAR.test(name)) add(field, "map keys must be CSS custom property names");
      if (value !== null && (typeof value !== "string" || !value.trim()))
        add(field, "must be a non-empty string or null");
      if (typeof value === "string" && /[;{}<>\r\n]/.test(value)) add(field, "contains a CSS declaration boundary");
      if (value !== null) checkEvidence(definition, field, add);
    }
  }

  const surfaces = isObject(tokens) ? tokens.surfaces : null;
  if (!isObject(surfaces)) add("tokens.surfaces", "must be a map object");
  else {
    for (const [name, surface] of Object.entries(surfaces)) {
      if (!/^[a-z][a-z0-9-]*$/.test(name)) add(`tokens.surfaces.${name}`, "surface names must be lower-case ids");
      if (!isObject(surface)) {
        add(`tokens.surfaces.${name}`, "must be an object");
        continue;
      }
      for (const [property, value] of Object.entries(surface)) {
        const field = `tokens.surfaces.${name}.${property}`;
        if (!/^-?[a-z][a-zA-Z0-9-]*$/.test(property)) add(field, "surface properties must be CSS property names");
        if (value !== null && (typeof value !== "string" || !value.trim()))
          add(field, "must be a non-empty string or null");
        if (typeof value === "string" && /[;{}<>\r\n]/.test(value)) add(field, "contains a CSS declaration boundary");
        if (value !== null) checkEvidence(definition, field, add);
      }
    }
  }

  const fonts = definition.fonts;
  if (!isObject(fonts) || !isObject(fonts.roles)) add("fonts.roles", "must be a map object");
  else {
    for (const [role, face] of Object.entries(fonts.roles)) {
      const field = `fonts.roles.${role}`;
      if (!/^[a-z][a-z0-9-]*$/.test(role)) add(field, "role names must be lower-case ids");
      if (!isObject(face)) {
        add(field, "must be an object");
        continue;
      }
      if (!(face.family === null || (typeof face.family === "string" && face.family.trim())))
        add(`${field}.family`, "must be a string or null");
      if (typeof face.family === "string" && /[;{}<>\r\n]/.test(face.family))
        add(`${field}.family`, "contains a CSS declaration boundary");
      for (const key of ["sources", "fallbacks"]) {
        if (!Array.isArray(face[key]) || !face[key].every(value => typeof value === "string" && value.trim())) {
          add(`${field}.${key}`, "must be an array of non-empty strings");
          continue;
        }
        for (let index = 0; index < face[key].length; index++) {
          const item = face[key][index];
          if (key === "sources") {
            const issue = fontSourceIssue(item, packDir);
            if (issue) add(`${field}.sources.${index}`, issue);
          } else if (/[;{}<>\r\n]/.test(item)) {
            add(`${field}.fallbacks.${index}`, "contains a CSS declaration boundary");
          }
        }
      }
      if (face.family !== null || face.sources?.length || face.fallbacks?.length) checkEvidence(definition, field, add);
    }
  }

  const guidance = definition.guidance;
  if (!isObject(guidance)) add("guidance", "must be an object");
  else {
    if (!(guidance.character === null || (typeof guidance.character === "string" && guidance.character.trim())))
      add("guidance.character", "must be a string or null");
    if (guidance.character !== null) checkEvidence(definition, "guidance.character", add);
    if ((purpose === "pack" || purpose === "build") && !guidance.character)
      add("guidance.character", "required for a complete taste pack");
    for (const key of ["usage", "composition", "adaptations"]) {
      if (!Array.isArray(guidance[key]) || !guidance[key].every(value => typeof value === "string" && value.trim())) {
        add(`guidance.${key}`, "must be an array of non-empty strings");
        continue;
      }
      if (
        (purpose === "pack" || purpose === "build")
        && ["usage", "composition"].includes(key)
        && guidance[key].length === 0
      )
        add(`guidance.${key}`, "requires at least one reviewed entry for a complete taste pack");
      if (guidance[key].length) checkEvidence(definition, `guidance.${key}`, add);
    }
  }

  const evidence = definition.evidence;
  if (!isObject(evidence)) add("evidence", "must be an object keyed by field paths");
  else {
    for (const [field, item] of Object.entries(evidence)) {
      if (!/^[a-z][a-zA-Z0-9_.-]*$/.test(field)) add(`evidence.${field}`, "key must be a field path");
      if (!isObject(item)) {
        add(`evidence.${field}`, "must be an object");
        continue;
      }
      if (
        !Array.isArray(item.sources)
        || !item.sources.length
        || !item.sources.every(value => typeof value === "string" && value.trim())
      ) {
        add(`evidence.${field}.sources`, "requires one or more source references");
      } else {
        for (let index = 0; index < item.sources.length; index++) {
          const issue = evidenceSourceIssue(item.sources[index], packDir);
          if (issue) add(`evidence.${field}.sources.${index}`, issue);
        }
      }
      if (typeof item.reason !== "string" || !item.reason.trim()) add(`evidence.${field}.reason`, "requires a reason");
    }
  }

  // Every emitted root custom property has exactly one definition.
  const emitted = new Map();
  const claim = (name, field, value) => {
    if (value === null || value === undefined) return;
    if (emitted.has(name)) add(field, `duplicates custom property ${name} from ${emitted.get(name)}`);
    else emitted.set(name, field);
  };
  for (const [block, values] of [
    ["colors.light", tokens?.colors?.light],
    ["typography", tokens?.typography],
    ["dimensions", tokens?.dimensions],
  ])
    if (isObject(values))
      for (const [name, value] of Object.entries(values)) claim(name, `tokens.${block}.${name}`, value);
  if (isObject(fonts?.roles))
    for (const [role, face] of Object.entries(fonts.roles)) {
      claim(`--font-${role}`, `fonts.roles.${role}`, face?.family);
      if (role === "body") claim("--font-text", `fonts.roles.${role}`, face?.family);
      if (role === "heading") claim("--font-display", `fonts.roles.${role}`, face?.family);
    }
  if (isObject(surfaces))
    for (const [name, properties] of Object.entries(surfaces))
      if (isObject(properties))
        for (const [property, value] of Object.entries(properties))
          claim(
            `--surface-${name}-${property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`,
            `tokens.surfaces.${name}.${property}`,
            value,
          );

  if (isResolved) {
    const light = definition.tokens?.colors?.light;
    const typography = definition.tokens?.typography;
    const requirements = [
      ["--p-bg", "colors.light", light],
      ["--p-ink", "colors.light", light],
      ["--t-h1", "typography", typography],
      ["--t-h2", "typography", typography],
      ["--t-body", "typography", typography],
    ];
    if (purpose !== "css") {
      for (const name of ["--p-surface", "--p-muted", "--p-accent", "--p-accent-ink", "--p-action", "--p-action-ink"])
        requirements.push([name, "colors.light", light]);
      for (const name of ["--container", "--nav"])
        requirements.push([name, "dimensions", definition.tokens?.dimensions]);
    }
    for (const [name, block, values] of requirements)
      if (typeof values?.[name] !== "string" || !values[name].trim())
        add(`tokens.${block}.${name}`, "required canonical token for this output purpose");
    if (definition.tokens?.colors?.dark !== null) {
      const dark = definition.tokens?.colors?.dark;
      const darkRequired =
        purpose === "css" ?
          ["--p-bg", "--p-ink"]
        : [
            "--p-bg",
            "--p-surface",
            "--p-ink",
            "--p-muted",
            "--p-accent",
            "--p-accent-ink",
            "--p-action",
            "--p-action-ink",
          ];
      for (const name of darkRequired)
        if (typeof dark?.[name] !== "string" || !dark[name].trim())
          add(`tokens.colors.dark.${name}`, "required canonical token for an explicit dark palette");
    }
    for (const role of new Set(["body", "heading", ...Object.keys(definition.fonts?.roles || {})])) {
      const face = definition.fonts?.roles?.[role];
      if (!["body", "heading"].includes(role) && face?.family === null) continue;
      if (!isObject(face) || typeof face.family !== "string" || !face.family.trim())
        add(`fonts.roles.${role}`, "required typography role for CSS and kit output");
      if (!isObject(face) || !Array.isArray(face.fallbacks))
        add(`fonts.roles.${role}.fallbacks`, "requires an explicit fallback array");
      const generic =
        typeof face?.family === "string"
        && /^(?:system-ui|sans-serif|serif|monospace|ui-sans-serif|ui-serif|ui-monospace|arial|georgia|helvetica|verdana|tahoma|courier(?: new)?|times(?: new roman)?)$/i.test(
          face.family,
        );
      if (face && !generic && (!face.sources?.length || !face.fallbacks?.length))
        add(`fonts.roles.${role}`, "custom fonts require an explicit source and fallback");
    }
    const usesDarkBand =
      (Array.isArray(definition.layout?.bands) && definition.layout.bands.includes("dark"))
      || (Array.isArray(definition.layout?.footer) && definition.layout.footer.includes("footer-dark"))
      || (Array.isArray(definition.layout?.compositions?.statement)
        && definition.layout.compositions.statement.includes("statement-type"));
    if (purpose !== "css" && usesDarkBand)
      for (const name of [
        "--p-inv-bg",
        "--p-inv-surface",
        "--p-inv-ink",
        "--p-inv-muted",
        "--p-inv-accent",
        "--p-inv-accent-ink",
        "--p-inv-action",
        "--p-inv-action-ink",
      ])
        if (typeof light?.[name] !== "string" || !light[name].trim())
          add(`tokens.colors.light.${name}`, "required when the taste uses dark bands");
  }

  try {
    for (const finding of validateContract(definition, contractRegistry(packDir))) add(finding.path, finding.message);
  } catch (error) {
    add("layout", `contract validation failed: ${error.message}`);
  }
  return findings;
}

/** Deterministic, read-only resolution for a consumer. */
export function resolveTaste(definition, { purpose = "draft", packDir = null } = {}) {
  const findings = validateTaste(definition, { purpose, packDir });
  if (findings.length) throw new Error(findings.map(f => `${f.path}: ${f.message}`).join("; "));
  return structuredClone(definition);
}
