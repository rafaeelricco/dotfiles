import crypto from "node:crypto";
import fs from "node:fs";

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
const COMPOSITION_CLASS = Object.freeze({
  mirrored: "grid--mirror",
  "bleed-panel": "comp-bleed",
  "offset-pair": "comp-offset",
  "three-up": "comp-three",
  "street-large": "type-moment",
  "statement-short": "statement--short",
  "close-form": "close--form",
});
// A marker that belongs to exactly one section type can be ordered within that group. Shared markers stay count-only.
const UNIQUE_COMPOSITION_GROUP = Object.freeze({ "street-large": "visit", "statement-short": "statement" });

// Keep this registry narrow. These checks describe individual visual preferences in the house style;
// layout and content checks (including section-air and the height/neighbour families) remain blocking.
export const HOUSE_AESTHETIC_CHECKS = Object.freeze(
  new Set([
    "action-count",
    "button-styles",
    "same-action",
    "heading-align",
    "centre-axis",
    "nesting",
    "section-rules",
    "left-lines",
  ]),
);

export function definitionDigest(definition) {
  return crypto.createHash("sha256").update(JSON.stringify(definition)).digest("hex");
}

export function planDigest(plan) {
  return crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}

export function definitionFreshnessFindings(plan, definition) {
  if (!plan || plan.planVersion !== 2 || plan.mode !== "reference") return [];
  const actual = definition ? definitionDigest(definition) : null;
  if (actual && actual === plan.definitionHash) return [];
  return [
    {
      check: "build-plan",
      where: `taste ${plan.taste || "(missing)"} definition`,
      msg:
        actual ?
          `the persisted reference plan has definition hash ${plan.definitionHash}, but the current taste definition hashes to ${actual}`
        : "the current reference taste definition could not be loaded",
      fix: `rerun start.mjs plan --taste ${plan.taste || "<name>"} and rebuild from the refreshed persisted plan`,
      hard: true,
    },
  ];
}

export function validateBuildPlan(plan) {
  const errors = [];
  const fail = (field, message) => errors.push({ field, message });
  if (!object(plan)) return [{ field: "deal", message: "must be a JSON object" }];
  for (const field of [
    "planVersion",
    "mode",
    "taste",
    "page",
    "definitionHash",
    "layout",
    "contract",
    "hero",
    "entrance",
    "moments",
    "scene",
    "effect",
    "signature",
  ])
    if (!Object.hasOwn(plan, field)) fail(field, "is required in a V2 plan");
  if (plan.planVersion !== 2) fail("planVersion", "must be 2");
  if (!new Set(["house", "reference"]).has(plan.mode)) fail("mode", 'must be "house" or "reference"');
  if (plan.mode === "reference") {
    if (typeof plan.taste !== "string" || !NAME.test(plan.taste))
      fail("taste", "reference mode requires a valid taste name");
    if (typeof plan.definitionHash !== "string" || !/^[a-f0-9]{64}$/i.test(plan.definitionHash))
      fail("definitionHash", "reference mode requires a SHA-256 definition hash");
  } else {
    if (plan.taste !== null && plan.taste !== undefined) fail("taste", "house mode cannot name a reference taste");
    if (plan.definitionHash !== null && plan.definitionHash !== undefined)
      fail("definitionHash", "house mode cannot name a reference definition hash");
  }
  if (typeof plan.page !== "string" || !plan.page.trim()) fail("page", "must name the planned page kind");
  if (!object(plan.layout)) fail("layout", "must be an object of persisted layout choices");
  else {
    if (
      plan.layout.bands !== undefined
      && (!Array.isArray(plan.layout.bands) || plan.layout.bands.some(x => typeof x !== "string"))
    )
      fail("layout.bands", "must be an array of persisted band ids");
    if (plan.layout.compositions !== undefined) {
      if (!object(plan.layout.compositions)) fail("layout.compositions", "must be an object of composition sequences");
      else
        for (const [section, sequence] of Object.entries(plan.layout.compositions))
          if (!Array.isArray(sequence) || sequence.some(x => typeof x !== "string"))
            fail(`layout.compositions.${section}`, "must be an ordered array of composition ids");
    }
  }
  if (!object(plan.contract)) fail("contract", "must be the persisted resolved contract");
  else {
    if (!object(plan.contract.layout)) fail("contract.layout", "must be an object");
    else {
      if (!["screens", "flow"].includes(plan.contract.layout.rhythm))
        fail("contract.layout.rhythm", 'must be "screens" or "flow"');
      if (!["left", "center"].includes(plan.contract.layout.headingAlign))
        fail("contract.layout.headingAlign", 'must be "left" or "center"');
    }
    if (!object(plan.contract.motion)) fail("contract.motion", "must be an object");
    else {
      const motion = plan.contract.motion;
      if (!Number.isInteger(motion.moments) || motion.moments < 0 || motion.moments > 3)
        fail("contract.motion.moments", "must be an integer from 0 through 3");
      if (typeof motion.entrance !== "string" || !motion.entrance.trim())
        fail("contract.motion.entrance", "must name a resolved entrance");
      if (!["none", "auto"].includes(motion.scene)) fail("contract.motion.scene", 'must be "none" or "auto"');
      if (!["none", "auto"].includes(motion.effect)) fail("contract.motion.effect", 'must be "none" or "auto"');
      if (!["none", "default"].includes(motion.reveal)) fail("contract.motion.reveal", 'must be "none" or "default"');
      if (!["static", "loop"].includes(motion.fragmentPlayback))
        fail("contract.motion.fragmentPlayback", 'must be "static" or "loop"');
    }
  }
  if (typeof plan.hero !== "string" || !plan.hero.trim()) fail("hero", "must name the planned hero");
  if (typeof plan.entrance !== "string" || !plan.entrance.trim()) fail("entrance", "must name the planned entrance");
  if (!Array.isArray(plan.moments) || plan.moments.some(x => !object(x) || typeof x.id !== "string" || !x.id.trim()))
    fail("moments", "must be an array of identified dealt moments");
  for (const field of ["scene", "effect"])
    if (plan[field] !== null && (!object(plan[field]) || typeof plan[field].id !== "string" || !plan[field].id.trim()))
      fail(field, "must be null or an identified dealt item");
  if (
    !Array.isArray(plan.signature)
    || plan.signature.some(x => !object(x) || typeof x.family !== "string" || typeof x.id !== "string")
  )
    fail("signature", "must be an array of family and id pairs");
  if (object(plan.contract?.motion)) {
    if (plan.contract.motion.moments === 0 && Array.isArray(plan.moments) && plan.moments.length)
      fail("moments", "cannot name moments when the resolved contract requires zero");
    if (plan.contract.motion.scene === "none" && plan.scene != null)
      fail("scene", "cannot name a scene when the resolved contract selects none");
    if (plan.contract.motion.effect === "none" && plan.effect != null)
      fail("effect", "cannot name an effect when the resolved contract selects none");
  }
  return errors;
}

