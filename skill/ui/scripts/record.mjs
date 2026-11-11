#!/usr/bin/env node
/*
  record.mjs - a site's design system as one file (references/record.md).
    node record.mjs <url>... [--name <name>] [--force]          capture, shoot, write the pack
    node record.mjs <url>... --name <name> --keep-doc           capture a saved taste again; its design-system.txt stays
    node record.mjs --from <capture.json>... --name <name> [--force]   write from saved captures (no browser)
    node record.mjs list                                         name, date, intro line and use_when of every taste
    node record.mjs css <name> [--out <file>]                    tokens as :root { } and .dark, [data-theme="dark"] { }
    node record.mjs kit <name>                                   the taste kit's head block (fonts, stylesheets, :root) from the taste
    node record.mjs guide <name>                                 regenerate a v2 guide from taste.json
  A recorded URL writes <root>/<name>/: design-system.txt, shots/, capture/ (css/, <page>.html, <page>.json, frames/,
  candidates.json) and, when missing, taste.json (never overwritten, not even with --force). --from writes design-system.txt
  and taste.json only, and prints how many candidates the given captures hold.
  --root <dir> replaces <skill>/tastes. Exit 2: bad arguments, an unknown name, or a name that exists without --force.
*/
import { correctedText } from "./record-corrections.mjs";
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromeOrExit } from "../../taste/scripts/roots.mjs";
import { loadTastePack, resolveTaste } from "../../taste/scripts/taste-contract.mjs";
import { renderTasteGuide, serializeTasteCss, serializeTasteKit } from "../../taste/scripts/taste-output.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CAPTURE = fs.readFileSync(path.join(here, "record-capture.js"), "utf8");
const MOTION = fs.readFileSync(path.join(here, "record-motion.js"), "utf8");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VIEWS = [
  [1440, 900],
  [390, 844],
];
const MAX_SHOT = 12000;
const SCROLL = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 1; i <= 40; i++) {
    const max = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo({ top: Math.min(i * innerHeight, Math.max(0, max)), behavior: "instant" });
    await wait(250);
    if (i * innerHeight >= max) break;
  }
  return true;
})()`;
const IMAGES = `(async () => {
  const end = Date.now() + 4000;
  while (Date.now() < end && !Array.from(document.images).every(i => i.complete)) await new Promise(r => setTimeout(r, 100));
  window.scrollTo({ top: 0, behavior: "instant" });
  return true;
})()`;
const ROLE_ORDER = ["h1", "h2", "h3", "body", "small", "button", "nav"];

/* ---------------------------------------------------------------- arguments */
function fail(message) {
  console.error(`record: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const o = { _: [], from: [], force: false, keepDoc: false, name: null, root: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") o.force = true;
    else if (a === "--keep-doc") o.keepDoc = true;
    else if (a === "--from") {
      while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) o.from.push(argv[++i]);
      if (!o.from.length) fail("--from needs at least one capture file");
    } else if (a === "--name" || a === "--root" || a === "--out") {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) fail(`${a} needs a value`);
      o[a.slice(2)] = v;
    } else if (a.startsWith("--")) fail(`unknown option ${a}`);
    else o._.push(a);
  }
  return o;
}

