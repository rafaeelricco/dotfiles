import { resolveTaste } from "./taste-definition.mjs";

const quote = value =>
  String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\a ")
    .replaceAll("\r", "\\d ")
    .replaceAll("<", "\\3c ")
    .replaceAll(">", "\\3e ");
const cssFace = value =>
  (
    /^(?:system-ui|sans-serif|serif|monospace|ui-sans-serif|ui-serif|ui-monospace|cursive|fantasy|emoji|math|inherit|initial)$/i.test(
      value,
    )
  ) ?
    value
  : `"${quote(value)}"`;
const kebab = value => value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const surfaceVar = (surface, property) => `--surface-${surface}-${kebab(property)}`;
const sorted = object => Object.entries(object || {}).sort(([a], [b]) => a.localeCompare(b, "en"));
const html = value =>
  String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const valueText = value => (value === null || value === undefined ? "Not recorded" : String(value));
const md = value => valueText(value).replaceAll("|", "\\|").replaceAll("\n", " ");

function tokenPairs(definition, mode) {
  const pairs = [];
  for (const [name, value] of sorted(definition.tokens.colors[mode])) if (value !== null) pairs.push([name, value]);
  if (mode === "light") {
    for (const [name, value] of sorted(definition.tokens.typography)) if (value !== null) pairs.push([name, value]);
    const recorded = { ...definition.tokens.typography, ...definition.tokens.dimensions };
    if (recorded["--t-h1"])
      for (const suffix of ["", "-xl", "-col", "-mega", "-word", "-quiet", "-side"])
        if (!recorded[`--ly-h1${suffix}`]) pairs.push([`--ly-h1${suffix}`, "var(--t-h1)"]);
    for (const [name, face] of sorted(definition.fonts.roles)) {
      if (face.family !== null) {
        const fallback = face.fallbacks.map(cssFace).join(", ");
        const stack = [cssFace(face.family), fallback].filter(Boolean).join(", ");
        pairs.push([`--font-${name}`, stack]);
        if (name === "body") pairs.push(["--font-text", stack]);
        if (name === "heading") pairs.push(["--font-display", stack]);
      }
    }
    for (const [name, surface] of sorted(definition.tokens.surfaces))
      for (const [property, value] of sorted(surface))
        if (value !== null) pairs.push([surfaceVar(name, property), value]);
    for (const [name, value] of sorted(definition.tokens.dimensions)) if (value !== null) pairs.push([name, value]);
  }
  return pairs.sort(([a], [b]) => a.localeCompare(b, "en"));
}

/** Serialize authoritative v2 values as CSS. No document or font cache is consulted. */
export function serializeTasteCss(definition, { packDir = null } = {}) {
  const taste = resolveTaste(definition, { purpose: "css", packDir });
  const block = (selector, scheme, pairs) =>
    [`${selector} {`, `  color-scheme: ${scheme};`, ...pairs.map(([name, value]) => `  ${name}: ${value};`), "}"].join(
      "\n",
    );
  const light = tokenPairs(taste, "light");
  const dark = taste.tokens.colors.dark === null ? [] : tokenPairs(taste, "dark");
  const surfaceRules = sorted(taste.tokens.surfaces).map(([name, properties]) => {
    const alias = { primary: ".btn--primary", card: ".panel", panel: ".panel", h2: "h2" }[name];
    const selectors = [`[data-surface="${name}"]`, ...(alias ? [alias] : [])];
    return `${selectors.join(", ")} {\n${sorted(properties)
      .filter(([, value]) => value !== null)
      .map(([property, value]) => `  ${kebab(property)}: ${value};`)
      .join("\n")}\n}`;
  });
  const roleRules = ["h1", "h2", "h3"]
    .filter(role => taste.fonts.roles[role]?.family)
    .map(role => `:root ${role} { font-family: var(--font-${role}); }`);
  return [
    fontCss(taste),
    block(":root", "light", light),
    ...(taste.tokens.colors.dark === null ? [] : [block('.dark, [data-theme="dark"]', "dark", dark)]),
    ...surfaceRules,
    ...roleRules,
    "",
  ]
    .filter((value, index, all) => value || index === all.length - 1)
    .join("\n\n");
}

function fontCss(definition) {
  const imports = new Set();
  const faces = new Set();
  for (const [, face] of sorted(definition.fonts.roles)) {
    if (!face.family) continue;
    for (const source of face.sources) {
      if (/\.css(?:$|\?)/i.test(source) || /^https:\/\/fonts\.googleapis\.com\/css2(?:\?|$)/i.test(source)) {
        imports.add(`@import url("${quote(source)}");`);
      } else {
        const extension = /\.(woff2?|ttf|otf)(?:$|\?)/i.exec(source)?.[1]?.toLowerCase();
        const format = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" }[extension];
        faces.add(
          `@font-face { font-family: "${quote(face.family)}"; src: url("${quote(source)}")${format ? ` format("${format}")` : ""}; font-display: swap; }`,
        );
      }
    }
  }
  return [...imports]
    .sort()
    .concat([...faces].sort())
    .join("\n");
}