// Missing arguments mean the caller is on a legacy build. A named but missing/unreadable plan is an error:
// a typo must never let a page's own attributes select a weaker policy.
export function readBuildPlan(file = null) {
  if (file == null) return null;
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`could not read build plan ${file}: ${error.message}`);
  }
  const errors = validateBuildPlan(plan);
  if (errors.length)
    throw new Error(`invalid build plan ${file}: ${errors.map(x => `${x.field} ${x.message}`).join("; ")}`);
  return plan;
}

const htmlAttrs = tag =>
  Object.fromEntries(
    [...String(tag || "").matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [
      m[1].toLowerCase(),
      m[2] ?? m[3] ?? m[4],
    ]),
  );

export function pagePlanFindings(plan, html) {
  if (!plan || plan.planVersion !== 2 || !String(html ?? "").trim()) return [];
  const out = [];
  const hard = (check, where, msg, fix) => out.push({ check, where, msg, fix, hard: true });
  const source = String(html).replace(/<!--[\s\S]*?-->/g, "");
  const tag = source.match(/<html\b[^>]*>/i)?.[0] || "";
  const attrs = htmlAttrs(tag);
  const modeAttrs = [...tag.matchAll(/\bdata-build-mode\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)];
  const actualMode = (modeAttrs[0]?.[1] ?? modeAttrs[0]?.[2] ?? modeAttrs[0]?.[3] ?? "").trim().toLowerCase();
  if (actualMode !== plan.mode || modeAttrs.length !== 1)
    hard(
      "build-plan",
      "html[data-build-mode]",
      `the persisted plan is mode "${plan.mode}", but <html data-build-mode> is ${actualMode ? `"${actualMode}"` : "missing"}${modeAttrs.length > 1 ? ` (${modeAttrs.length} declarations)` : ""}`,
      `set data-build-mode="${plan.mode}" from the persisted .taste-skill/deal.json`,
    );

  let actualTaste = null;
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    const a = htmlAttrs(match[0]);
    if ((a.name || "").trim().toLowerCase() === "taste") {
      actualTaste = (a.content || "").trim().toLowerCase();
      if (actualTaste) break;
    }
  }
  const expectedTaste = typeof plan.taste === "string" ? plan.taste.toLowerCase() : null;
  if (actualTaste !== expectedTaste)
    hard(
      "build-plan",
      "meta[name=taste]",
      `the persisted plan ${expectedTaste ? `names taste "${expectedTaste}"` : "has no reference taste"}, but the page ${actualTaste ? `names "${actualTaste}"` : "has no taste identity"}`,
      expectedTaste ?
        `set <meta name="taste" content="${expectedTaste}"> from the persisted plan`
      : "remove the page's taste meta to match its persisted house plan",
    );
  return out;
}