function httpUrl(text) {
  let u = null;
  try {
    u = new URL(text);
  } catch {
    fail(`not a URL: ${text}`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") fail(`only http(s) URLs can be recorded: ${text}`);
  return u;
}

function checkName(name) {
  if (!NAME.test(name)) fail(`a name is lower-case letters, digits and dashes: ${name}`);
  return name;
}

// "https://www.raycast.com/keyboard" -> "raycast"; [a-z0-9-] only
function nameOf(url) {
  const host = new URL(url).hostname;
  if (/^[\d.]+$|:/.test(host)) return "site";
  const parts = host
    .toLowerCase()
    .split(".")
    .filter(p => p && p !== "www");
  const generic = new Set(["co", "com", "org", "net", "gov", "ac", "edu"]);
  let pick = parts[0] || "";
  if (parts.length >= 2) pick = parts[parts.length - 2];
  if (parts.length >= 3 && generic.has(pick)) pick = parts[parts.length - 3];
  return pick.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "site";
}

const slug = p =>
  p
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "home";

/* ---------------------------------------------------------------- captures */
const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

function norm(c) {
  if (!c || typeof c !== "object" || Array.isArray(c)) fail("a capture file holds one JSON object");
  const arr = v => (Array.isArray(v) ? v : []);
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const colour = (v, d) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : d);
  const r = c.roles && typeof c.roles === "object" ? c.roles : {};
  const l = c.layout && typeof c.layout === "object" ? c.layout : {};
  const k = c.components && typeof c.components === "object" ? c.components : {};
  return {
    scheme: c.scheme === "dark" ? "dark" : "light",
    captured: typeof c.captured === "string" ? c.captured : new Date().toISOString().slice(0, 10),
    path: typeof c.path === "string" && c.path.startsWith("/") ? c.path : "/",
    source:
      typeof c.source === "string" ? c.source
      : typeof c.url === "string" ? c.url
      : null,
    viewport: [num(c.viewport?.[0], 1440), num(c.viewport?.[1], 900)],
    tokens: arr(c.tokens).filter(t => t && /^--[\w-]+$/.test(t.name) && typeof t.light === "string" && t.light),
    skipped: arr(c.skipped).filter(s => typeof s === "string"),
    roles: {
      bg: colour(r.bg, "#ffffff"),
      surface: colour(r.surface, null),
      ink: colour(r.ink, "#000000"),
      muted: colour(r.muted, null),
      accent: colour(r.accent, "#000000"),
    },
    // Retain exactly which role values were present; the v1 renderer keeps its legacy defaults above.
    rolesObserved: {
      bg: colour(r.bg, null),
      surface: colour(r.surface, null),
      ink: colour(r.ink, null),
      muted: colour(r.muted, null),
      accent: colour(r.accent, null),
    },
    fills: c.fills && typeof c.fills === "object" ? c.fills : {},
    grounds: arr(c.grounds),
    type: arr(c.type).filter(t => t && typeof t.role === "string"),
    layout: {
      container: num(l.container, null),
      gutter: num(l.gutter, null),
      header: num(l.header, null),
      sectionGap: num(l.sectionGap, null),
    },
    sections: arr(c.sections),
    radii: arr(c.radii),
    shadows: arr(c.shadows),
    motion: arr(c.motion),
    animations: arr(c.animations),
    keyframes: arr(c.keyframes),
    scroll: arr(c.scroll),
    effects: arr(c.effects),
    hover: arr(c.hover),
    // section index -> frame paths under capture/frames; what the motion pass could not do, one line each
    frames: c.frames && typeof c.frames === "object" && !Array.isArray(c.frames) ? c.frames : {},
    problems: arr(c.problems).filter(s => typeof s === "string"),
    components: {
      button: arr(k.button),
      input: arr(k.input),
      card: arr(k.card),
      primary: k.primary && typeof k.primary === "object" ? k.primary : null,
    },
  };
}

const lightness = h => {
  const x = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  return (Math.max(...x) + Math.min(...x)) / 510;
};
const byName = (a, b) =>
  a.name < b.name ? -1
  : a.name > b.name ? 1
  : 0;

// Several captures of one site (pages, viewports, light and dark) -> one record for render().
function merge(captures) {
  const lights = captures.filter(c => c.scheme !== "dark");
  const primary = lights.length ? lights : captures;
  const darks = lights.length ? captures.filter(c => c.scheme === "dark") : [];
  const widest = [...primary].sort((a, b) => b.viewport[0] - a.viewport[0]);
  const main = widest[0];
  const caveats = new Set();

  const tokens = new Map();
  for (const c of primary) {
    for (const t of c.tokens) {
      const known = tokens.get(t.name);
      if (!known) tokens.set(t.name, { ...t });
      else {
        if (known.light !== t.light)
          caveats.add(
            `\`${t.name}\` is \`${t.light}\` on ${c.path} at ${c.viewport[0]}px; \`${known.light}\` was kept (first capture wins).`,
          );
        if (!known.dark && t.dark) known.dark = t.dark;
      }
    }
  }
  for (const d of darks) {
    const l = primary.find(c => c.path === d.path && c.viewport[0] === d.viewport[0]) || main;
    const lightOf = new Map(l.tokens.map(t => [t.name, t.light]));
    for (const t of d.tokens) {
      const k = tokens.get(t.name);
      if (k && !k.dark && lightOf.has(t.name) && lightOf.get(t.name) !== t.light) k.dark = t.light;
    }
  }
  const dm = darks.find(d => d.path === main.path && d.viewport[0] === main.viewport[0]) || darks[0];

  // one colour scheme: dark captures exist and neither a token nor a role differs from the light ones
  const rolesDiffer = dm && Object.keys(main.roles).some(k => main.roles[k] !== dm.roles[k]);
  const single =
    darks.length && !rolesDiffer && ![...tokens.values()].some(t => t.dark) ?
      lightness(main.roles.bg) < 0.5 ?
        "dark"
      : "light"
    : null;

  const type = new Map();
  for (const c of widest) {
    for (const t of c.type) {
      // a recorded site names its own faces: one that could close the kit's <style> or <link> is not kept
      const r = SAFE_FAMILY.test(t.family || "") ? t : { ...t, family: "" };
      const key = [r.role, r.family, r.size, r.line, r.weight, r.tracking].join("|");
      const row = type.get(key) || { ...r, at: [] };
      if (!row.at.includes(c.viewport[0])) row.at.push(c.viewport[0]);
      type.set(key, row);
    }
  }
  const roleAt = r => (ROLE_ORDER.includes(r.role) ? ROLE_ORDER.indexOf(r.role) : ROLE_ORDER.length);

  const layouts = [];
  for (const c of widest)
    if (!layouts.some(x => x.vw === c.viewport[0])) layouts.push({ vw: c.viewport[0], ...c.layout });

  const paths = [...new Set(primary.map(c => c.path))];
  const pages = paths.map(p => ({ path: p, sections: widest.find(c => c.path === p).sections }));

  const sum = (key, field) => {
    const counts = new Map();
    for (const c of primary)
      for (const r of c[key])
        if (r && r[field] !== undefined) {
          const key = field === "px" && r[field] >= 999 ? 9999 : r[field];
          counts.set(key, (counts.get(key) || 0) + (r.count || 1));
        }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8);
  };
  const motion = new Map();
  for (const c of primary) {
    for (const r of c.motion) {
      const key = `${r.duration}|${r.easing}`;
      const row = motion.get(key) || { duration: r.duration, easing: r.easing, count: 0 };
      row.count += r.count || 1;
      motion.set(key, row);
    }
  }

  // the motion pass ran on the wide light view: its rows come from the first capture that holds any
  const moving = widest.find(c => c.animations.length || c.scroll.length || c.hover.length) || main;
  const objects = list => list.filter(x => x && typeof x === "object");
  const animations = new Map();
  for (const a of objects(moving.animations)) {
    // a CSS animation's curve sits on its keyframes; its timing then reads "linear"
    const frameEase = Array.isArray(a.keyframes) ? a.keyframes.map(k => k && k.easing).find(Boolean) : null;
    const easing = a.easing === "linear" && frameEase ? frameEase : a.easing;
    const key = [a.name, a.duration, easing, a.iterations].join("|");
    const row = animations.get(key) || {
      name: a.name || "(unnamed)",
      duration: a.duration,
      easing,
      iterations: a.iterations,
      count: 0,
    };
    row.count++;
    animations.set(key, row);
  }
  // one row per distinct change: many elements moving the same way are one line
  const distinct = rows => [...new Map(rows.map(r => [JSON.stringify(r), r])).values()];
  let scrollRows = [];
  for (const e of objects(moving.scroll)) {
    const sticky = Array.isArray(e.sticky) ? `${e.sticky[0]}–${e.sticky[1]}px` : "—";
    const props = e.props && typeof e.props === "object" ? Object.entries(e.props) : [];
    for (const [prop, points] of props) {
      // an empty value is an element off the page at that step, not a change
      const list = (Array.isArray(points) ? points : []).filter(p => p && p.value != null && p.value !== "");
      // the value it moves to: the first one that differs from where it starts (a value that returns still moved)
      const to = list.find(p => p.value !== list[0].value);
      if (to) scrollRows.push({ section: e.section, prop, from: list[0].value, to: to.value, sticky });
    }
    if (!props.length && Array.isArray(e.sticky))
      scrollRows.push({ section: e.section, prop: "sticky", from: null, to: null, sticky });
  }
  scrollRows = distinct(scrollRows);
  const hoverRows = distinct(
    objects(moving.hover).map(h => ({
      role: h.role || "element",
      changes: Object.keys(h.changes && typeof h.changes === "object" ? h.changes : {}).join(", "),
      transition: h.transition || "none",
    })),
  );

  const components = {};
  for (const kind of ["button", "input", "card"]) {
    const seen = new Map();
    for (const c of widest) for (const v of c.components[kind]) seen.set(JSON.stringify(v), v);
    components[kind] = [...seen.values()].slice(0, 6);
  }
  // the capture's own pick of the primary action, from the widest page; the table keeps it in view
  components.primary = widest.map(c => c.components.primary).find(Boolean) || null;
  if (components.primary) {
    const { shadow, blur, ...row } = components.primary;
    const same = v => JSON.stringify(v) === JSON.stringify(row);
    if (!components.button.some(same)) components.button = [row, ...components.button].slice(0, 6);
  }

  return {
    date: main.captured,
    views: [...new Set(captures.map(c => `${c.viewport[0]}x${c.viewport[1]} ${c.scheme}`))],
    paths: pages,
    tokens: [...tokens.values()].sort(byName),
    fills: main.fills,
    grounds: main.grounds,
    roleCandidates: primary.map(c => ({ path: c.path, roles: c.roles })),
    roles: main.roles,
    rolesDark: dm ? dm.roles : null,
    rolesObserved: main.rolesObserved,
    rolesDarkObserved: dm ? dm.rolesObserved : null,
    single,
    type: [...type.values()].sort((a, b) => roleAt(a) - roleAt(b)),
    layouts,
    radii: sum("radii", "px").map(([px, count]) => ({ px, count })),
    shadows: sum("shadows", "value").map(([value, count]) => ({ value, count })),
    motion: [...motion.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    animations: [...animations.values()].sort((a, b) => b.count - a.count).slice(0, 12),
    scroll: scrollRows.slice(0, 12),
    hover: hoverRows.slice(0, 12),
    components,
    skipped: [...new Set(captures.flatMap(c => c.skipped))],
    caveats: [...caveats],
  };
}

/* ---------------------------------------------------------------- the file */
const slot = (name, text) => `<!-- write: ${name}: ${text} -->`;
const cell = s => String(s).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const code = s => `\`${s}\``;
const px = v => (v === null || v === undefined ? "—" : `${v}px`);
const normalizeBorder = value => {
  if (typeof value !== "string") return value;
  const border = value.trim();
  const legacy = /^(\d+(?:\.\d+)?px)\s+(#[0-9a-f]{6}(?:[0-9a-f]{2})?)$/i.exec(border);
  return legacy ? `${legacy[1]} solid ${legacy[2]}` : border;
};

function table(head, rows) {
  return [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map(r => `| ${r.map(cell).join(" | ")} |`),
  ].join("\n");
}

const hex6 = h => (typeof h === "string" && h.length === 9 ? h.slice(0, 7) : h);
const radiusText = (v, h) => (v >= 999 || (h && v * 2 >= h) ? "pill" : px(v));
// the primary button: a filled control at least 32px tall, a saturated fill first (the one nearest the
// accent), else the filled one that stands off the page ground; a white button on a white page is the secondary
function pickPrimary(list, accent, bg) {
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const dist = (a, b) => rgb(a).reduce((s, v, i) => s + Math.abs(v - rgb(b)[i]), 0);
  const chroma = h => (Math.max(...rgb(h)) - Math.min(...rgb(h))) / 255;
  const filled = list.filter(b => HEX.test(b.fill || "") && b.h >= 32).map(b => ({ ...b, fill: hex6(b.fill) }));
  const sat = filled.filter(b => chroma(b.fill) >= 0.2);
  const pool = sat.length ? sat : filled.filter(b => !HEX.test(bg || "") || dist(b.fill, hex6(bg)) > 60);
  const near =
    HEX.test(accent || "") ? [...pool].sort((a, b) => dist(a.fill, hex6(accent)) - dist(b.fill, hex6(accent))) : pool;
  return near[0] || filled[0] || null;
}
const titleCase = name =>
  name
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

function render(m, name) {
  const title = titleCase(name);
  const date = m.date;
  const primary =
    m.components.primary
    || pickPrimary(
      m.components.button.map(b => ({ ...b, fill: b.bg })),
      m.roles.accent,
      m.roles.bg,
    );
  const heading = m.type.find(t => t.role === "h1") || m.type.find(t => t.role === "body");
  const R = m.roles;

  const front = [
    "---",
    `name: ${name}-design-system`,
    `description: Design-system reference for building UIs in the visual language of the ${name} taste. Tokens (light + dark), type, layout, depth, motion and component recipes. Use it when you write HTML/CSS/JSX that should look like ${name}.`,
    "metadata:",
    `  version: ${date}`,
    `  source: computed styles captured on ${date}`,
    "alwaysApply: false",
    'applyTo: "**/*.{html,css,jsx,tsx,vue,svelte}"',
    "---",
  ].join("\n");

  const intro = [
    `# ${title} design system reference`,
    slot("intro", "the visual DNA in one bold sentence, then the character in one line"),
  ].join("\n\n");

  const when = [
    "## When to use this skill",
    slot("When to use", "three bullets: what to build with it, the words that should call it"),
  ].join("\n\n");

  const install = [
    "## Install",
    `This file is the whole kit. To get the CSS, regenerate it from **Token reference** at the bottom, or run ${code(`node <ui skill>/scripts/record.mjs css ${name} --out <styles folder>/tokens.css`)}:`,
    [
      "1. Write every `--name: light` into `:root { color-scheme: light; ... }`.",
      '2. Write every value after `|` into `.dark, [data-theme="dark"] { color-scheme: dark; ... }`. A token without `|` keeps its light value in dark.',
      '3. Theme with a `dark` class or `data-theme="dark"` on `<html>` (set both if unsure).',
      "4. Import the result once, before the project's other styles.",
    ].join("\n"),
    '```css\n@import "./tokens.css";\n```',
  ].join("\n\n");

  const usage = [
    "## Usage rules",
    slot(
      "Usage rules",
      "6 to 10 numbered rules a builder could break: the primary action's colour, text sizes, borders, radii, dark mode",
    ),
  ].join("\n\n");

  const stop = [
    "## Stop and ask",
    slot("Stop and ask", "drift and mixing: what to confirm before adding a value this file lacks"),
    "- **Brand assets:** the source's name, wordmark, logo and imagery are its owner's property. This file ships none; use your own name, mark and imagery.",
  ].join("\n\n");

  const roleUse = {
    bg: "Page ground: the colour that paints the most area",
    surface: "Second ground: cards, bands, panels",
    ink: "Body text and headings: the text colour with the most painted text",
    muted: "Secondary text and captions",
    accent: "Interactive colour: links and primary actions (the ink when no saturated colour is on the page)",
  };
  const darkFor = role =>
    !R[role] ? "—" : (
      (m.rolesDark?.[role] ?? m.tokens.find(t => t.dark && t.light.toLowerCase() === R[role])?.dark ?? "—")
    );
  const tokenFor = role =>
    !R[role] ? "—" : (
      m.tokens
        .filter(t => t.light.toLowerCase() === R[role])
        .slice(0, 2)
        .map(t => code(t.name))
        .join(" ") || "—"
    );
  const darkCount = m.tokens.filter(t => t.dark).length;
  const colors = [
    "## Colors",
    m.single ?
      table(
        ["Role", "Value", "Token", "Use"],
        Object.keys(roleUse).map(k => [k, R[k] ? code(R[k]) : "—", tokenFor(k), roleUse[k]]),
      )
    : table(
        ["Role", "Light", "Dark", "Token", "Use"],
        Object.keys(roleUse).map(k => [
          k,
          R[k] ? code(R[k]) : "—",
          darkFor(k) === "—" ? "—" : code(darkFor(k)),
          tokenFor(k),
          roleUse[k],
        ]),
      ),
    `Roles are measured by the area they paint (grounds) or the text they colour on the page ground (ink, muted); the accent is the primary button's fill when it is saturated, else the most saturated fill or link colour on a control. ${m.tokens.length} custom properties were read, ${darkCount} with a dark value: see **Token reference**.`,
  ].join("\n\n");

  const families = new Map();
  for (const t of m.type) families.set(t.family, [...(families.get(t.family) || []), t.role]);
  const typography = [
    "## Typography",
    m.type.length ?
      [
        `Families: ${[...families].map(([f, roles]) => `${code(f || "inherited")} (${[...new Set(roles)].join(", ")})`).join(", ")}.`,
        table(
          ["Role", "Family", "Size / line", "Weight", "Tracking", "Viewport"],
          m.type.map(t => [
            t.role,
            code(t.family || "inherited"),
            `${t.size}px / ${t.line}px`,
            t.weight,
            t.tracking,
            t.at.join(", "),
          ]),
        ),
      ].join("\n\n")
    : "No headings or body text were measured.",
  ].join("\n\n");

  const layout = [
    "## Layout",
    table(
      ["", ...m.layouts.map(l => `${l.vw}px`)],
      [
        ["Container", ...m.layouts.map(l => px(l.container))],
        ["Gutter", ...m.layouts.map(l => px(l.gutter))],
        ["Header", ...m.layouts.map(l => px(l.header))],
        ["Section gap", ...m.layouts.map(l => px(l.sectionGap))],
      ],
    ),
    "Container is the widest centred box; gutter its side padding; section gap the median whitespace between top-level sections.",
  ].join("\n\n");

  const elevation = [
    "## Elevation",
    m.shadows.length ?
      table(
        ["Shadow", "Elements"],
        m.shadows.map(s => [code(s.value), s.count]),
      )
    : "Flat: no box shadows were measured. Separation comes from colour, borders and space.",
  ].join("\n\n");

  const shape = [
    "## Shape",
    m.radii.length ?
      table(
        ["Radius", "Elements"],
        m.radii.map(r => [radiusText(r.px), r.count]),
      )
    : "Square: no rounded corners were measured.",
    primary ?
      `Primary button: ${radiusText(primary.radius, primary.h)} radius at ${primary.h}px high`
      + (HEX.test(primary.bg || "") ?
        // a translucent key keeps its alpha: the fill is a tint over whatever ground it sits on
        `, fill \`${primary.bg.length === 9 ? primary.bg.toLowerCase() : hex6(primary.bg)}\`, text \`${hex6(primary.color)}\`.`
      : ".")
    : "",
    primary?.shadow && primary.shadow !== "none" ? `Primary button shadow: \`${primary.shadow}\`.` : "",
    (
      typeof primary?.blur === "string"
      && /blur\(/.test(primary.blur)
      && /^[a-z0-9().,%\s-]{1,120}$/i.test(primary.blur.trim())
    ) ?
      `Primary button backdrop: \`${primary.blur.trim()}\` (a frosted key: its fill is translucent).`
    : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const motion = [
    "## Motion",
    m.motion.length ?
      table(
        ["Duration", "Easing", "Elements"],
        m.motion.map(t => [t.duration, code(t.easing), t.count]),
      )
    : "No transitions were measured; treat the page as static.",
    m.animations.length ?
      [
        "### Animations",
        table(
          ["Name", "Duration", "Easing", "Iterations", "Elements"],
          m.animations.map(a => [
            code(a.name),
            Number.isFinite(a.duration) ? `${a.duration}ms` : "scroll",
            code(a.easing ?? "linear"),
            a.iterations ?? 1,
            a.count,
          ]),
        ),
      ].join("\n\n")
    : "",
    m.scroll.length ?
      [
        "### Scroll",
        table(
          ["Section", "Property", "From → To", "Sticky"],
          m.scroll.map(s => [
            s.section ?? "—",
            code(s.prop),
            s.from === null ? "—" : `${code(String(s.from).slice(0, 60))} → ${code(String(s.to).slice(0, 60))}`,
            s.sticky,
          ]),
        ),
      ].join("\n\n")
    : "",
    m.hover.length ?
      [
        "### Hover",
        table(
          ["Role", "Changes", "Transition"],
          m.hover.map(h => [h.role, h.changes, code(String(h.transition).slice(0, 100))]),
        ),
      ].join("\n\n")
    : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const sectionText = s => `${s.h}px · ${s.cols} col${s.cols === 1 ? "" : "s"} · ${s.media ? "media" : "no media"}`;
  const composition = [
    "## Composition",
    m.paths.some(p => p.sections.length) ?
      table(
        ["Page", "Sections, top to bottom"],
        m.paths.map(p => [code(p.path), p.sections.length ? p.sections.map(sectionText).join(" → ") : "none measured"]),
      )
    : "No sections were measured.",
    slot("Composition", "how a page is assembled: the hero's structure, section rhythm, density, where pictures sit"),
  ].join("\n\n");

  const signature = [
    "## Signature",
    slot(
      "Signature",
      "the two or three things that make it recognisable, and how to get the same feeling with your own material",
    ),
  ].join("\n\n");

  const fill = v => (v === "none" ? "none" : code(v));
  const parts = ["## Components"];
  const box = ["Height", "Radius", "Pad X", "Fill", "Text", "Border"];
  for (const kind of ["button", "input"]) {
    if (!m.components[kind].length) continue;
    parts.push(
      `### ${titleCase(kind)}`,
      table(
        box,
        m.components[kind].map(v => [
          px(v.h),
          radiusText(v.radius, v.h),
          px(v.padX),
          fill(v.bg),
          fill(v.color),
          fill(v.border),
        ]),
      ),
      slot(`Rules (${kind})`, `what never changes for the ${kind}, in 3 to 5 bullets`),
    );
  }
  if (m.components.card.length)
    parts.push(
      "### Card",
      table(
        ["Radius", "Pad X", "Fill", "Border", "Shadow"],
        m.components.card.map(v => [radiusText(v.radius), px(v.pad), fill(v.bg), fill(v.border), fill(v.shadow)]),
      ),
      slot("Rules (card)", "what never changes for the card, in 3 to 5 bullets"),
    );
  if (parts.length === 1) parts.push("No buttons, inputs or cards were measured.");
  const components = parts.join("\n\n");

  const kit = [
    "## Kit fit",
    "A new page through the `taste` kit takes this block in place of the dealt palette, pairing and radius (`start.mjs css` or `brand`):",
    "```sh\n" + `node <ui skill>/scripts/record.mjs kit ${name}` + "\n```",
    heading ?
      `Measured ${heading.role === "h1" ? "h1" : "body"} family: ${code(heading.family || "inherited")} at ${heading.size}px, weight ${heading.weight}.`
    : "No h1 or body family was measured.",
    "### Kit overrides",
    "The kit's look checks this taste breaks on purpose. A page that names the taste (`<meta name=\"taste\">`, printed by `kit`) has these checks waived by the gate and listed in its report; only the look checks in `taste`'s `references/gate.md` (Taste overrides) can be named here.",
    slot(
      "Kit overrides",
      "a table | Check | Why | of the kit look checks a page in this taste must break (each Why cites the Usage rule or Signature it serves), or the line None.",
    ),
  ].join("\n\n");

  const caveatLines = m.caveats.slice(0, 20).map(c => `- ${c}`);
  if (m.caveats.length > 20) caveatLines.push(`- ${m.caveats.length - 20} more token differences between captures.`);
  // a measured muted grey under the 4.5:1 text needs: the table keeps it, the kit block prints it readable
  const mutedGrounds = [R.bg, R.surface].filter(h => HEX.test(h || ""));
  const mutedFix =
    HEX.test(R.muted || "") && mutedGrounds.length ? readable(hex6(R.muted), mutedGrounds.map(hex6)) : null;
  if (mutedFix)
    caveatLines.push(
      `- The measured **muted** ${code(R.muted)} reads ${ratioText(hex6(R.muted), hex6(R.bg))} on ${code(R.bg)}, under the 4.5:1 text needs: \`record.mjs kit\` prints it as ${code(mutedFix)}, the same hue ${luminance(mutedFix) < luminance(hex6(R.muted)) ? "darkened" : "lightened"} to 4.5:1 on the grounds, and the Colors table keeps the measured value.`,
    );
  const provenance = [
    "## Provenance and caveats",
    [
      `- Captured on ${date} from the computed styles of the rendered pages. The raw capture (stylesheets, an HTML snapshot, frames) is in \`capture/\`, on this machine only.`,
      `- Viewports: ${m.views.join(", ")}.`,
      `- Pages: ${m.paths.map(p => code(p.path)).join(", ")}.`,
      '- Method: custom properties from every readable stylesheet; dark values from a `.dark` / `data-theme="dark"` probe and from the dark colour-scheme capture; roles by painted area (a gradient by its opaque stops; blurred glows and layers under 50% opacity skipped), ink and muted from text that reads on the page ground, the primary button by its fill; type, layout, radii, shadows and motion over at most 4000 visible elements per page.',
      m.skipped.length ?
        `- Unreadable stylesheets (cross-origin): ${m.skipped.map(code).join(", ")}. Their custom properties are not in **Token reference**.`
      : "- Every stylesheet was readable.",
      ...(m.single ? [`- One colour scheme: ${m.single}.`] : []),
      ...caveatLines,
    ].join("\n"),
  ].join("\n\n");

  const lines = m.tokens.map(
    t => `${t.name}: ${t.light.replace(/\s+/g, " ")}${t.dark ? ` | ${t.dark.replace(/\s+/g, " ")}` : ""}`,
  );
  const reference = [
    "## Token reference",
    "```css\n"
      + [
        ...(m.single ? [`/* color-scheme: ${m.single} */`] : []),
        ...(lines.length ? lines : ["/* no custom properties were found */"]),
      ].join("\n")
      + "\n```",
  ].join("\n\n");

  return (
    [
      front,
      intro,
      when,
      install,
      usage,
      stop,
      colors,
      typography,
      [
        "## Fills",
        table(
          ["Role", "Gradient"],
          [
            ["surface", m.fills?.surface?.css],
            ["primary", m.fills?.primary?.css],
            ...(m.fills?.text || []).map(t => [t.role, t.gradient?.css]),
          ]
            .filter(r => r[1])
            .map(([role, css]) => [role, code(css)]),
        ),
      ].join("\n\n"),
      [
        "## Color candidates",
        table(
          ["Page", "Background", "Surface", "Ink", "Accent"],
          m.roleCandidates.map(c => [c.path, c.roles.bg, c.roles.surface, c.roles.ink, c.roles.accent]),
        ),
      ].join("\n\n"),
      ["## Picture grounds", ...m.grounds.map(g => JSON.stringify(g.colors || {}))].join("\n\n"),
      layout,
      elevation,
      shape,
      motion,
      composition,
      signature,
      components,
      kit,
      provenance,
      reference,
    ].join("\n\n") + "\n"
  );
}

// the Token reference block of a taste file -> :root { } and .dark, [data-theme="dark"] { }
function css(text) {
  const block = /## Token reference\s+```css\n([\s\S]*?)```/.exec(text);
  if (!block) fail("this file has no Token reference block");
  const scheme = /\/\*\s*color-scheme:\s*(dark|light)\s*\*\//.exec(block[1])?.[1] ?? "light";
  const light = [];
  const dark = [];
  for (const line of block[1].split("\n")) {
    const m = /^(--[\w-]+):\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const i = m[2].indexOf(" | ");
    light.push([m[1], i < 0 ? m[2] : m[2].slice(0, i)]);
    if (i >= 0) dark.push([m[1], m[2].slice(i + 3)]);
  }
  const open = (selector, scheme, pairs) =>
    [`${selector} {`, `  color-scheme: ${scheme};`, ...pairs.map(([k, v]) => `  ${k}: ${v};`), "}"].join("\n");
  return `${open(":root", scheme, light)}\n\n${open('.dark, [data-theme="dark"]', "dark", dark)}\n`;
}

/* ---------------------------------------------------------------- kit: the taste kit's head block */
// Reads the tables render() wrote, so a taste written before this command needs no new capture.
const KIT_SHEETS = ["system", "ui/cards", "motion/motion", "backgrounds/backgrounds", "layout/layout", "icons/icon"];
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hexOf = rgb => "#" + rgb.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
const mixHex = (a, b, t) => hexOf(rgbOf(a).map((v, i) => v + (rgbOf(b)[i] - v) * t));
const luminance = h =>
  rgbOf(h)
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
// black or white, whichever reads better on h (a fixed luminance cut put white on mid oranges at 3.3:1)
const inkOn = h => (contrastOf(h, "#000000") >= contrastOf(h, "#ffffff") ? "#000000" : "#ffffff");
const contrastOf = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const ratioText = (a, b) => `${(Math.floor(contrastOf(a, b) * 100) / 100).toFixed(2)}:1`;
// a text colour that reads under `min`:1 on a ground it sits on, stepped in its own hue toward black (toward white
// on a dark ground) until it reads min:1 on every one of them; null when it already does
function readable(h, grounds, min = 4.5) {
  const worst = c => Math.min(...grounds.map(g => contrastOf(c, g)));
  if (worst(h) >= min) return null;
  const to = luminance(grounds[0]) > 0.18 ? "#000000" : "#ffffff";
  for (let i = 1; i <= 100; i++) {
    const c = mixHex(h, to, i / 100);
    if (worst(c) >= min) return c;
  }
  return to;
}
// CSS's own family keywords and the system faces: never a Google Fonts family, never quoted ("inherited" is how the
// pack writes a row with no family of its own)
const GENERIC =
  /^(?:-apple-system|blinkmacsystemfont|system-ui|ui-(?:sans-serif|serif|monospace|rounded)|sans-serif|serif|monospace|cursive|fantasy|math|emoji|fangsong|inherit|inherited|initial)$/i;
const googleName = f =>
  GENERIC.test(f) ?
    f.toLowerCase()
  : (f.includes(" ") ? f : f.replace(/([a-z])([A-Z])/g, "$1 $2")).replace(/^./, c => c.toUpperCase());
const quoted = f => (GENERIC.test(f) ? f : `"${f}"`);
// a family name the kit may print in its <link> and <style>: letters (with their accents), digits, spaces, dots,
// hyphens, underscores (next/font names a face __Inter_aaf875)
const SAFE_FAMILY = /^[\p{L}\p{M}\p{N}._-][\p{L}\p{M}\p{N} ._-]{0,63}$/u;

// the kit's type library (taste/library/type.json): every family in it is a Google Fonts family
let LIBRARY = null;
const library = () => {
  if (LIBRARY) return LIBRARY;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "taste", "library", "type.json"), "utf8"));
    LIBRARY = Array.isArray(data) ? data.filter(e => e && typeof e === "object" && e.display && e.text) : [];
  } catch {
    LIBRARY = [];
  }
  return LIBRARY;
};
const libraryFamilies = () =>
  new Set(library().flatMap(e => [e.display.family, e.text.family, e.mono?.family].filter(Boolean)));

// serif, sans or mono: the generic family the site's own stack puts after the face (a Token reference line such as
// --ff-heading: NaN Serf B Text,serif), else what its name says
function kindOf(text, family) {
  const f = family.toLowerCase();
  if (GENERIC.test(f))
    return (
      /serif$/.test(f) && !/sans/.test(f) ? "serif"
      : /mono/.test(f) ? "mono"
      : "sans"
    );
  for (const m of text.matchAll(/^--[\w-]+:\s*(.+)$/gm)) {
    const parts = m[1]
      .split(" | ")[0]
      .split(",")
      .map(s =>
        s
          .trim()
          .replace(/^["']|["']$/g, "")
          .toLowerCase(),
      );
    const at = parts.indexOf(f);
    if (at < 0) continue;
    const g = parts.slice(at + 1).find(x => /^(?:ui-)?(?:serif|sans-serif|monospace)$|^system-ui$/.test(x));
    if (g)
      return (
        /mono/.test(g) ? "mono"
        : /^(?:ui-)?serif$/.test(g) ? "serif"
        : "sans"
      );
  }
  if (/mono|code/i.test(family)) return "mono";
  if (
    /serif|serf|garamond|times|georgia|playfair|caslon|baskerville|bodoni|fraunces|lora|merriweather|tiempos|freight|canela|domaine|lyon|publico|reckless|signifier/i.test(
      family,
    )
    && !/sans/i.test(family)
  )
    return "serif";
  return "sans";
}

// the nearest free face of the library for a licensed one: a serif takes the library's serifs, a sans its
// geometric faces when the name is a geometric family's (Circular, Futura, Avenir...) else its neo-grotesks, a mono
// the mono paired with the text face's stand-in. Among those, the one with most of the neutral moods (calm,
// trusted, refined), then the library's own order.
const GEOMETRIC_SANS =
  /circular|futura|avenir|gilroy|brandon|sofia|cera|euclid|gotham|proxima|century gothic|tt commons|graphik/i;
const NEUTRAL_MOODS = ["calm", "trusted", "refined"];
function standInEntry(family, kind) {
  const ranked = list =>
    list
      .map((e, i) => [e, (e.moods || []).filter(m => NEUTRAL_MOODS.includes(m)).length, i])
      .sort((a, b) => b[1] - a[1] || a[2] - b[2])
      .map(x => x[0]);
  if (kind === "serif") return ranked(library().filter(e => e.class === "serif" && e.display.w))[0] || null;
  const cls = GEOMETRIC_SANS.test(family) ? "geometric" : "neo-grotesk";
  return ranked(library().filter(e => e.class === cls))[0] || null;
}
function standIn(family, kind, textFace, textKind) {
  if (kind === "serif") return standInEntry(family, "serif")?.display.family ?? null;
  if (kind === "sans") return standInEntry(family, "sans")?.text.family ?? null;
  return standInEntry(textFace, textKind)?.mono?.family ?? (library().length ? "JetBrains Mono" : null);
}

// Which families Google Fonts serves: its css2 endpoint answers 200 for a family (and weights) it has and 400 for
// one it has not. Each answer is kept in the pack's fonts.json, so a block prints the same every later time, offline
// included; the record run asks first. A family never answered (offline, a timeout) counts as served when the kit's
// type library names it, else as licensed, and is asked again next time.
// asks: [[family, weights]] → Map family → { spec: "Family:wght@400;600" | "Family" | null, state }
const FONT_CACHE = "fonts.json";
const quotedList = list => list.map(f => `"${f}"`).join(", ");
async function googleServes(dir, asks) {
  const file = dir ? path.join(dir, FONT_CACHE) : null;
  let cache = {};
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data && typeof data.served === "object" && data.served) cache = data.served;
  } catch {
    /* none yet */
  }
  let dirty = false;
  const ask = async spec => {
    if (typeof cache[spec] === "boolean") return cache[spec];
    try {
      const q = encodeURIComponent(spec)
        .replace(/%20/g, "+")
        .replace(/%3A/g, ":")
        .replace(/%40/g, "@")
        .replace(/%3B/g, ";");
      const r = await fetch(`https://fonts.googleapis.com/css2?family=${q}`, { signal: AbortSignal.timeout(6000) });
      if (r.status !== 200 && r.status !== 400) return null;
      cache[spec] = r.status === 200;
      dirty = true;
      return cache[spec];
    } catch {
      return null;
    }
  };
  const known = libraryFamilies();
  const out = new Map();
  await Promise.all(
    asks.map(async ([family, weights]) => {
      const full = `${family}:wght@${weights.join(";")}`;
      const yes = await ask(full);
      if (yes) return out.set(family, { spec: full, state: "served" });
      // a family Google serves without one of these weights is linked at its default weight
      const bare = yes === false ? await ask(family) : null;
      if (bare) return out.set(family, { spec: family, state: "served" });
      if (bare === false) return out.set(family, { spec: null, state: "licensed" });
      return out.set(family, known.has(family) ? { spec: full, state: "served" } : { spec: null, state: "unasked" });
    }),
  );
  if (dirty && file && fs.existsSync(dir))
    try {
      const served = Object.fromEntries(
        Object.keys(cache)
          .sort()
          .map(k => [k, cache[k]]),
      );
      fs.writeFileSync(
        file,
        JSON.stringify({ source: "https://fonts.googleapis.com/css2 (200 served, 400 not)", served }, null, 1) + "\n",
      );
    } catch {
      /* a read-only pack: asked again next time */
    }
  return out;
}

function tableRows(text, heading) {
  text = text.replaceAll("\r\n", "\n");
  text = text.replaceAll("\r\n", "\n");
  const at = text.indexOf(`\n${heading}\n`);
  if (at < 0) return null;
  const lines = text.slice(at + heading.length + 2).split("\n");
  const start = lines.findIndex(l => l.startsWith("|"));
  if (start < 0) return null;
  const rows = [];
  for (const line of lines.slice(start)) {
    if (!line.startsWith("|")) break;
    rows.push(
      line
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map(c => c.trim().replace(/^`|`$/g, "")),
    );
  }
  return { head: rows[0], rows: rows.slice(2) };
}

// manifest: the parsed taste.json or null; its variants.motion tokens (--m-*) join the printed :root block
// dir: the pack's folder, where fonts.json keeps what Google Fonts was asked (null: ask, keep nothing)
async function kit(text, name, manifest = null, dir = null) {
  if (dir) text = correctedText(text, dir);
  const hex = v => (HEX.test(v) ? hex6(v.toLowerCase()) : null);
  const colors = tableRows(text, "## Colors");
  if (!colors) fail("this file has no Colors table");
  const two = colors.head[1] === "Light";
  const role = (name, col) => hex(colors.rows.find(r => r[0] === name)?.[col] ?? "");
  const bg = role("bg", 1) || "#ffffff";
  const ink = role("ink", 1) || inkOn(bg);
  const surface = role("surface", 1) || mixHex(bg, ink, 0.06);
  const accent = role("accent", 1) || ink;

  // the primary: the line under Shape when the taste names its fill, else picked from the Button table
  const named = /Primary button: [^\n]*?fill `(#[0-9a-f]{6}(?:[0-9a-f]{2})?)`, text `(#[0-9a-f]{6})`/i.exec(text);
  const rows = (tableRows(text, "### Button")?.rows ?? []).map(r => ({
    h: parseFloat(r[0]) || 0,
    fill: r[3],
    text: r[4],
  }));
  const button = named ? { fill: named[1], text: named[2] } : pickPrimary(rows, accent, bg);
  // a translucent key (fill #rrggbbaa) is a tint over its ground: the palette takes its opaque look on the page
  // ground, and on the inverse band the same tint of the inverse ink (light-dark keys flip that way)
  const tint =
    button && HEX.test(button.fill || "") && button.fill.length === 9 ? parseInt(button.fill.slice(7), 16) / 255 : 1;
  const action =
    button ?
      tint < 1 ?
        mixHex(bg, hex(button.fill), tint)
      : hex(button.fill)
    : accent;
  // a tint can vanish into the ground (a white glass key over a photograph, read on a white page): its measured
  // text then has no contrast left on the opaque look, and the kit inks it for the ground instead
  const measuredInk = button && hex(button.text ?? "");
  const firstInk = measuredInk && (tint === 1 || contrastOf(action, measuredInk) >= 3) ? measuredInk : inkOn(action);

  // the inverse band: the other scheme when the taste has two, else a raised step of its one scheme
  const invBg = (two && role("bg", 2)) || surface;
  const invInk = (two && role("ink", 2)) || ink;
  // every *-ink reads 4.5:1 on its fill: the one wanted when it does, else the taste's own ink of the right side
  // (its dark ink on a light fill, its light ink on a dark one), else black or white
  const inkFor = (fill, want) => {
    if (want && contrastOf(fill, want) >= 4.5) return want;
    const own = [ink, invInk].sort((a, b) => contrastOf(fill, b) - contrastOf(fill, a))[0];
    return contrastOf(fill, own) >= 4.5 ? own : inkOn(fill);
  };
  const actionInk = inkFor(action, firstInk);
  const accentInk = inkFor(accent, action === accent ? actionInk : null);
  const fill6 = button && tint < 1 ? hex(button.fill) : null;
  const inkTint = fill6 && rgbOf(fill6).reduce((d, v, i) => d + Math.abs(v - rgbOf(ink)[i]), 0) <= 60;
  const invAction = !fill6 ? action : mixHex(invBg, inkTint ? invInk : fill6, tint);
  const invAccent = (two && role("accent", 2)) || accent;
  const invSurface = (two && role("surface", 2)) || mixHex(invBg, invInk, two ? 0.07 : 0.06);
  // muted is text: a measured grey under 4.5:1 on its grounds prints in its own hue, stepped to 4.5:1 (the taste's
  // Provenance and caveats keep the measured one)
  const mutedRaw = role("muted", 1) || mixHex(ink, bg, 0.45);
  const muted = readable(mutedRaw, [bg, surface]) || mutedRaw;
  const invMutedRaw = (two && role("muted", 2)) || (two ? mixHex(invInk, invBg, 0.45) : mutedRaw);
  const invMuted = readable(invMutedRaw, [invBg, invSurface]) || invMutedRaw;
  const p = {
    bg,
    surface,
    ink,
    muted,
    accent,
    "accent-ink": accentInk,
    action,
    "action-ink": actionInk,
    "inv-bg": invBg,
    "inv-surface": invSurface,
    "inv-ink": invInk,
    "inv-muted": invMuted,
    "inv-accent": invAccent,
    "inv-accent-ink": inkFor(invAccent, accentInk),
    // a translucent key of the ink's own colour flips with the scheme (the ink tint on light, the inverse ink's
    // on the inverse band); a coloured one keeps its hue over the inverse ground
    "inv-action": invAction,
    "inv-action-ink": inkFor(invAction, tint < 1 ? null : actionInk),
  };
  // a pale primary (a translucent grey key) under 3:1 on its ground keeps its fill, but links and the focus ring
  // would vanish in it: they take each ground's ink through system.css's link and focus tokens
  const faintAction = contrastOf(action, bg) < 3 || contrastOf(invAction, invBg) < 3;
  const mutedNote =
    muted !== mutedRaw ?
      `the measured muted ${mutedRaw} reads ${ratioText(mutedRaw, bg)} on ${bg}: printed as ${muted}, its own hue at 4.5:1 on the grounds`
    : "";

  // a pack written by hand, or before names were checked on record, still never prints an unsafe face
  const type = (tableRows(text, "## Typography")?.rows ?? []).map(r =>
    SAFE_FAMILY.test(r[1] || "") ? r : [r[0], "inherited", ...r.slice(2)],
  );
  const px = v => parseFloat(v) || 0;
  const h1 = type.filter(r => r[0] === "h1").sort((a, b) => px(b[2]) - px(a[2]))[0];
  const body = type.find(r => r[0] === "body" && !/mono/i.test(r[1])) || type.find(r => r[0] === "body") || h1;
  const h1Face = googleName(h1?.[1] || body?.[1] || "system-ui");
  // a serif (or any face) the taste keeps for its h1 alone stays on the h1: the kit's display face, which
  // sets every heading, the stats and the closing word, takes the section titles' face instead
  const titleRow = ["h2", "h3"].map(k => type.find(r => r[0] === k)).find(Boolean);
  const titleFace = titleRow ? googleName(titleRow[1]) : h1Face;
  const display = titleFace;
  // the text face: the family that sets the most running text at reading sizes (14-20px), summed over the viewports
  // each row was measured at (a body row counts twice); the display face keeps the headings. The page's biggest
  // paragraph can be a large quote (a 36px serif testimonial read as body at 1440), which sets no running text.
  const reading = new Map();
  for (const r of type) {
    if (!["body", "small", "nav"].includes(r[0]) || /mono/i.test(r[1]) || GENERIC.test(r[1])) continue;
    if (!(px(r[2]) >= 14 && px(r[2]) <= 20)) continue;
    const views = (r[5] || "").split(/,\s*/).filter(Boolean).length || 1;
    reading.set(r[1], (reading.get(r[1]) || 0) + views * (r[0] === "body" ? 2 : 1));
  }
  const readingFace = [...reading].sort((a, b) => b[1] - a[1])[0]?.[0];
  const textFace = googleName(readingFace || body?.[1] || display);
  const monoRow = type.find(r => /mono/i.test(r[1]));
  const mono = monoRow ? googleName(monoRow[1]) : "JetBrains Mono";
  const weights = new Map();
  for (const r of type) {
    const f = googleName(r[1]);
    if (![h1Face, display, textFace, mono].includes(f)) continue;
    weights.set(f, (weights.get(f) || new Set()).add(Number(r[3]) || 400));
  }
  if (!monoRow) weights.set(mono, new Set([400, 500]));
  const families = [...new Set([h1Face, display, textFace, mono])].filter(f => !GENERIC.test(f));
  const weightsOf = f => [...(weights.get(f) || [400])].sort((a, b) => a - b);
  // Google Fonts links only what it serves; a licensed face keeps its name in the tokens, followed in its stack by
  // the nearest free face of the kit's type library, which is linked in its place
  const served = await googleServes(
    dir,
    families.map(f => [f, weightsOf(f)]),
  );
  const free = new Map(); // licensed family → its free stand-in
  for (const f of families) {
    if (served.get(f).spec) continue;
    const s = standIn(f, kindOf(text, f), textFace, kindOf(text, textFace));
    if (s && !families.includes(s)) free.set(f, s);
  }
  const freeWeights = new Map();
  for (const [f, s] of free) freeWeights.set(s, [...new Set([...(freeWeights.get(s) || []), ...weightsOf(f)])]);
  const freeServed = await googleServes(
    dir,
    [...freeWeights].map(([s, w]) => [s, w.sort((a, b) => a - b)]),
  );
  for (const [f, s] of free) if (!freeServed.get(s).spec) free.delete(f);
  const specs = [
    ...new Set([...families.map(f => served.get(f).spec || (free.has(f) ? freeServed.get(free.get(f)).spec : null))]),
  ].filter(Boolean);
  const link =
    specs.length ?
      "https://fonts.googleapis.com/css2?"
      + specs
        .map(
          s =>
            `family=${encodeURIComponent(s).replace(/%20/g, "+").replace(/%3A/g, ":").replace(/%40/g, "@").replace(/%3B/g, ";")}`,
        )
        .join("&")
      + "&display=swap"
    : "";
  const licensed = families.filter(f => !served.get(f).spec);
  const unasked = licensed.filter(f => served.get(f).state === "unasked");
  const fontNote =
    licensed.length ?
      [
        `<!-- licensed faces: ${[
          licensed.length > unasked.length ?
            `Google Fonts does not serve ${quotedList(licensed.filter(f => !unasked.includes(f)))}`
          : "",
          unasked.length ?
            `${quotedList(unasked)} could not be asked of Google Fonts (offline) and ${unasked.length > 1 ? "are" : "is"} not in the kit's type library, so ${unasked.length > 1 ? "they count" : "it counts"} as licensed until this block is printed online`
          : "",
        ]
          .filter(Boolean)
          .join("; ")}; nothing links ${licensed.length > 1 ? "them" : "it"}.`,
        `     The tokens keep the taste's names; ${free.size ? `each stack carries the nearest free face of the kit's type library after it, linked here: ${[...free].map(([f, s]) => `"${f}" → ${s}`).join(", ")}` : "each stack falls back to the system face"}.`,
        `     Holding a licence, serve the real files under the same names, one rule per face and weight:`,
        `     @font-face { font-family: "${licensed[0]}"; src: url(fonts/${slug(licensed[0])}.woff2) format("woff2"); font-weight: ${weightsOf(licensed[0])[0]}; font-display: swap; } -->`,
      ]
    : [];
  const tracking = h1 && h1[4] !== "0" && /^-?\d*\.?\d+(?:em|rem|px)?$/.test(h1[4]) ? h1[4] : "0em";

  const primary = /Primary button: (\d+(?:\.\d+)?)px radius|Primary button: pill/.exec(text);
  const btn =
    primary ?
      primary[1] ?
        Number(primary[1])
      : 999
    : 8;
  const shape = (tableRows(text, "## Shape")?.rows ?? []).map(r => px(r[0])).filter(v => v > 0 && v < 999);
  const sm = btn >= 999 ? Math.min(...shape.filter(v => v >= 4), 8) : btn;
  const above = shape.filter(v => v > sm && v <= 32).sort((a, b) => a - b);
  const md = above.length ? above[Math.floor((above.length - 1) / 2)] : sm;
  const cardRadius = parseFloat(tableRows(text, "### Card")?.rows[0]?.[0]);
  const lg =
    Number.isFinite(cardRadius) ? cardRadius
    : above.length ? above[above.length - 1]
    : md;

  const stack = (f, tail) =>
    GENERIC.test(f) ?
      tail.split(", ").includes(f) ?
        tail
      : `${f}, ${tail}`
    : `"${f}", ${tail}`;
  // the generic tail follows the face's kind (the site's own stack says it, else its name), after the free stand-in
  // of a licensed face
  const MONO_TAIL = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
  const face = f => {
    const kind = kindOf(text, f);
    const tail =
      kind === "serif" ? "Georgia, serif"
      : kind === "mono" ? MONO_TAIL
      : "system-ui, sans-serif";
    return free.has(f) ? `"${f}", "${free.get(f)}", ${tail}` : stack(f, tail);
  };

  // the taste's own sizes, a straight line from 390 to 1440 like the kit's own scale
  // body sizes come from the text face's own rows (a large quote in the display face sets no running text)
  const rowsAt = (role, vw) =>
    type.filter(
      r =>
        r[0] === role
        && !/mono/i.test(r[1])
        && (role !== "body" || googleName(r[1]) === textFace)
        && r[5].split(/,\s*/).includes(String(vw)),
    );
  const sizeAt = (role, vw) => {
    const row = rowsAt(role, vw)[0];
    return row ? px(row[2]) : 0;
  };
  // the phone size of the role's lead element: the largest phone size of the desktop row's family (any
  // family when it has none), capped at the desktop size. The first row listing 390 can be a small
  // element of that role kept at both widths (a 16px footer h2), which would set every heading of the
  // role at that size on a phone.
  const phoneSize = (role, big) => {
    const desk = rowsAt(role, 1440)[0];
    const sizes = rows => rows.map(r => px(r[2])).filter(v => v > 0);
    const phone = rowsAt(role, 390);
    const same = sizes(phone.filter(r => desk && r[1] === desk[1]));
    const any = same.length ? same : sizes(phone);
    return any.length ? Math.min(Math.max(...any), big) : 0;
  };
  const line = (role, lo, hi) => {
    const big = sizeAt(role, 1440);
    if (!(big >= lo && big <= hi)) return null;
    const small = phoneSize(role, big) || big;
    if (small === big) return `${big}px`;
    const slope = (big - small) / (1440 - 390);
    const at0 = small - slope * 390;
    return `clamp(${small}px, ${+(slope * 100).toFixed(3)}vw + ${+at0.toFixed(2)}px, ${big}px)`;
  };
  const tH1 = line("h1", 40, 112);
  const tH2 = line("h2", 28, 72);
  const tH3 = line("h3", 18, 40);
  const bodyBig = sizeAt("body", 1440);
  const tText = line("body", 15, 24);
  const btnH = /Primary button: [^\n]*? at (\d+)px high/.exec(text);
  const shadowAt = /Primary button shadow: `([^`\n]+)`/.exec(text)?.[1] || "";
  const btnShadow = /[;{}<>]/.test(shadowAt) ? "" : shadowAt;
  const btnHeight = btnH && +btnH[1] >= 36 && +btnH[1] <= 56 ? +btnH[1] : 0;
  const sizes = [
    tH1 && `  --t-h1: ${tH1};`,
    tH1 && `  --ly-h1: calc(var(--ly-scale, 1) * ${tH1});`,
    tH1 && `  --ly-h1-xl: calc(var(--ly-scale, 1) * ${tH1});`,
    tH2 && `  --t-h2: ${tH2};`,
    tH3 && `  --t-h3: ${tH3};`,
    tText && (bodyBig >= 18 ? `  --t-lead: ${tText};` : `  --t-body: ${tText};`),
    btnHeight && `  --btn-h: ${btnHeight}px;`,
  ].filter(Boolean);
  const variants = manifest?.variants?.motion;
  const motionTokens = Object.entries(variants && typeof variants === "object" ? variants : {})
    .filter(([k, v]) => /^--m-[a-z0-9-]+$/.test(k) && typeof v === "string" && v.trim() && !/[;{}<>]/.test(v))
    .map(([k, v]) => `  ${k}: ${v.trim()};`);
  // Carry measured roles through the existing tables; corrections apply before this bridge.
  const treatments = [];
  const dimensions = tableRows(text, "## Layout");
  const columns = dimensions?.head.slice(1).map(v => parseFloat(v)) || [];
  const wideColumn = columns.length ? columns.indexOf(Math.max(...columns)) + 1 : 1;
  for (const [label, token] of [
    ["Container", "--container"],
    ["Header", "--nav"],
  ]) {
    const value = parseFloat(dimensions?.rows.find(r => r[0] === label)?.[wideColumn]);
    if (Number.isFinite(value) && value > 0) treatments.push(`  ${token}: ${value}px;`);
  }
  const safeCSS = value =>
    (
      typeof value === "string"
      && value.length < 1000
      && !/[;{}<>\\]/.test(value)
      && !/url\s*\(|@|expression/i.test(value)
      && /^[a-z0-9#().,%\s+\/-]+$/i.test(value)
    ) ?
      value
    : null;
  const card = tableRows(text, "### Card")?.rows[0];
  for (const [index, token] of [
    [2, "--panel-fill"],
    [3, "--panel-border"],
    [4, "--panel-shadow"],
  ]) {
    const value = safeCSS(token === "--panel-border" ? normalizeBorder(card?.[index]) : card?.[index]);
    if (value && value !== "—") treatments.push(`  ${token}: ${value};`);
  }
  for (const [roleName, token] of [
    ["surface", "--panel-fill"],
    ["primary", "--btn-fill"],
    ["h2", "--h2-fill"],
  ]) {
    const value = safeCSS(tableRows(text, "## Fills")?.rows.find(r => r[0] === roleName)?.[1]);
    if (value && /gradient\(/.test(value)) treatments.push(`  ${token}: ${value};`);
  }
  const brandLight = role("brand-light", 1) || accent;
  const uiAccent = role("ui-accent", 1) || accent;
  treatments.push(`  --brand-light: ${brandLight};`, `  --fx-accent: ${uiAccent};`);
  const h2Weight = Number(type.find(r => r[0] === "h2")?.[3]);
  if (h2Weight >= 100 && h2Weight <= 1000) treatments.push(`  --h2-weight: ${h2Weight};`);
  return [
    // the gate reads the taste's Kit overrides through this name
    `<meta name="taste" content="${name}">`,
    ...fontNote,
    ...(link ?
      [
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        `<link href="${link}" rel="stylesheet">`,
      ]
    : []),
    ...KIT_SHEETS.map(s => `<link rel="stylesheet" href="assets/${s}.css">`),
    "<!-- the taste's own tokens (ui → references/record.md, Apply): in place of start.mjs css or brand; keep this <style> after the links -->",
    "<style>",
    ":root {",
    ...(mutedNote ? [`  /* ${mutedNote} */`] : []),
    ...Object.entries(p).map(([k, v]) => `  --p-${k}: ${v};`),
    `  --font-display: ${face(display)};`,
    `  --font-text: ${face(textFace)};`,
    `  --font-mono: ${quoted(mono)}, ${free.has(mono) ? `"${free.get(mono)}", ` : ""}${MONO_TAIL};`,
    `  --display-weight: ${Number(h1?.[3]) || 500};`,
    `  --display-tracking: ${tracking};`,
    `  --display-tracking-xl: ${tracking};`,
    ...sizes,
    ...motionTokens,
    ...treatments,
    "}",
    // links and the focus ring on every ground: system.css reads these before the action colour
    ...(faintAction ?
      [
        `/* the primary's fill (${action}) reads ${ratioText(action, bg)} on ${bg}: it stays on the button, and links and the focus ring take each ground's ink */`,
        ":where(*) {",
        "  --link: var(--ink);",
        "  --focus: var(--ink);",
        "}",
      ]
    : []),
    ...(treatments.some(t => t.includes("--h2-fill:")) ?
      ["h2 { background: var(--h2-fill); background-clip: text; -webkit-background-clip: text; color: transparent; }"]
    : []),
    ...(btnShadow ? [`.btn--primary { box-shadow: ${btnShadow}; }`] : []),
    ...(h1Face !== display ? [`:root h1 { font-family: ${face(h1Face)}; }`] : []),
    "html[data-radius] {",
    `  --r-sm: ${sm}px;`,
    `  --r-md: ${md}px;`,
    `  --r-lg: ${lg}px;`,
    `  --r-btn: ${btn}px;`,
    "}",
    // the lit ground behind UI frames and the statement footer: the taste's own raised step, never the kit's
    // sand, sky or sage; !important outranks the accent hue system.js writes inline on <html>
    "html[data-ground] {",
    `  --ground-bg: ${surface} !important;`,
    `  --ground-surface: ${p["inv-surface"]} !important;`,
    `  --ground-ink: ${ink} !important;`,
    `  --ground-muted: ${muted} !important;`,
    `  --ground-accent: ${brandLight} !important;`,
    "}",
    "</style>",
    "",
  ].join("\n");
}

/* ---------------------------------------------------------------- the motion pass */
// Evaluated in the page: tags up to 12 controls with data-rec-hover and says what each is
const hoverPick = primaryBg => {
  const BUTTONS =
    'button,[role="button"], input[type="button"], input[type="submit"], a[class*="btn" i], a[class*="button" i]';
  const vw = document.documentElement.clientWidth || innerWidth;
  const hex = v => {
    const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);
    return m ? "#" + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, "0")).join("") : null;
  };
  const seg = el => {
    let i = 1;
    for (let p = el.previousElementSibling; p; p = p.previousElementSibling) if (p.tagName === el.tagName) i++;
    return `${el.tagName.toLowerCase()}:nth-of-type(${i})`;
  };
  const pathOf = el => {
    const chain = [];
    for (let p = el; p && p !== document.body && p !== document.documentElement; p = p.parentElement)
      chain.unshift(seg(p));
    const classes = [...el.classList].filter(c => /^[\w-]{1,40}$/.test(c)).slice(0, 6);
    return chain.slice(-8).join(" > ") + classes.map(c => `.${c}`).join("");
  };
  const out = [];
  const seen = new Set();
  const tagged = new Set();
  const add = (role, selector, max, test = (_el, _cs, _r) => true) => {
    let n = 0;
    let added = 0;
    for (const el of document.querySelectorAll(selector)) {
      if (++n > 300 || added >= max || out.length >= 12) break;
      if (tagged.has(el)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.display === "none" || cs.visibility !== "visible" || r.width < 28 || r.height < 20) continue;
      if (r.right <= 0 || r.left >= vw || !test(el, cs, r)) continue;
      const key = `${role}|${el.tagName}|${el.getAttribute("class") || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tagged.add(el);
      el.setAttribute("data-rec-hover", String(out.length));
      out.push({ i: out.length, role, target: pathOf(el) });
      added++;
    }
  };
  if (primaryBg) add("primary", BUTTONS, 1, (el, cs) => hex(cs.backgroundColor) === primaryBg);
  add("button", BUTTONS, 4);
  add("nav", "nav a, header a", 3);
  add("card", '[class*="card" i], article', 4, (el, cs, r) => r.width >= 120 && r.height >= 80 && r.height <= 900);
  return out;
};
// Evaluated in the page: the properties a hover can change, and how long its transition runs
const hoverRead = i => {
  const el = document.querySelector(`[data-rec-hover="${i}"]`);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const props = {};
  for (const p of [
    "color",
    "background-color",
    "border-color",
    "box-shadow",
    "transform",
    "opacity",
    "filter",
    "text-decoration-line",
    "outline-color",
  ])
    props[p] = cs.getPropertyValue(p) || (p === "border-color" ? cs.borderTopColor : "");
  const list = v => v.split(",").map(s => parseFloat(s) * (s.trim().endsWith("ms") ? 1 : 1000) || 0);
  const durations = list(cs.transitionDuration);
  const delays = list(cs.transitionDelay);
  const ms = Math.max(0, ...durations.map((d, k) => d + delays[k % delays.length]));
  const transition =
    ms > 0 ?
      [cs.transitionProperty, cs.transitionDuration, cs.transitionTimingFunction]
        .join(" ")
        .replace(/\s+/g, " ")
        .slice(0, 200)
    : "none";
  return { props, transition, ms };
};