/** Produce a head snippet from the same resolved values as serializeTasteCss. */
export function serializeTasteKit(definition, { packDir = null } = {}) {
  const taste = resolveTaste(definition, { purpose: "kit", packDir });
  const sheets = ["system", "ui/cards", "motion/motion", "backgrounds/backgrounds", "layout/layout", "icons/icon"];
  return [
    `<!-- generated from schemaVersion ${taste.schemaVersion} taste.json -->`,
    `<meta name="taste" content="${html(taste.name)}">`,
    ...sheets.map(sheet => `<link rel="stylesheet" href="assets/${sheet}.css">`),
    "<style>",
    serializeTasteCss(taste, { packDir }).trimEnd(),
    "</style>",
    "",
  ].join("\n");
}

/** Generate the human-readable guide, including unresolved draft values. */
export function renderTasteGuide(definition, { packDir = null } = {}) {
  const taste = resolveTaste(definition, { purpose: "guide", packDir });
  const rows = (entries, project = ([key, value]) => [key, value]) =>
    entries.map(entry => `| ${project(entry).map(md).join(" | ")} |`);
  const table = (headers, body) =>
    [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...body].join("\n");
  const colors = [
    "## Colors",
    table(
      ["Mode", "Token", "Value"],
      [
        ...sorted(taste.tokens.colors.light).map(([key, value]) => ["Light", key, valueText(value)]),
        ...(taste.tokens.colors.dark === null ?
          [["Dark", "*", "Not recorded"]]
        : sorted(taste.tokens.colors.dark).map(([key, value]) => ["Dark", key, valueText(value)])),
      ].map(row => `| ${row.map(md).join(" | ")} |`),
    ),
  ];
  const typography = [
    "## Typography and fonts",
    table(
      ["Role or token", "Family/value", "Sources", "Fallbacks"],
      [
        ...sorted(taste.fonts.roles).map(([role, face]) => [
          role,
          valueText(face.family),
          face.sources.join(", ") || "None recorded",
          face.fallbacks.join(", ") || "None recorded",
        ]),
        ...sorted(taste.tokens.typography).map(([key, value]) => [key, valueText(value), "", ""]),
      ].map(row => `| ${row.map(md).join(" | ")} |`),
    ),
  ];
  const surfaceRows = sorted(taste.tokens.surfaces).flatMap(([surface, properties]) =>
    sorted(properties).map(([key, value]) => [surface, key, valueText(value)]),
  );
  const dimensions = [
    "## Surfaces and dimensions",
    table(
      ["Surface", "Property", "Value"],
      surfaceRows.map(row => `| ${row.map(md).join(" | ")} |`),
    ),
    table(["Dimension token", "Value"], rows(sorted(taste.tokens.dimensions))),
  ];
  const guidance = [
    "## Guidance",
    `**Character:** ${md(taste.guidance.character)}`,
    "### Usage",
    ...(taste.guidance.usage.length ? taste.guidance.usage.map(item => `- ${item}`) : ["- Not recorded"]),
    "### Composition",
    ...(taste.guidance.composition.length ? taste.guidance.composition.map(item => `- ${item}`) : ["- Not recorded"]),
    "### Adaptations",
    ...(taste.guidance.adaptations.length ? taste.guidance.adaptations.map(item => `- ${item}`) : ["- None recorded"]),
  ];
  const evidence = [
    "## Evidence",
    table(
      ["Field path", "Sources", "Reason"],
      sorted(taste.evidence)
        .map(([field, value]) => [field, value.sources.join(", "), value.reason])
        .map(row => `| ${row.map(md).join(" | ")} |`),
    ),
  ];
  return [
    `# ${taste.name} design system`,
    "Generated from `taste.json`. Edit the definition, then run `record.mjs guide <name>` to refresh this guide.",
    ...colors,
    ...typography,
    ...dimensions,
    ...guidance,
    "## Build choices",
    "```json\n"
      + JSON.stringify(
        {
          use_when: taste.use_when,
          heroes: taste.heroes,
          layout: taste.layout,
          motion: taste.motion,
          fits: taste.fits,
          variants: taste.variants,
          signature: taste.signature,
          settled: taste.settled,
        },
        null,
        2,
      )
      + "\n```",
    ...evidence,
    "",
  ].join("\n\n");
}