function withoutTemplates(source) {
  let out = "",
    depth = 0,
    at = 0;
  for (const match of source.matchAll(/<(\/?)template\b[^>]*>/gi)) {
    if (!match[1]) {
      if (!depth) out += source.slice(at, match.index);
      depth++;
    } else if (depth && !--depth) at = match.index + match[0].length;
  }
  return depth ? out : out + source.slice(at);
}

function parsedAttrs(tag) {
  return Object.fromEntries(
    [...String(tag || "").matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [
      m[1].toLowerCase(),
      m[2] ?? m[3] ?? m[4],
    ]),
  );
}

const classTokens = source => {
  const out = [];
  for (const match of source.matchAll(/<[a-z][^>]*\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    for (const name of value.split(/\s+/).filter(Boolean)) out.push({ name, at: match.index });
  }
  return out;
};

const quotedOrBare = (source, name) => {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "gi");
  return [...source.matchAll(re)].map(match => (match[1] ?? match[2] ?? match[3] ?? "").trim());
};
const hasAttrValue = (source, name, expected) => quotedOrBare(source, name).some(value => value === expected);
const hardFinding = (where, msg, fix) => ({ check: "build-plan", where, msg, fix, hard: true });

/**
 * Check reference-plan selections with unambiguous markup markers.
 * Shared nav-mega/nav-cards and compositions such as split-6-6 have no unique marker, so
 * those choices remain for visual review instead of adding invented attributes.
 */