// Runs once per URL, on the wide light view, after the styles capture. Everything in it is best effort: a step that
// fails adds a line to `problems` and the pass goes on, so the styles capture and the shots are always written.
// Returns { animations, keyframes, scroll, effects, hover, frames, problems } for the caller to merge into the capture;
// frames maps a section index to its frame paths under capture/frames.
async function motionPass(S, capture, dir, sheets) {
  const problems = [];
  const result = { animations: [], keyframes: [], scroll: [], effects: [], hover: [], frames: {} };
  const step = async (what, fn) => {
    try {
      return await fn();
    } catch (e) {
      problems.push(`${what}: ${e.message}`);
      return undefined;
    }
  };
  const base = path.join(dir, "capture");
  const page = slug(capture.path);
  const [vw, vh] = capture.viewport;
  let rects = [];
  const evaluate = async (expression, options = {}) => {
    const res = await S("Runtime.evaluate", { expression, returnByValue: true, ...options });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
    return res.result.value;
  };

  // 1. what moves, from the page itself
  await step("motion", async () => {
    const { sections, ...found } = (await evaluate(MOTION, { awaitPromise: true })) || {};
    Object.assign(result, found);
    rects = Array.isArray(sections) ? sections : [];
  });

  // 3. the raw capture: every stylesheet, an HTML snapshot, (the capture JSON is written last)
  await step("stylesheets", async () => {
    fs.mkdirSync(path.join(base, "css"), { recursive: true });
    const seen = new Set();
    // a second URL of the same record numbers its sheets after the first one's
    let n = fs.readdirSync(path.join(base, "css")).length;
    for (const h of sheets) {
      if (!h || h.origin !== "regular" || seen.has(h.styleSheetId)) continue;
      seen.add(h.styleSheetId);
      n++;
      await step(`stylesheet ${n}`, async () => {
        if (h.length > 2e6) throw new Error("over 2 MB, skipped");
        const { text } = await S("CSS.getStyleSheetText", { styleSheetId: h.styleSheetId });
        if (text.length > 2e6) throw new Error("over 2 MB, skipped");
        const from = (h.sourceURL || "inline").replace(/\*\//g, "* /");
        fs.writeFileSync(path.join(base, "css", `${String(n).padStart(3, "0")}.css`), `/* ${from} */\n${text}`);
      });
    }
  });
  await step("html snapshot", async () => {
    fs.mkdirSync(base, { recursive: true });
    const { root } = await S("DOM.getDocument", { depth: 0 });
    const { nodeId } = await S("DOM.querySelector", { nodeId: root.nodeId, selector: "html" });
    const { outerHTML } = await S("DOM.getOuterHTML", { nodeId });
    fs.writeFileSync(path.join(base, `${page}.html`), `<!doctype html>\n${outerHTML}\n`);
  });

  // 2. hover: force :hover on up to 12 controls, keep the computed properties that change
  const forced = [];
  await step("hover", async () => {
    const primary = capture.components?.primary?.bg;
    const picks = await evaluate(`(${hoverPick})(${JSON.stringify(HEX.test(primary || "") ? hex6(primary) : null)})`);
    const { root } = await S("DOM.getDocument", { depth: 0 });
    for (const pick of picks || []) {
      await step(`hover ${pick.role}`, async () => {
        const { nodeId } = await S("DOM.querySelector", {
          nodeId: root.nodeId,
          selector: `[data-rec-hover="${pick.i}"]`,
        });
        if (!nodeId) throw new Error("element not found");
        const before = await evaluate(`(${hoverRead})(${pick.i})`);
        forced.push(nodeId);
        await S("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["hover"] });
        await sleep(Math.min(1300, Math.max(60, (before?.ms ?? 0) + 80)));
        const after = await evaluate(`(${hoverRead})(${pick.i})`);
        await S("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
        const changes = {};
        for (const [p, v] of Object.entries(before?.props ?? {}))
          if (after?.props?.[p] !== undefined && after.props[p] !== v) changes[p] = [v, after.props[p]];
        if (Object.keys(changes).length)
          result.hover.push({ target: pick.target, role: pick.role, changes, transition: before.transition });
      });
    }
  });
  await step("hover cleanup", async () => {
    for (const nodeId of forced) await S("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] }).catch(() => {});
    await evaluate(`document.querySelectorAll("[data-rec-hover]").forEach(e => e.removeAttribute("data-rec-hover"))`);
  });

  // 4. frames: 8 JPEGs for each of up to 8 sections that hold an animation or a scroll entry
  await step("frames", async () => {
    const driven = new Set(result.scroll.map(s => s.section));
    const looped = new Set();
    const moved = new Set(result.animations.map(a => a.section));
    for (const a of result.animations) {
      if (a.timeline === "scroll") driven.add(a.section);
      else if (a.iterations === "infinite") looped.add(a.section);
    }
    const rank = i =>
      driven.has(i) ? 0
      : looped.has(i) ? 1
      : 2;
    const sections = [...new Set([...moved, ...driven])]
      .filter(i => Number.isInteger(i) && rects[i])
      .sort((a, b) => rank(a) - rank(b) || a - b)
      .slice(0, 8);
    const maxY = await evaluate("Math.max(0, document.documentElement.scrollHeight - innerHeight)");
    const toY = y => evaluate(`window.scrollTo({ top: ${Math.round(y)}, behavior: "instant" })`);
    for (const i of sections) {
      const r = rects[i];
      const files = [];
      // the scroll range of a driven section: from just before it enters to just before it leaves
      const lo = Math.min(maxY, Math.max(0, r.top - vh * 0.6));
      const hi = Math.min(maxY, Math.max(lo, r.top + r.height - vh * 0.4));
      const x = Math.max(0, Math.min(r.left, vw - 1));
      for (let n = 0; n < 8; n++) {
        await step(`frame ${i}-${n}`, async () => {
          let y = r.top;
          let height = Math.min(r.height, 1600);
          if (driven.has(i)) {
            // the part of the section in view at this scroll position
            const at = lo + ((hi - lo) * n) / 7;
            await toY(at);
            await sleep(250);
            y = Math.max(r.top, at);
            height = Math.min(r.top + r.height, at + vh) - y;
          } else if (n === 0) {
            await toY(Math.max(0, r.top - Math.max(0, vh - Math.min(r.height, vh)) / 2));
            await sleep(250);
          } else await sleep(250);
          if (height < 40) return;
          const shot = await S("Page.captureScreenshot", {
            format: "jpeg",
            quality: 60,
            captureBeyondViewport: true,
            clip: { x, y, width: Math.max(1, Math.min(r.width, vw - x)), height: Math.min(height, 1600), scale: 1 },
          });
          const file = `${page}/${i}-${n}.jpg`;
          fs.mkdirSync(path.join(base, "frames", page), { recursive: true });
          fs.writeFileSync(path.join(base, "frames", file), Buffer.from(shot.data, "base64"));
          files.push(file);
        });
      }
      if (files.length) result.frames[i] = files;
    }
    await toY(0);
    await sleep(250);
  });

  // the whole capture, with what the pass found and what it could not do
  await step("capture json", async () => {
    fs.mkdirSync(base, { recursive: true });
    const json = JSON.stringify({ ...capture, ...result, problems }, null, 1);
    fs.writeFileSync(path.join(base, `${page}.json`), json + "\n");
  });
  return { ...result, problems };
}

// Opens one page headless with a throwaway profile, 1440x900 then 390x844 in light, then both again in dark.
// Writes the full-page JPEGs into <dir>/shots and, on the wide light view, the motion pass and the raw capture into
// <dir>/capture; returns the four captures (each tagged with its scheme).
async function captureUrl(url, dir) {
  const shotsDir = path.join(dir, "shots");
  const chrome = chromeOrExit("record");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "record-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      `--user-data-dir=${profile}`,
      "--remote-debugging-port=0",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-gpu",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      `--window-size=${VIEWS[0][0]},${VIEWS[0][1]}`,
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  let spawnError = null;
  child.on("error", e => {
    spawnError = e;
  });
  const kill = () => {
    if (child.exitCode != null) return;
    try {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      try {
        child.kill();
      } catch {
        /* gone */
      }
    }
  };
  const wipe = () => fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  const guard = setTimeout(() => {
    console.error(`record: timed out on ${url}`);
    kill();
    try {
      wipe();
    } catch {
      /* leave it to the OS */
    }
    process.exit(1);
  }, 240000);
  const onSignal = () => process.exit(1);
  process.once("exit", kill);
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  const captures = [];
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    let port = null;
    for (let i = 0; i < 150 && !port; i++) {
      await sleep(100);
      if (spawnError) throw new Error(`could not start the browser: ${spawnError.message}`);
      if (child.exitCode != null) throw new Error(`the browser exited (code ${child.exitCode}) before it was ready`);
      try {
        port = parseInt(fs.readFileSync(portFile, "utf8"), 10) || null;
      } catch {
        /* not yet */
      }
    }
    if (!port) throw new Error("Chrome did not start");
    const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const ws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error("could not connect to the browser")), { once: true });
    });
    let id = 0;
    const pending = new Map();
    const subs = new Set();
    ws.addEventListener("message", e => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id).resolve(msg);
        pending.delete(msg.id);
      } else subs.forEach(f => f(msg));
    });
    ws.addEventListener("close", () => {
      for (const p of pending.values()) p.reject(new Error("the browser closed the connection"));
      pending.clear();
    });
    const send = (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const i = ++id;
        pending.set(i, { resolve, reject });
        ws.send(JSON.stringify({ id: i, method, params, sessionId }));
      });
    const {
      result: { targetId },
    } = await send("Target.createTarget", { url: "about:blank" });
    const {
      result: { sessionId },
    } = await send("Target.attachToTarget", { targetId, flatten: true });
    const S = async (method, params) => {
      const r = await send(method, params, sessionId);
      if (r.error) throw new Error(`${method}: ${r.error.message}`);
      return r.result;
    };
    const loaded = ms =>
      new Promise(resolve => {
        const timer = setTimeout(() => finish(false), ms);
        timer.unref();
        const onMessage = msg => {
          if (msg.method === "Page.loadEventFired" && msg.sessionId === sessionId) finish(true);
        };
        const finish = ok => {
          clearTimeout(timer);
          subs.delete(onMessage);
          resolve(ok);
        };
        subs.add(onMessage);
      });
    // lazy media loads on scroll: walk the page top to bottom, wait for the images, return to the top
    const settle = async scroll => {
      if (scroll) await S("Runtime.evaluate", { expression: SCROLL, awaitPromise: true });
      await S("Runtime.evaluate", { expression: IMAGES, awaitPromise: true });
      await sleep(400);
    };
    await S("Page.enable");
    // the stylesheets of the page, as the browser adds them (the motion pass reads their text); a failure here only
    // costs the capture/css files
    const sheets = [];
    subs.add(msg => {
      if (msg.method === "CSS.styleSheetAdded" && msg.sessionId === sessionId) sheets.push(msg.params.header);
    });
    for (const method of ["DOM.enable", "CSS.enable"]) await S(method).catch(() => {});

    for (const scheme of ["light", "dark"]) {
      await S("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
      for (const [w, h] of VIEWS) {
        await S("Emulation.setDeviceMetricsOverride", {
          width: w,
          height: h,
          deviceScaleFactor: 1,
          mobile: w < 600,
        });
        const done = loaded(30000);
        const nav = await S("Page.navigate", { url });
        if (nav.errorText) throw new Error(`${url}: ${nav.errorText}`);
        await done;
        await Promise.race([
          S("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true }),
          sleep(10000),
        ]);
        await sleep(600);
        await settle(true);
        const res = await S("Runtime.evaluate", { expression: CAPTURE, returnByValue: true });
        if (res.exceptionDetails) throw new Error(`capture failed: ${res.exceptionDetails.text}`);
        let capture = { ...res.result.value, scheme };
        // the motion pass and the raw capture run once, on the wide light view
        if (scheme === "light" && w === 1440) capture = { ...capture, ...(await motionPass(S, capture, dir, sheets)) };
        await settle(false);
        const metrics = await S("Page.getLayoutMetrics");
        const tall = Math.ceil(metrics.cssContentSize?.height ?? metrics.contentSize?.height ?? h);
        const shot = await S("Page.captureScreenshot", {
          format: "jpeg",
          quality: 80,
          captureBeyondViewport: true,
          clip: { x: 0, y: 0, width: w, height: Math.max(h, Math.min(tall, MAX_SHOT)), scale: 1 },
        });
        fs.mkdirSync(shotsDir, { recursive: true });
        fs.writeFileSync(
          path.join(shotsDir, `${slug(capture.path)}-${w}-${scheme}.jpg`),
          Buffer.from(shot.data, "base64"),
        );
        captures.push(capture);
      }
    }
    ws.close();
  } finally {
    clearTimeout(guard);
    process.off("exit", kill);
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    kill();
    await sleep(300);
    try {
      wipe();
    } catch {
      /* leave it to the OS */
    }
  }
  return captures;
}

/* ---------------------------------------------------------------- candidates */
// What the capture saw that the agent must settle in taste.json: one per (page, section, kind), in page, then
// section (none last), then kind order. Deterministic: the same captures give the same list and ids.
const CANDIDATE_KINDS = ["loop", "entrance", "scroll", "sticky", "hover", "effect"];
const isLoop = a => a.iterations === "infinite" || a.iterations === null || a.iterations === Infinity;
const calm = v => v === undefined || v === null || v === "" || v === "none" || v === "normal";
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// a candidate's id holds across records while the thing itself does: what was settled stays settled, a new or
// changed thing is unsettled again
const candidateId = (g, first, summary) =>
  "c"
  + crypto
    .createHash("sha1")
    .update(
      [g.cap.path, g.section, g.kind, g.key, typeof first.target === "string" ? first.target : "", summary].join("|"),
    )
    .digest("hex")
    .slice(0, 7);

function candidates(captures) {
  const pages = [];
  const groups = new Map();
  const add = (cap, section, kind, key, item) => {
    if (!pages.includes(cap.path)) pages.push(cap.path);
    const id = [cap.path, section, kind, key].join("|");
    const group = groups.get(id) || { cap, section, kind, key, items: [] };
    group.items.push(item);
    groups.set(id, group);
  };
  const sectionOf = v => (Number.isInteger(v) && v >= 0 ? v : null);
  for (const cap of captures) {
    for (const a of cap.animations.filter(x => x && typeof x === "object"))
      add(cap, sectionOf(a.section), isLoop(a) ? "loop" : "entrance", "", a);
    for (const s of cap.scroll.filter(x => x && typeof x === "object")) {
      const props = s.props && typeof s.props === "object" ? Object.keys(s.props) : [];
      if (props.length) add(cap, sectionOf(s.section), "scroll", "", s);
      if (Array.isArray(s.sticky)) add(cap, sectionOf(s.section), "sticky", "", s);
    }
    for (const h of cap.hover.filter(x => x && typeof x === "object")) add(cap, null, "hover", h.role || "element", h);
    for (const e of cap.effects.filter(x => x && typeof x === "object")) {
      const drawn = e.canvas || !calm(e.filter) || !calm(e.backdropFilter) || !calm(e.mask) || !calm(e.blend);
      if (drawn || /gradient\(/i.test(e.background || "")) add(cap, sectionOf(e.section), "effect", "", e);
    }
  }
  const order = g => [
    pages.indexOf(g.cap.path),
    g.section === null ? Infinity : g.section,
    CANDIDATE_KINDS.indexOf(g.kind),
  ];
  const sorted = [...groups.values()].sort((a, b) => {
    const [x, y] = [order(a), order(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return (
      a.key < b.key ? -1
      : a.key > b.key ? 1
      : 0
    );
  });
  return sorted.map((g, i) => {
    const { items } = g;
    const first = items[0];
    const unique = list => [...new Set(list.filter(Boolean))];
    const many = plural(items.length, "element");
    const summary =
      g.kind === "loop" || g.kind === "entrance" ?
        `${g.kind} · ${many} · ${Number.isFinite(first.duration) ? `${first.duration}ms` : "scroll-driven"} ${first.easing ?? "linear"}`
      : g.kind === "scroll" ? `scroll · ${many} · ${unique(items.flatMap(s => Object.keys(s.props))).join(", ")}`
      : g.kind === "sticky" ?
        `sticky · ${many} · ${Math.min(...items.map(s => s.sticky[0]))}px → ${Math.max(...items.map(s => s.sticky[1]))}px`
      : g.kind === "hover" ?
        `hover · ${g.key} · ${Object.keys(first.changes && typeof first.changes === "object" ? first.changes : {}).join(", ") || "no change"} · ${first.transition ?? "none"}`
      : `effect · ${many} · ${unique(
          items.flatMap(e => [
            e.canvas && `canvas ${e.canvas}`,
            !calm(e.filter) && "filter",
            !calm(e.backdropFilter) && "backdrop-filter",
            !calm(e.mask) && "mask",
            !calm(e.blend) && "blend",
            /gradient\(/i.test(e.background || "") && "gradient",
          ]),
        ).join(", ")}`;
    const frames = g.section === null ? [] : g.cap.frames?.[g.section];
    return {
      id: candidateId(g, first, summary),
      kind: g.kind,
      page: g.cap.path,
      section: g.section,
      target: typeof first.target === "string" ? first.target : "",
      summary,
      evidence: {
        frames: (Array.isArray(frames) ? frames : []).filter(f => typeof f === "string"),
        keyframes: g.kind === "loop" || g.kind === "entrance" ? unique(items.map(a => a.name)) : [],
        css: [],
      },
    };
  });
}

/* ---------------------------------------------------------------- commands */
// <root>/<name>/taste.json parsed, or null when it is missing or unreadable
function readManifest(root, name) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(root, name, "taste.json"), "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function saveEvidence(dir, bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 20);
  const relative = `capture/evidence/${hash}.json`;
  const absolute = path.join(dir, ...relative.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  if (!fs.existsSync(absolute)) fs.writeFileSync(absolute, buffer);
  return relative;
}

function draftTasteFromCapture(model, name, sources, sourceUrls) {
  const evidence = {};
  const clean = value =>
    typeof value === "string" && value.trim() && !/[;{}<>\r\n]/.test(value) ? value.trim() : null;
  const addBlockEvidence = (field, reason) => {
    if (sources.length) evidence[field] = { sources: [...new Set(sources)].sort(), reason };
  };
  const light = {};
  // Raw custom properties stay in immutable evidence; only measured semantic roles enter the draft.
  const roleNames = {
    bg: "--p-bg",
    surface: "--p-surface",
    ink: "--p-ink",
    muted: "--p-muted",
    accent: "--p-accent",
    accentInk: "--p-accent-ink",
    action: "--p-action",
    actionInk: "--p-action-ink",
  };
  for (const token of Object.values(roleNames)) light[token] ??= null;
  for (const [role, token] of Object.entries(roleNames)) {
    const value =
      role === "accentInk" || role === "action" || role === "actionInk" ? null : model.rolesObserved?.[role];
    if (value !== null && value !== undefined) light[token] = clean(value);
  }
  const primary = model.components.primary;
  if (primary) {
    if (typeof primary.bg === "string") light["--p-action"] = clean(primary.bg);
    if (typeof primary.color === "string") light["--p-action-ink"] = clean(primary.color);
  }
  addBlockEvidence("tokens.colors.light", "Captured custom properties and painted color roles from the rendered page.");

  let dark = null;
  if (model.rolesDarkObserved || model.tokens.some(token => token.dark)) {
    dark = {};
    for (const token of Object.values(roleNames)) dark[token] = null;
    for (const [role, token] of Object.entries(roleNames)) {
      const value = model.rolesDarkObserved?.[role];
      if (value !== null && value !== undefined) dark[token] = clean(value);
    }
    addBlockEvidence("tokens.colors.dark", "Captured dark-scheme custom properties and painted color roles.");
  }

  const typeRows = role =>
    model.type
      .filter(item => item.role === role)
      .sort((a, b) => Math.max(...(b.at || [0])) - Math.max(...(a.at || [0])) || Number(b.size) - Number(a.size));
  const typography = {};
  const typeNames = {
    h1: "--t-h1",
    h2: "--t-h2",
    h3: "--t-h3",
    body: "--t-body",
    small: "--t-small",
    button: "--t-label",
  };
  for (const token of Object.values(typeNames)) typography[token] = null;
  for (const role of ["h1", "h2", "h3", "body", "small", "button", "nav"]) {
    const rows = typeRows(role);
    const row = rows[0];
    if (!row) continue;
    let value = Number.isFinite(row.size) ? `${row.size}px` : null;
    const wide = Math.max(...(row.at || [0]));
    const narrow = rows
      .filter(item => item.family === row.family && Number.isFinite(item.size))
      .sort((a, b) => Math.min(...(a.at || [0])) - Math.min(...(b.at || [0])))[0];
    const small = narrow && Math.min(...(narrow.at || [0]));
    if (value && small > 0 && wide > small && narrow.size < row.size) {
      const slope = (row.size - narrow.size) / (wide - small);
      value = `clamp(${narrow.size}px, ${+(slope * 100).toFixed(3)}vw + ${+(narrow.size - slope * small).toFixed(2)}px, ${row.size}px)`;
    }
    if (typeNames[role] && value !== null) typography[typeNames[role]] = clean(value);
    if (role === "h1") {
      if (Number.isFinite(row.weight)) typography["--display-weight"] = String(row.weight);
      if (clean(String(row.tracking ?? ""))) typography["--display-tracking"] = String(row.tracking);
    }
    if (role === "h2" && Number.isFinite(row.weight)) typography["--h2-weight"] = String(row.weight);
  }
  addBlockEvidence("tokens.typography", "Captured computed typography from the widest recorded viewport.");

  const fontRow = role => {
    const row = typeRows(role)[0];
    return { family: clean(row?.family), sources: [], fallbacks: [] };
  };
  const fonts = { roles: { body: fontRow("body"), heading: fontRow("h2").family ? fontRow("h2") : fontRow("h1") } };
  for (const role of ["h1", "h2", "h3"]) if (typeRows(role).length) fonts.roles[role] = fontRow(role);
  for (const [role, face] of Object.entries(fonts.roles))
    if (face.family) addBlockEvidence(`fonts.roles.${role}`, "Captured computed font-family from rendered text.");

  const surfaces = {};
  const page = {};
  if (model.rolesObserved?.bg) page["background-color"] = clean(model.rolesObserved.bg);
  if (model.rolesObserved?.ink) page.color = clean(model.rolesObserved.ink);
  if (Object.keys(page).length) surfaces.page = page;
  if (model.rolesObserved?.surface) surfaces.panel = { "background-color": clean(model.rolesObserved.surface) };
  const capturedSurface = component => {
    const result = {};
    for (const [source, property] of [
      ["bg", "background"],
      ["color", "color"],
      ["border", "border"],
      ["shadow", "box-shadow"],
    ]) {
      const raw = clean(component?.[source]);
      const value = source === "border" ? normalizeBorder(raw) : raw;
      if (value) result[property] = value;
    }
    if (Number.isFinite(component?.radius)) result["border-radius"] = `${component.radius}px`;
    return result;
  };
  const card = model.components.card?.[0];
  if (card) surfaces.panel = capturedSurface(card);
  if (primary) surfaces.primary = capturedSurface(primary);
  for (const [role, surface] of [
    ["surface", "panel"],
    ["primary", "primary"],
    ["h2", "h2"],
  ]) {
    const gradient =
      role === "h2" ?
        Array.isArray(model.fills?.text) ?
          model.fills.text.find(entry => entry?.role === "h2")?.gradient?.css
        : null
      : model.fills?.[role]?.css;
    if (clean(gradient)) {
      surfaces[surface] ||= {};
      surfaces[surface].background = clean(gradient);
      if (role === "h2")
        Object.assign(surfaces[surface], {
          "background-clip": "text",
          "-webkit-background-clip": "text",
          color: "transparent",
        });
    }
  }
  addBlockEvidence("tokens.surfaces", "Captured painted surfaces, controls, gradients and shadows.");

  const dimensions = {};
  dimensions["--container"] = null;
  dimensions["--gut"] = null;
  dimensions["--nav"] = null;
  const layout = [...model.layouts].sort((a, b) => Number(b.vw) - Number(a.vw))[0] || {};
  for (const [source, token] of [
    ["container", "--container"],
    ["gutter", "--gut"],
    ["header", "--nav"],
  ])
    if (Number.isFinite(layout[source])) dimensions[token] = `${layout[source]}px`;
  if (Number.isFinite(primary?.h)) dimensions["--btn-h"] = `${primary.h}px`;
  addBlockEvidence(
    "tokens.dimensions",
    "Captured computed layout dimensions and control height from the widest recorded viewport.",
  );

  return {
    schemaVersion: 2,
    name,
    source: sourceUrls,
    captured: model.date,
    use_when: [],
    fits: {},
    variants: {},
    signature: [],
    settled: {},
    tokens: { colors: { light, dark }, typography, surfaces, dimensions },
    fonts,
    guidance: { character: null, usage: [], composition: [], adaptations: [] },
    evidence,
  };
}

function list(root) {
  const rows = [];
  for (const entry of fs.existsSync(root) ? fs.readdirSync(root).sort() : []) {
    const file = path.join(root, entry, "design-system.txt");
    if (!NAME.test(entry)) continue;
    let text = "";
    let definition = null;
    try {
      const pack = loadTastePack(path.join(root, entry));
      if (pack.version === 2) definition = pack.definition;
    } catch {
      if (fs.existsSync(path.join(root, entry, "taste.json"))) continue;
    }
    if (!definition && !fs.existsSync(file)) continue;
    if (!definition) text = fs.readFileSync(file, "utf8");
    const date = definition?.captured ?? /captured on (\S+)/.exec(text)?.[1] ?? "unknown";
    const after = text.split("\n").slice(text.split("\n").findIndex(l => l.startsWith("# ")) + 1);
    const use = definition?.use_when ?? readManifest(root, entry)?.use_when;
    const uses = Array.isArray(use) ? use.filter(u => typeof u === "string" && u.trim()) : [];
    const intro =
      definition ? definition.guidance?.character || "v2 taste definition" : (after.find(l => l.trim()) ?? "").trim();
    rows.push([entry, date, intro + (uses.length ? ` · use: ${uses.join(", ")}` : "")]);
  }
  const width = Math.max(0, ...rows.map(r => r[0].length));
  for (const [n, d, intro] of rows) console.log(`${n.padEnd(width)}  ${d}  ${intro}`);
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const root = path.resolve(o.root ?? path.join(here, "..", "tastes"));
  const [cmd] = o._;

  if (cmd === "list" && !o.from.length) {
    if (o._.length > 1) fail("list takes no arguments");
    list(root);
    return;
  }

  if (cmd === "kit" && !o.from.length) {
    if (o._.length !== 2) fail("kit needs one taste name");
    const name = checkName(o._[1]);
    const packDir = path.join(root, name);
    const manifest = path.join(packDir, "taste.json");
    if (fs.existsSync(manifest)) {
      const pack = loadTastePack(packDir);
      if (pack.version === 2) {
        process.stdout.write(serializeTasteKit(pack.definition, { packDir: pack.dir }));
        return;
      }
    }
    const file = path.join(packDir, "design-system.txt");
    if (!fs.existsSync(file)) fail(`unknown taste: ${o._[1]}`);
    process.stdout.write(
      await kit(fs.readFileSync(file, "utf8"), checkName(o._[1]), readManifest(root, o._[1]), path.dirname(file)),
    );
    return;
  }

  if (cmd === "css" && !o.from.length) {
    if (o._.length !== 2) fail("css needs one taste name");
    const name = checkName(o._[1]);
    const packDir = path.join(root, name);
    const manifest = path.join(packDir, "taste.json");
    if (fs.existsSync(manifest)) {
      const pack = loadTastePack(packDir);
      if (pack.version === 2) {
        const text = serializeTasteCss(pack.definition, { packDir: pack.dir });
        if (o.out) {
          fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
          fs.writeFileSync(o.out, text);
          console.log(path.resolve(o.out));
        } else process.stdout.write(text);
        return;
      }
    }
    const file = path.join(packDir, "design-system.txt");
    if (!fs.existsSync(file)) fail(`unknown taste: ${o._[1]}`);
    const text = css(correctedText(fs.readFileSync(file, "utf8"), path.dirname(file)));
    if (o.out) {
      fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
      fs.writeFileSync(o.out, text);
      console.log(path.resolve(o.out));
    } else process.stdout.write(text);
    return;
  }

  if (cmd === "guide" && !o.from.length) {
    if (o._.length !== 2) fail("guide needs one taste name");
    if (o.out) fail("guide does not take --out");
    const name = checkName(o._[1]);
    const packDir = path.join(root, name);
    const pack = loadTastePack(packDir);
    if (pack.version !== 2) fail(`guide requires a schemaVersion 2 taste pack: ${name}`);
    const file = path.join(packDir, "design-system.txt");
    fs.writeFileSync(file, renderTasteGuide(pack.definition, { packDir: pack.dir }));
    console.log(`wrote ${file}`);
    return;
  }

  if (o.from.length && o._.length) fail("give URLs or --from files, not both");
  if (!o.from.length && !o._.length)
    fail("usage: record.mjs <url>... | --from <capture.json>... --name <name> | list | css <name>");
  if (o.from.length && !o.name) fail("--from needs --name");
  const urls = o._.map(u => httpUrl(u).href);
  const name = checkName(o.name ?? nameOf(urls[0]));
  const dir = path.join(root, name);
  const file = path.join(dir, "design-system.txt");
  if (name === "house") fail("house is the taste kit's extras pack, not a taste: pick another name");
  if (o.keepDoc && (o.from.length || !fs.existsSync(file)))
    fail("--keep-doc captures a saved taste again from its URLs and keeps its design-system.txt");
  if (fs.existsSync(file) && !o.force && !o.keepDoc)
    fail(`${name} already exists; --keep-doc captures it again and keeps its file, --force replaces the file`);

  const manifest = path.join(dir, "taste.json");
  const existingPack = fs.existsSync(manifest) ? loadTastePack(dir) : null;
  const createDraft = existingPack === null;
  let captures = [];
  const evidenceSources = [];
  if (o.from.length) {
    for (const f of o.from) {
      let json = null;
      let raw;
      try {
        raw = fs.readFileSync(f);
        json = JSON.parse(raw.toString("utf8"));
      } catch (e) {
        fail(`cannot read ${f}: ${e.message}`);
      }
      evidenceSources.push(saveEvidence(dir, raw));
      captures.push(norm(json));
    }
  } else {
    chromeOrExit("record"); // no browser: stop before the old shots and capture are removed
    fs.rmSync(path.join(dir, "shots"), { recursive: true, force: true });
    const captureRoot = path.join(dir, "capture");
    for (const entry of fs.existsSync(captureRoot) ? fs.readdirSync(captureRoot) : [])
      if (entry !== "evidence") fs.rmSync(path.join(captureRoot, entry), { recursive: true, force: true });
    for (const url of urls) {
      const rawCaptures = await captureUrl(url, dir);
      for (const raw of rawCaptures) {
        raw.source = url;
        const bytes = Buffer.from(JSON.stringify(raw, null, 1) + "\n");
        evidenceSources.push(saveEvidence(dir, bytes));
        captures.push(norm(raw));
      }
    }
  }

  fs.mkdirSync(dir, { recursive: true });
  const model = merge(captures);
  const sourceUrls = [...new Set([...urls, ...captures.map(c => c.source).filter(Boolean)])];
  const draft = createDraft ? draftTasteFromCapture(model, name, evidenceSources, sourceUrls) : null;
  // The manifest is reviewed work and stays byte-for-byte unchanged on recapture.
  if (draft) fs.writeFileSync(manifest, JSON.stringify(draft, null, 1) + "\n");
  // --keep-doc preserves the guide; v2 guides are regenerated only from their authoritative JSON definition.
  const text =
    o.keepDoc ? fs.readFileSync(file, "utf8")
    : draft ? renderTasteGuide(draft, { packDir: dir })
    : existingPack?.version === 2 ? renderTasteGuide(existingPack.definition, { packDir: dir })
    : render(model, name);
  if (!o.keepDoc) fs.writeFileSync(file, text);
  console.log(`${o.keepDoc ? "kept" : "wrote"} ${file}`);
  if (!o.from.length) {
    console.log(`shots in ${path.join(dir, "shots")}`);
    console.log(`capture in ${path.join(dir, "capture")}`);
    for (const c of captures) for (const p of c.problems) console.error(`record: motion pass, ${c.path}: ${p}`);
  }
  console.log(`${(text.match(/<!-- write:/g) || []).length} slots to write`);

  // the pack's manifest and the list of things seen that the agent must settle (references/record.md, Extract)
  const cands = candidates(captures);
  if (!o.from.length) {
    fs.mkdirSync(path.join(dir, "capture"), { recursive: true });
    // each candidate names the captured stylesheets that hold its keyframes
    const cssDir = path.join(dir, "capture", "css");
    const sheets = (fs.existsSync(cssDir) ? fs.readdirSync(cssDir).sort() : []).map(f => [
      f,
      fs.readFileSync(path.join(cssDir, f), "utf8"),
    ]);
    for (const c of cands)
      c.evidence.css = sheets
        .filter(([, css]) => c.evidence.keyframes.some(k => css.includes("@keyframes " + k)))
        .map(([f]) => "css/" + f);
    fs.writeFileSync(path.join(dir, "capture", "candidates.json"), JSON.stringify(cands, null, 1) + "\n");
  }
  // an existing manifest is the agent's work: never overwritten, with or without --force
  console.log(`${cands.length} candidates to settle in ${manifest}`);
  // ask Google Fonts now which of the taste's faces it serves; fonts.json keeps the answers for `kit`. Only when kit can
  // read the file: its one fail() (no Colors table, e.g. a kept file with CRLF endings) exits the process, which would
  // turn a finished record run into exit 2
  if ((existingPack?.version === 1 || (draft === null && !existingPack)) && tableRows(text, "## Colors"))
    await kit(text, name, readManifest(root, name), dir).catch(() => {});
}

try {
  await main();
} catch (e) {
  console.error("record:", e.message);
  process.exitCode = 1;
}