export function planMarkupFindings(plan, html) {
  if (!plan || plan.planVersion !== 2 || plan.mode !== "reference" || !String(html ?? "").trim()) return [];
  let source = String(html).replace(/<!--[\s\S]*?-->/g, "");
  source = withoutTemplates(source);
  source = source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const findings = [];
  const add = (where, expected, actual, fix) =>
    findings.push(
      hardFinding(where, `the persisted reference plan selects ${expected}, but the page builds ${actual}`, fix),
    );
  const htmlTag = source.match(/<html\b[^>]*>/i)?.[0] || "";
  const rootAttrs = parsedAttrs(htmlTag);
  const layout = plan.layout || {};
  const tokens = classTokens(source);
  const hasClass = name => tokens.some(token => token.name === name);
  const heroTag = [...source.matchAll(/<(?:section|header)\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => {
      const classes = (parsedAttrs(tag).class || "").split(/\s+/);
      return classes.includes("hero");
    });
  const heroAttrs = parsedAttrs(heroTag || "");
  const heroVariant =
    (heroAttrs.class || "")
      .split(/\s+/)
      .find(name => name.startsWith("hero--"))
      ?.slice(6) || "";
  if (!heroTag || heroVariant !== plan.hero)
    add(
      `hero ${plan.hero}`,
      `hero--${plan.hero}`,
      heroVariant ? `hero--${heroVariant}` : "no identifiable hero variant",
      `build the planned hero ${plan.hero} from its layout demo`,
    );
  const entrance = (heroAttrs["data-enter"] || "").trim();
  if (entrance !== plan.entrance)
    add(
      `hero entrance ${plan.entrance}`,
      `data-enter="${plan.entrance}"`,
      entrance ? `data-enter="${entrance}"` : "no data-enter on the hero",
      `set data-enter="${plan.entrance}" on the hero`,
    );
  if (plan.heroForm) {
    const form = (heroAttrs["data-form"] || "band").trim().toLowerCase();
    if (form !== plan.heroForm)
      add(
        `hero form ${plan.heroForm}`,
        `data-form="${plan.heroForm}"`,
        `data-form="${form}"`,
        `set data-form="${plan.heroForm}" on the place hero`,
      );
  }

  if (layout.buttons && rootAttrs["data-buttons"] !== layout.buttons)
    add(
      `html data-buttons`,
      `data-buttons="${layout.buttons}"`,
      rootAttrs["data-buttons"] ? `data-buttons="${rootAttrs["data-buttons"]}"` : "no data-buttons",
      `set data-buttons="${layout.buttons}" on <html>`,
    );

  if (layout.mark) {
    const rootMark = (rootAttrs["data-mark"] || "").trim();
    const childMarks = [...source.matchAll(/<[a-z][^>]*>/gi)]
      .filter(match => !/^<html\b/i.test(match[0]))
      .flatMap(match => {
        const value = parsedAttrs(match[0])["data-mark"];
        return value ? [value.trim()] : [];
      });
    const declared = rootMark === layout.mark || childMarks.includes(layout.mark);
    if (layout.mark === "wordmark") {
      if (
        rootMark !== layout.mark
        || !declared
        || childMarks.some(value => value !== "wordmark")
        || hasClass("mark--initial")
      )
        add(
          "brand mark",
          'data-mark="wordmark" without a visible mark',
          `root data-mark=${rootMark || "missing"}${childMarks.length ? `; child data-mark=${childMarks.join(",")}` : ""}`,
          'keep data-mark="wordmark" as plan metadata and remove any visible mark',
        );
    } else if (layout.mark === "initial") {
      if (rootMark !== layout.mark || !declared || !hasClass("mark--initial"))
        add(
          "brand mark",
          'data-mark="initial" and mark--initial',
          `root data-mark=${rootMark || "missing"}${hasClass("mark--initial") ? "" : "; no mark--initial child"}`,
          'use data-mark="initial" and the planned initial mark in the header and footer',
        );
    } else if (rootMark !== layout.mark || !declared || childMarks.some(value => value !== layout.mark))
      add(
        "brand mark",
        `data-mark="${layout.mark}"`,
        `root data-mark=${rootMark || "missing"}${childMarks.length ? `; child data-mark=${childMarks.join(",")}` : ""}`,
        `set data-mark="${layout.mark}" on <html> and each visible brand mark`,
      );
  }

  const componentIds = new Set(
    (plan.signature || []).filter(item => item.family === "components").map(item => item.id),
  );
  for (const key of ["nav", "footer", "close"])
    if (typeof layout[key] === "string" && layout[key].startsWith("components/"))
      componentIds.add(layout[key].slice("components/".length));
  for (const id of componentIds)
    if (!hasAttrValue(source, "data-component", id))
      add(
        `component ${id}`,
        `data-component="${id}"`,
        "no matching component mount",
        `mount the planned component with data-component="${id}"`,
      );

  const nav = layout.nav;
  if (nav === "nav-centre" && !hasClass("nav--centre"))
    add("navigation", nav, "no nav--centre class", "use the centred navigation class");
  if (nav === "nav-split" && !hasClass("nav--split"))
    add("navigation", nav, "no nav--split class", "use the split navigation class");

  const footerTag = [...source.matchAll(/<footer\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => /\bfooter\b/.test(parsedAttrs(tag).class || ""));
  const footerClasses = (parsedAttrs(footerTag || "").class || "").split(/\s+/);
  if (typeof layout.footer === "string" && layout.footer.startsWith("footer-")) {
    const variants = ["footer--dark", "footer--statement", "footer--visit"];
    if (layout.footer === "footer-columns") {
      const actual =
        variants.find(name => footerClasses.includes(name)) || (footerTag ? "footer-columns" : "no footer");
      if (!footerTag || actual !== "footer-columns")
        add("footer type", layout.footer, actual, "build the planned footer class type");
    } else {
      const expectedClass = layout.footer.replace(/^footer-/, "footer--");
      if (!footerTag || !footerClasses.includes(expectedClass))
        add(
          "footer type",
          layout.footer,
          footerTag ? footerClasses.find(name => variants.includes(name)) || "footer-columns" : "no footer",
          `use class="footer ${expectedClass}" on the footer`,
        );
    }
  }

  const close = layout.close;
  const knownClose = new Set(["close-type", "close-photo", "close-word", "close-split", "close-form"]);
  if (typeof close === "string" && knownClose.has(close)) {
    const expectedClass = close.replace(/^close-/, "close--");
    if (!hasClass(expectedClass))
      add(`closing form ${close}`, close, "no matching close class", `use class="${expectedClass}" on .closing__cta`);
  }

  const actualEffects = [...new Set(quotedOrBare(source, "data-fx").filter(Boolean))];
  const expectedEffect = plan.effect?.id || null;
  if (expectedEffect && !actualEffects.includes(expectedEffect))
    add(
      `effect ${expectedEffect}`,
      `data-fx="${expectedEffect}"`,
      "no matching effect mount",
      `mount the planned effect with data-fx="${expectedEffect}"`,
    );
  for (const id of actualEffects)
    if (id !== expectedEffect)
      add(
        `unplanned effect ${id}`,
        "only the persisted effect selection",
        `data-fx="${id}"`,
        "remove the extra effect or update the persisted reference contract",
      );

  const actualMoments = [...new Set(quotedOrBare(source, "data-moment").filter(Boolean))];
  const expectedMoments = new Set((plan.moments || []).map(item => item.id));
  for (const item of expectedMoments)
    if (!actualMoments.includes(item))
      add(
        `moment ${item}`,
        `data-moment="${item}"`,
        "no matching moment mount",
        `mount the planned moment with data-moment="${item}"`,
      );
  for (const id of actualMoments)
    if (!expectedMoments.has(id))
      add(
        `unplanned moment ${id}`,
        "only the persisted moment selections",
        `data-moment="${id}"`,
        "remove the extra moment or update the persisted reference contract",
      );

  const actualScenes = [...new Set(quotedOrBare(source, "data-big-scene").filter(Boolean))];
  const expectedScene = plan.scene?.id || null;
  if (expectedScene && !actualScenes.includes(expectedScene))
    add(
      `scene ${expectedScene}`,
      `data-big-scene="${expectedScene}"`,
      "no matching scene mount",
      `mount the planned scene with data-big-scene="${expectedScene}"`,
    );
  for (const id of actualScenes)
    if (id !== expectedScene)
      add(
        `unplanned scene ${id}`,
        "only the persisted scene selection",
        `data-big-scene="${id}"`,
        "remove the extra scene or update the persisted reference contract",
      );

  const expectedCounts = new Map();
  const compositionGroups = layout.compositions || {};
  for (const sequence of Object.values(compositionGroups))
    if (Array.isArray(sequence))
      for (const id of sequence) if (COMPOSITION_CLASS[id]) expectedCounts.set(id, (expectedCounts.get(id) || 0) + 1);
  const actualIds = tokens
    .filter(token => Object.values(COMPOSITION_CLASS).includes(token.name))
    .map(token => Object.entries(COMPOSITION_CLASS).find(([, className]) => className === token.name)?.[0])
    .filter(Boolean);
  const expectedOrder = Object.values(compositionGroups).flatMap(sequence =>
    Array.isArray(sequence) ? sequence.filter(id => COMPOSITION_CLASS[id]) : [],
  );
  for (const [id, expectedCount] of expectedCounts) {
    const actualCount = actualIds.filter(actualId => actualId === id).length;
    if (actualCount !== expectedCount)
      add(
        `composition marker ${id}`,
        `${id} ${expectedCount} ${expectedCount === 1 ? "time" : "times"} (planned sequence: ${expectedOrder.join(" → ") || "none"})`,
        `${id} ${actualCount} ${actualCount === 1 ? "time" : "times"} (page sequence: ${actualIds.join(" → ") || "none"})`,
        "match the persisted count for this identifiable composition marker",
      );
  }
  for (const [group, sequence] of Object.entries(compositionGroups)) {
    if (!Array.isArray(sequence)) continue;
    const expectedOrder = sequence.filter(id => UNIQUE_COMPOSITION_GROUP[id] === group);
    const actualOrder = actualIds.filter(id => UNIQUE_COMPOSITION_GROUP[id] === group);
    if (
      expectedOrder.length > 1
      && (expectedOrder.length !== actualOrder.length || expectedOrder.some((id, index) => id !== actualOrder[index]))
    )
      add(
        `composition order ${group}`,
        expectedOrder.join(" → "),
        actualOrder.join(" → ") || "no uniquely attributable markers",
        `match the persisted order for uniquely identifiable ${group} compositions`,
      );
  }
  return findings;
}

// Classify raw findings before mergeFamilies: an aesthetic member of a mixed family becomes advisory by itself,
// leaving every technical/unknown sibling in the blocking list.
export function classifyBuildFindings(findings, mode) {
  const blocked = [],
    advisory = [];
  for (const finding of findings || []) {
    if (mode === "reference" && !finding.hard && HOUSE_AESTHETIC_CHECKS.has(finding.check)) advisory.push(finding);
    else blocked.push(finding);
  }
  return { blocked, advisory };
}
